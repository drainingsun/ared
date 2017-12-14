"use strict"

const http = require("http")

const redis = require("redis")

const Commands = require("./commands")

class ARed extends Commands {
    constructor() {
        super()

        this.replication = 1 // 1 - no replication, 2..n - replication factor
        this.writePolicy = 1 // 0 - don't wait at all, 1..n - wait for x replications

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

                    client.on("error", (error) => {
                        this.redisErrors[id] = error
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

                    this.exec(result[0], result[1], (error, result) => {
                        res.end(JSON.stringify([error, result]))
                    })
                })
            })

            this._server.on("error", (error) => {
                throw error
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
        command = command.toLowerCase()

        if (typeof this[command] !== "undefined") {
            this[command](args, callback)
        } else {
            if (Array.isArray(args[0])) {
                throw new Error(`Command ${command} is currently not supported with multi keys.`)
            }

            this._scatter(command, args, this.writePolicy, (errors, results) => {
                return callback(errors, results)
            })
        }
    }

    _send(clients, clientId, isRead, command, args, callback) {
        const client = this._clients[clients[clientId][0]]

        if (client.constructor.name === "RedisClient") {
            client.send_command(command, args, (error, result) => {
                if (error) {
                    error = JSON.stringify(error)
                }

                if (isRead) {
                    const nextClientId = clientId + 1

                    if (error && nextClientId < this.replication) {
                        this._send(clients, nextClientId, isRead, command, args, callback)
                    } else {
                        return callback(error, result)
                    }
                } else if (callback) {
                    return callback(error, result)
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

            req.on("error", (error) => {
                if (error) {
                    error = JSON.stringify(error)
                }

                if (isRead) {
                    const nextClientId = clientId + 1

                    if (error && nextClientId < this.replication) {
                        this._send(clients, nextClientId, isRead, command, args, callback)
                    } else {
                        return callback(error, null)
                    }
                } else if (callback) {
                    return callback(error, null)
                }
            })

            req.end(postData)
        }
    }
}

module.exports = ARed