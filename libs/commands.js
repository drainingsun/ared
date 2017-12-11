"use strict"

const Helper = require("./helper")

class Commands {
    constructor() {
        this.prefix = "ared"
    }

    pfcount(args, callback) {
        const clients = Helper.getClients(this._clients, args[0], this.replication)

        const errors = {}
        const results = {}
        let x = Object.keys(clients).length

        for (let key in clients) {
            args[0] = key // We change the key since we already know where to direct command.

            this._send(clients[key], 0, true, "get", args, (err, result) => {
                errors[key] = err
                results[key] = result

                if (--x === 0) {
                    for (let path in Helper.flatten(errors)) {
                        if (errors.hasOwnProperty(path)) {
                            if (errors[path]) {
                                return callback(errors, results)
                            }
                        }
                    }

                    const baseKey = `${this.prefix}_${key}_${Date.now()}_${Math.random()}`

                    let baseKeyClients = Helper.getClients(this._clients, baseKey, this.replication)[baseKey]

                    const errors2 = {}
                    const results2 = {}
                    const resultKeys = []
                    let x = Object.keys(results).length

                    for (let key in results) {
                        const tmpKey = `${baseKey}_${key}`

                        resultKeys.push(tmpKey)

                        errors2[tmpKey] = {}
                        results2[tmpKey] = {}

                        this._send(baseKeyClients, 0, false, "set", [tmpKey, results[key]], (err, result) => {
                            errors2[tmpKey][baseKeyClients[0][0]] = err
                            results2[tmpKey][baseKeyClients[0][0]] = result

                            if (--x === 0) {
                                for (let path in Helper.flatten(errors2)) {
                                    if (errors2.hasOwnProperty(path)) {
                                        if (errors2[path]) {
                                            return callback(errors2, results2)
                                        }
                                    }
                                }

                                this._send(baseKeyClients, 0, true, "pfcount", [resultKeys], (err, result) => {
                                    this._send(baseKeyClients, 0, true, "del", [resultKeys], () => {
                                        return callback(err, result)
                                    })
                                })
                            }
                        })
                    }
                }
            })
        }
    }
}

module.exports = Commands