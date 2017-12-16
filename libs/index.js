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
        this.debug = false // if true, will return full path of the key (same as errors)

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
                    const parsed = JSON.parse(body)

                    this.exec(parsed[0], parsed[1], (error, result) => {
                        res.end(JSON.stringify([error, result]))
                    }, false)
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

    exec(command, args, callback, firstCall = true) {
        command = command.toLowerCase()

        if (typeof this[command] !== "undefined") {
            this[command](args, callback)
        } else {
            if (Array.isArray(args[0])) {
                throw new Error(`Command ${command} is currently not supported with multi keys.`)
            }

            this._scatter(command, args, this.writePolicy, (errors, results) => {
                if (firstCall) {
                    errors = Helper.flatten(errors)

                    if (Object.keys(errors).length === 0) {
                        errors = null
                    }

                    results = Helper.flatten(results)

                    let preparedResults = {}

                    if (!this.debug) {
                        for (let path in results) {
                            preparedResults[path.split(".")[0]] = results[path]
                        }
                    } else {
                        preparedResults = results
                    }

                    return callback(errors, preparedResults)
                } else {
                    return callback(errors, results)
                }
            })
        }
    }

    _scatter(command, args, writePolicy, callback) {
        const keys = Array.isArray(args[0]) ? args[0] : [args[0]]

        const isRead = this._readCommands[command] || false

        const errors = {}
        const results = {}
        let x = keys.length

        for (let i = 0; i < keys.length; i++) {
            args[0] = keys[i]

            results[keys[i]] = {}

            const clients = Helper.getClients(this._clients, keys[i], this.replication)

            if (isRead) {
                this._send(clients, 0, isRead, command, args, (error, result, clientId) => {
                    if (error) {
                        if (typeof errors[keys[i]] === "undefined") {
                            errors[keys[i]] = {}
                        }

                        errors[keys[i]][clients[clientId][0]] = error
                    }

                    results[keys[i]][clients[clientId][0]] = result

                    if (--x === 0) {
                        return callback(errors, results)
                    }
                })
            } else {
                if (writePolicy === 0) {
                    for (let j = 0; j < clients.length; j++) {
                        this._send(clients, j, isRead, command, args)
                    }
                } else {
                    let y = writePolicy

                    for (let j = 0; j < clients.length; j++) {
                        this._send(clients, j, isRead, command, args, (error, result, clientId) => {
                            if (error) {
                                if (typeof errors[keys[i]] === "undefined") {
                                    errors[keys[i]] = {}
                                }

                                errors[keys[i]][clients[clientId][0]] = error
                            }

                            results[keys[i]][clients[clientId][0]] = result

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
                        return callback(error, result, clientId)
                    }
                } else if (callback) {
                    return callback(error, result, clientId)
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
                    const parsed = JSON.parse(body)

                    if (isRead) {
                        const nextClientId = clientId + 1

                        const error = Helper.flatten(parsed[0])

                        let errorFound = false

                        for (let path in error) {
                            if (error.hasOwnProperty(path)) {
                                if (error[path]) {
                                    errorFound = true
                                }
                            }
                        }

                        if (errorFound && nextClientId < this.replication) {
                            this._send(clients, nextClientId, isRead, command, args, callback)
                        } else {
                            return callback(parsed[0], parsed[1], clientId)
                        }
                    } else if (callback) {
                        return callback(parsed[0], parsed[1], clientId)
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
                        return callback(error, null, clientId)
                    }
                } else if (callback) {
                    return callback(error, null, clientId)
                }
            })

            req.end(postData)
        }
    }
}

module.exports = ARed