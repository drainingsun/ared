"use strict"

const Helper = require("./helper")

class Commands {
    constructor() {
        this.prefix = "ared"

        this._readCommands = {
            bitcount: true,
            bitpos: true,
            get: true,
            mget: true,
            getbit: true,
            getrange: true,
            strlen: true,
            zcard: true,
            zcount: true,
            zlexcount: true,
            zrange: true,
            zrangebylex: true,
            zrevrangebylex: true,
            zrangebyscore: true,
            zrank: true,
            zrevrange: true,
            zrevrangebyscore: true,
            zrevrank: true,
            zscore: true,
            zscan: true,
            scard: true,
            smembers: true,
            srandmember: true,
            lindex: true,
            llen: true,
            lrange: true,
            dump: true,
            exists: true,
            keys: true,
            pfcount: true,
            hexists: true,
            hget: true,
            hgetall: true,
            hkeys: true,
            hlen: true,
            hstrlen: true,
            hvals: true,
            hscan: true,
            geohash: true,
            geopos: true,
            geodist: true,
            georadius: true,
            georadiusbymember: true
        }
    }

    pfcount(args, callback) {
        let aggregatedErrors = {}

        // Make keys buffer so we also get results in buffers. Required, because dump/restore fails with strings
        for (let i = 0; i < args[0].length; i++) {
            args[0][i] = Buffer.from(args[0][i])
        }

        // Dump all keys from all shards
        this._scatter("dump", args, this.writePolicy, (errors, results) => {
            if (errors && Object.keys(errors).length > 0) {
                aggregatedErrors["dump"] = errors
            }

            results = Helper.flatten(results)

            // Get the one shard needed
            const baseKey = `${this.prefix}_${Date.now()}_${Math.random()}`
            const baseClients = Helper.getClients(this._clients, baseKey, this.replication)

            // Restore all keys to one shard
            this._restore(results, baseKey, baseClients, (errors, results, keys) => {
                if (errors && Object.keys(errors).length > 0) {
                    aggregatedErrors["restore"] = errors
                }

                // Do the required command
                if (keys.length > 0) {
                    this._send(baseClients, 0, true, "pfcount", [keys], (error, result) => {
                        if (error && Object.keys(error).length > 0) {
                            aggregatedErrors["pfcount"] = error
                        }

                        // Remove the gathered data
                        this._delete(keys, baseClients, (errors) => {
                            if (errors && Object.keys(errors).length > 0) {
                                aggregatedErrors["del"] = errors
                            }

                            aggregatedErrors = Helper.flatten(aggregatedErrors)

                            if (Object.keys(aggregatedErrors).length === 0) {
                                aggregatedErrors = null
                            }

                            return callback(aggregatedErrors, result)
                        })
                    })
                } else {
                    aggregatedErrors = Helper.flatten(aggregatedErrors)

                    if (Object.keys(aggregatedErrors).length === 0) {
                        aggregatedErrors = null
                    }

                    return callback(aggregatedErrors, null)
                }
            })
        })
    }

    mget(args, callback) {
        this._scatter("get", args, this.writePolicy, (errors, results) => {
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
        })
    }

    _restore(keys, baseKey, clients, callback) {
        const errors = {}
        const results = {}

        const resultKeys = []
        let x = Object.keys(keys).length

        for (let key in keys) {
            if (keys[key]) {
                const tmpKey = `${baseKey}_${key}`

                resultKeys.push(tmpKey)

                let y = clients.length

                results[tmpKey] = {}

                for (let i = 0; i < clients.length; i++) {
                    this._send(clients, i, false, "restore", [tmpKey, 0, keys[key]], (error, result, clientId) => {
                        if (error) {
                            if (typeof errors[tmpKey] === "undefined") {
                                errors[tmpKey] = {}
                            }

                            errors[tmpKey][clients[clientId][0]] = error
                        }

                        results[tmpKey][clients[clientId][0]] = result

                        if (--y === 0) {
                            if (--x === 0) {
                                return callback(errors, results, resultKeys)
                            }
                        }
                    })
                }
            } else {
                if (--x === 0) {
                    return callback(errors, results, resultKeys)
                }
            }
        }
    }

    _delete(keys, clients, callback) {
        const errors = {}
        const results = {}

        let x = keys.length

        for (let i = 0; i < keys.length; i++) {
            results[keys[i]] = {}

            let y = clients.length

            for (let j = 0; j < clients.length; j++) {
                this._send(clients, j, false, "del", [keys[i]], (error, result, clientId) => {
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

module.exports = Commands