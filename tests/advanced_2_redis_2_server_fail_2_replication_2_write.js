/**
 * Architecture:
 *
 *  1R      1R      1R      1R
 *      1S              1S
 *              1F
 */

"use strict"

global.__base = __dirname + "/../"

const redis = require("redis")
const should = require("should") // eslint-disable-line no-unused-vars

const ared = new (require(`${__base}libs/index`))()
const ared2 = new (require(`${__base}libs/index`))()
const ared3 = new (require(`${__base}libs/index`))()

describe("ADVANCED 2x REDIS 2x SERVER FAIL 2x REPLICATION 2x WRITE", () => {
    const serverOptions = {
        host: "127.0.0.1",
        port: 6828
    }

    const server2Options = {
        host: "127.0.0.1",
        port: 6829
    }

    const redisOptions = {
        r1: {
            host: "127.0.0.1",
            port: 6379,
            enable_offline_queue: false // eslint-disable-line camelcase
        },
        r2: {
            host: "127.0.0.1",
            port: 6380,
            enable_offline_queue: false // eslint-disable-line camelcase
        }
    }

    const redis2Options = {
        r3: {
            host: "127.0.0.1",
            port: 6381,
            enable_offline_queue: false // eslint-disable-line camelcase
        },
        r4: {
            host: "127.0.0.1",
            port: 6382,
            enable_offline_queue: false // eslint-disable-line camelcase
        }
    }

    const forwardingOptions = {
        s1: {
            host: "127.0.0.1",
            port: 6828
        },
        s2: {
            host: "127.0.0.1",
            port: 6829
        }
    }

    ared.replication = 2
    ared.writePolicy = 2

    ared2.replication = 2
    ared2.writePolicy = 2

    ared3.replication = 2
    ared3.writePolicy = 2

    before((done) => {
        for (let id in redisOptions) {
            const client = redis.createClient(redisOptions[id])

            client.on("ready", () => {
                client.send_command("FLUSHALL")
            })
        }

        ared.listen(serverOptions, redisOptions, null, () => {
            ared._server.close()

            ared2.listen(server2Options, redis2Options, null, () => {
                ared3.listen(null, null, forwardingOptions, () => {
                    done()
                })
            })
        })
    })

    it("Should set 'foo' with value 'bar' for the remaining server and redis", (done) => {
        ared3.exec("set", ["foo", "bar"], (err, result) => {
            for (let clientId in err) {
                if (err.hasOwnProperty(clientId)) {
                    for (let clientId2 in err[clientId]) {
                        if (err[clientId].hasOwnProperty(clientId2)) {
                            if (clientId === "s2") {
                                (err[clientId][clientId2] === null).should.be.true()
                            } else {
                                (err[clientId][clientId2] === null).should.be.false()
                            }
                        }
                    }
                }
            }

            for (let clientId in result) {
                if (result.hasOwnProperty(clientId)) {
                    for (let clientId2 in result[clientId]) {
                        if (result[clientId].hasOwnProperty(clientId2)) {
                            result[clientId][clientId2].should.be.equal("OK")
                        }
                    }
                }
            }

            done()
        })
    })

    it("Should get 'foo' with value 'bar' from the remaining server and redis", (done) => {
        ared3.exec("set", ["foo", "bar"], () => {
            ared3.exec("get", ["foo"], (err, result) => {
                (err === null).should.be.true()
                result.should.be.equal("bar")

                done()
            })
        })
    })
})