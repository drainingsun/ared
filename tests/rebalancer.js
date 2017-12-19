"use strict"

global.__base = __dirname + "/../"

const redis = require("redis")
const should = require("should") // eslint-disable-line no-unused-vars

const Helper = require(`${__base}libs/helper`)
const Rebalancer = require(`${__base}tools/rebalancer`)

describe("REBALANCER NODE ADD", () => {
    const redisOptions = {
        r1: {
            host: "127.0.0.1",
            port: 6379
        },
        r2: {
            host: "127.0.0.1",
            port: 6380
        },
        r3: {
            host: "127.0.0.1",
            port: 6381
        }
    }

    const redisClients = {}
    let rebalancer = null

    before((done) => {
        for (let id in redisOptions) {
            redisClients[id] = redis.createClient(redisOptions[id])

            redisClients[id].send_command("FLUSHALL")
        }

        const limit = 12000
        let async = limit

        for (let i = 0; i < limit; i++) {
            const clients = Helper.getClients(redisClients, i, 1)

            redisClients[clients[0][0]].set(i, i, (error) => {
                if (error) {
                    throw error
                }

                if (--async === 0) {
                    redisOptions["r4"] = {
                        host: "127.0.0.1",
                        port: 6382
                    }

                    redisClients["r4"] = redis.createClient(redisOptions["r4"])
                    redisClients["r4"].send_command("FLUSHALL")

                    rebalancer = new Rebalancer(redisOptions)

                    done()
                }
            })
        }
    })

    it("Do rebalance", (done) => {
        rebalancer.start(() => {
            let x = Object.keys(redisClients).length

            for (let clientId in redisClients) {
                redisClients[clientId].send_command("DBSIZE", (error, result) => {
                    if (error) {
                        throw error
                    }

                    switch (clientId) {
                        case "r1": {
                            result.should.be.equal(5870)
                            break
                        }
                        case "r2": {
                            result.should.be.equal(6008)
                            break
                        }
                        case "r3": {
                            result.should.be.equal(6005)
                            break
                        }
                        case "r4": {
                            result.should.be.equal(6117)
                            break
                        }
                    }

                    if (--x === 0) {
                        done()
                    }
                })
            }
        })
    })
})