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

const Helper = require(`${__base}libs/helper`)

const ared = new (require(`${__base}libs/index`))()
const ared2 = new (require(`${__base}libs/index`))()
const ared3 = new (require(`${__base}libs/index`))()

describe("ADVANCED 2x REDIS FAIL 2x SERVER 2x REPLICATION 2x WRITE", () => {
    const serverOptions = {
        host: "127.0.0.1",
        port: 6826
    }

    const server2Options = {
        host: "127.0.0.1",
        port: 6827
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
            port: 6826
        },
        s2: {
            host: "127.0.0.1",
            port: 6827
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
            ared._clients["r1"].quit()
            ared._clients["r2"].quit()

            ared2.listen(server2Options, redis2Options, null, () => {
                ared2._clients["r3"].quit()

                ared3.listen(null, null, forwardingOptions, () => {
                    done()
                })
            })
        })
    })

    it("Should set 'foo' with value 'bar' for the remaining redis", (done) => {
        ared3.exec("set", ["foo", "bar"], (err, result) => {

            for (let path in Helper.flatten(err)) {
                if (err.hasOwnProperty(path)) {
                    if (-1 !== path.indexOf("s2") && -1 !== path.indexOf("r4")) {
                        (err[path] === null).should.be.true()
                    } else {
                        (err[path] === null).should.be.false()
                    }
                }
            }

            for (let path in Helper.flatten(result)) {
                if (result.hasOwnProperty(path)) {
                    result[path].should.be.equal("OK")
                }
            }

            done()
        })
    })

    it("Should get 'foo' with value 'bar' from the remaining redis", (done) => {
        const key = "foo"

        ared3.exec("set", [key, "bar"], () => {
            ared3.exec("get", [key], (err, result) => {
                for (let path in Helper.flatten(err)) {
                    if (err.hasOwnProperty(path)) {
                        (err[path] === null).should.be.true()
                    }
                }

                for (let path in Helper.flatten(result)) {
                    if (result.hasOwnProperty(path)) {
                        result[path].should.be.equal("bar")
                    }
                }

                done()
            })
        })
    })
})