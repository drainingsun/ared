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
            detect_buffers: true, // eslint-disable-line camelcase,
            enable_offline_queue: false // eslint-disable-line camelcase
        },
        r2: {
            host: "127.0.0.1",
            port: 6380,
            detect_buffers: true, // eslint-disable-line camelcase,
            enable_offline_queue: false // eslint-disable-line camelcase
        }
    }

    const redis2Options = {
        r3: {
            host: "127.0.0.1",
            port: 6381,
            detect_buffers: true, // eslint-disable-line camelcase,
            enable_offline_queue: false // eslint-disable-line camelcase
        },
        r4: {
            host: "127.0.0.1",
            port: 6382,
            detect_buffers: true, // eslint-disable-line camelcase,
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
            ared._server.close()

            ared2.listen(server2Options, redis2Options, null, () => {
                ared2._clients["r3"].quit()

                ared3.listen(null, null, forwardingOptions, () => {
                    done()
                })
            })
        })
    })

    it("Should set 'foo' with value 'bar' for the remaining server and redis", (done) => {
        const key = "foo"

        ared3.debug = true

        ared3.exec("set", [key, "bar"], (error, result) => {
            ared3.debug = false

            const error1 = error[`${key}.s2.${key}.r3`]
            const error2 = JSON.parse(error[`${key}.s1`])

            error1.should.be.equal("AbortError: SET can't be processed. The connection is already closed.")
            error2.code.should.be.equal("ECONNREFUSED")

            result[`${key}.s2.${key}.r4`].should.be.equal("OK")
            ;(result[`${key}.s1`] === null).should.be.true()

            done()
        })
    })

    it("Should get 'foo' with value 'bar' from the remaining server and redis", (done) => {
        const key = "foo"

        ared3.exec("set", [key, "bar"], () => {
            ared3.exec("get", [key], (error, result) => {
                (error === null).should.be.true()

                result[key].should.be.equal("bar")

                done()
            })
        })
    })
})