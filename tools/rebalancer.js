"use strict"

global.__base = __dirname + "/../"

const async = require("async")
const redis = require("redis")

const Helper = require(`${__base}libs/helper`)

class Rebalancer {
    constructor(redisOptions) {
        this.concurrency = 100
        this.replication = 1

        this._clients = {}

        for (let id in redisOptions) {
            this._clients[id] = redis.createClient(redisOptions[id])

            if (redisOptions[id].flush === true) {
                this._clients[id].on("ready", () => {
                    this._clients[id].send_command("FLUSHALL")
                })
            }
        }
    }

    start(callback) {
        console.log("Rebalancing started.") // eslint-disable-line no-console

        async.eachSeries(Object.keys(this._clients), (id, callback) => {
            this._move(id, () => {
                return callback()
            })
        }, () => {
            console.log("Rebalancing done.") // eslint-disable-line no-console

            return callback()
        })
    }

    _move(id, callback) {
        const start = new Date()
        let movedCount = 0

        console.log(`Id: ${id}. Start: ${start.toString()}.`) // eslint-disable-line no-console

        this._clients[id].keys("*", (err, keys) => {
            if (err) {
                throw err
            }

            const keysToMove = []

            for (let i = 0; i < keys.length; i++) {
                const key = keys[i]

                const clients = Helper.getClients(this._clients, key, this.replication)

                let type = "REPLACE"

                for (let i = 0; i < clients.length; i++) {
                    if (clients[i][0] === id) {
                        type = "COPY"

                        break
                    }
                }

                for (let i = 0; i < clients.length; i++) {
                    if (clients[i][0] !== id) {
                        keysToMove.push([clients[i][0], key, type])
                    }
                }
            }

            const q = async.queue((key, callback) => {
                const command = [
                    this._clients[key[0]].options.host,
                    this._clients[key[0]].options.port,
                    key[1],
                    0,
                    5000,
                    key[2]
                ]

                this._clients[id].migrate(command, (err) => {
                    if (!err) {
                        movedCount++
                    }

                    return callback()
                })
            }, this.concurrency)


            q.drain = () => {
                let text = `Id: ${id}. End: ${start.toString()}. `

                text += `Moved: ${movedCount}. `
                text += `Duration: ${Date.now() - start.getTime()} ms.`

                console.log(text) // eslint-disable-line no-console

                return callback()
            }

            q.push(keysToMove)
        })
    }
}

module.exports = Rebalancer