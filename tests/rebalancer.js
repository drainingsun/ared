"use strict"

global.__base = __dirname + "/../"

const redis = require("redis")
const should = require("should") // eslint-disable-line no-unused-vars

const ARed = require(`${__base}libs/index`)

const Rebalancer = require(`${__base}tools/rebalancer`)

describe("REBALANCER", () => {
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
        },
        r4: {
            host: "127.0.0.1",
            port: 6382,
            flush: true
        }
    }

    const total = 1200
    const replication = 2
    const redisClients = {}
    const keys = []
    let rebalancer = null

    before((done) => {
        const populate = (iteration, callback) => {
            let count = total

            for (let i = 0; i < total; i++) {
                const key = `test_${i}`
                const value = i * iteration

                keys.push(key)

                ared.exec("set", [key, value], (error) => {
                    if (error) {
                        throw error
                    }

                    if (--count === 0) {
                        return callback()
                    }
                })
            }
        }

        for (let id in redisOptions) {
            redisClients[id] = redis.createClient(redisOptions[id])

            redisClients[id].send_command("FLUSHALL")
        }

        let ared = new ARed()

        ared.replication = replication

        ared.listen(null, redisOptions, null, () => {
            // Populate when all nodes are present
            populate(1, () => {
                const dropoutClient = redisOptions["r4"]

                delete redisOptions["r4"]

                ared = new ARed()

                ared.replication = replication
                ared.writePolicy = replication

                ared.listen(null, redisOptions, null, () => {
                    // Populate when one node has dropped out
                    populate(2, () => {
                        redisOptions["r4"] = dropoutClient

                        ared = new ARed()

                        ared.replication = replication
                        ared.writePolicy = replication

                        ared.listen(null, redisOptions, null, () => {
                            // Rebalance with all nodes present again
                            rebalancer = new Rebalancer(redisOptions)

                            rebalancer.replication = replication
                            ared.writePolicy = replication

                            done()
                        })
                    })
                })
            })
        })
    })

    it("Simulate a node drop out and it's re-add", (done) => {
        rebalancer.start(() => {
            const results = {}
            const values = {}

            let x = Object.keys(redisClients).length

            for (let clientId in redisClients) {
                results[clientId] = {}
                values[clientId] = {}

                redisClients[clientId].send_command("DBSIZE", (error, result) => {
                    if (error) {
                        throw error
                    }

                    results[clientId] = result

                    redisClients[clientId].send_command("MGET", keys, (error, result2) => {
                        if (error) {
                            throw error
                        }

                        for (let i = 0; i < keys.length; i++) {
                            if (result2[i]) {
                                values[clientId][keys[i]] = result2[i]
                            }
                        }

                        if (--x === 0) {
                            for (let clientId in results) {
                                switch (clientId) {
                                    case "r1": {
                                        results[clientId].should.be.equal(587)
                                        break
                                    }
                                    case "r2": {
                                        results[clientId].should.be.equal(592)
                                        break
                                    }
                                    case "r3": {
                                        results[clientId].should.be.equal(603)
                                        break
                                    }
                                    case "r4": {
                                        results[clientId].should.be.equal(618)
                                        break
                                    }
                                }
                            }

                            const check = {}
                            let counter = 0

                            for (let clientId in values) {
                                for (let key in values[clientId]) {
                                    if (typeof check[key] === "undefined") {
                                        check[key] = values[clientId][key]

                                        counter++
                                    } else {
                                        check[key].should.be.equal(values[clientId][key])

                                        counter++
                                    }
                                }
                            }

                            counter.should.be.equal(total * replication)

                            done()
                        }
                    })
                })
            }
        })
    })
})