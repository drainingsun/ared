"use strict"

const http = require("http")

const redis = require("redis")

const Commands = require("./commands")
const Helper = require("./helper")

class ARed extends Commands {
    constructor() {
        super()

        this.replication = 1 // 1 - no replication, 2..n - replication factor
        this.writePolicy = 1 // 0 - don't wait at all, 1..n - wait for x replications

        this._readCommands = {
            get: true,
            mget: true,
            hgetall: true,
            pfcount: true,
            smembers: true
        }

        this._agent = new http.Agent({keepAlive: true})

        this._server = null
        this._clients = {}

        this.redisErrors = {}
    }

    listen(serverOptions, redisOptions, forwardingOptions, callback) {
        if (!serverOptions && !redisOptions && !forwardingOptions) {
            throw new Error("You need to supply at least serverOptions, redisOptions or forwardingOptions.")
        }

        let async = 0

        if (forwardingOptions) {
            async += Object.keys(forwardingOptions).length

            for (let id in forwardingOptions) {
                if (forwardingOptions.hasOwnProperty(id)) {
                    this._clients[id] = forwardingOptions[id]

                    if (--async === 0) {
                        if (callback) {
                            return callback()
                        }
                    }
                }
            }
        }

        if (redisOptions) {
            async += Object.keys(redisOptions).length

            for (let id in redisOptions) {
                if (redisOptions.hasOwnProperty(id)) {
                    const client = redis.createClient(redisOptions[id])

                    client.on("error", (err) => {
                        this.redisErrors[id] = err
                    })

                    client.on("ready", () => {
                        delete this.redisErrors[id]

                        if (--async === 0) {
                            if (callback) {
                                return callback()
                            }
                        }
                    })

                    this._clients[id] = client
                }
            }
        }

        if (serverOptions) {
            async++

            this._server = http.createServer((req, res) => {
                let body = ""

                req.on("data", (data) => {
                    body += data
                })

                req.on("end", () => {
                    const result = JSON.parse(body)

                    this.exec(result[0], result[1], (err, result) => {
                        res.end(JSON.stringify([err, result]))
                    })
                })
            })

            this._server.on("error", (err) => {
                throw err
            })

            this._server.listen(serverOptions, () => {
                if (--async === 0) {
                    if (callback) {
                        return callback()
                    }
                }
            })
        }
    }

    exec(command, args, callback) {
        if (typeof this[command] !== "undefined") {
            this[command](args, callback)
        } else {
            const isRead = this._readCommands[command] || false

            const clients = Helper.getClients(this._clients, args[0], this.replication)

            const errors = {}
            const results = {}
            let x = Object.keys(clients).length

            for (let key in clients) {
                args[0] = key // We change the key since we already know where to direct command.

                if (isRead) {
                    this._send(clients[key], 0, isRead, command, args, (err, result) => {
                        errors[key] = err
                        results[key] = result

                        if (--x === 0) {
                            return callback(errors, results)
                        }
                    })
                } else {
                    if (this.writePolicy === 0) {
                        for (let i = 0; i < clients[key].length; i++) {
                            this._send(clients[key], i, isRead, command, args)
                        }
                    } else {
                        let y = this.writePolicy

                        errors[key] = {}
                        results[key] = {}

                        for (let i = 0; i < clients[key].length; i++) {
                            this._send(clients[key], i, isRead, command, args, (err, result) => {
                                errors[key][clients[key][i][0]] = err
                                results[key][clients[key][i][0]] = result

                                if (--y === 0) {
                                    if (--x === 0) {
                                        return callback(errors, results)
                                    }
                                }
                            })
                        }
                    }
                }
            }
        }
    }

    _send(clients, clientId, isRead, command, args, callback) {
        const client = this._clients[clients[clientId][0]]

        if (client.constructor.name === "RedisClient") {
            client.send_command(command, args, (err, result) => {
                if (err) {
                    err = JSON.stringify(err)
                }

                if (isRead) {
                    const nextClientId = clientId + 1

                    if (err && nextClientId < this.replication) {
                        this._send(clients, nextClientId, isRead, command, args, callback)
                    } else {
                        return callback(err, result)
                    }
                } else if (callback) {
                    return callback(err, result)
                }
            })
        } else {
            const postData = JSON.stringify([command, args])

            const options = {
                host: client.host,
                port: client.port,
                method: "POST",
                agent: this._agent,
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(postData)
                }
            }

            const req = http.request(options, (res) => {
                let body = ""

                res.setEncoding("utf8")

                res.on("data", (chunk) => {
                    body += chunk
                })

                res.on("end", () => {
                    const result = JSON.parse(body)

                    if (isRead) {
                        const nextClientId = clientId + 1

                        if (result[0][args[0]] && nextClientId < this.replication) {
                            this._send(clients, nextClientId, isRead, command, args, callback)
                        } else {
                            return callback(result[0], result[1])
                        }
                    } else if (callback) {
                        return callback(result[0], result[1])
                    }
                })
            })

            req.on("error", (err) => {
                if (err) {
                    err = JSON.stringify(err)
                }

                if (isRead) {
                    const nextClientId = clientId + 1

                    if (err && nextClientId < this.replication) { // This needs checking if error a downed node
                        this._send(clients, nextClientId, isRead, command, args, callback)
                    } else {
                        return callback(err, null)
                    }
                } else if (callback) {
                    return callback(err, null)
                }
            })

            req.end(postData)
        }
    }
}

module.exports = ARed