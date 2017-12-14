"use strict"

global.__base = __dirname + "/../"

const redis = require("redis")
const should = require("should") // eslint-disable-line no-unused-vars

const Helper = require(`${__base}libs/helper`)

const ared = new (require(`${__base}libs/index`))()

describe("BASIC 2x REDIS", () => {
    const redisOptions = {
        r1: {
            host: "127.0.0.1",
            port: 6379,
            detect_buffers: true, // eslint-disable-line camelcase,
            enable_offline_queue: false // eslint-disable-line camelcase,
        },
        r2: {
            host: "127.0.0.1",
            port: 6380,
            detect_buffers: true, // eslint-disable-line camelcase,
            enable_offline_queue: false // eslint-disable-line camelcase
        }
    }

    before((done) => {
        for (let id in redisOptions) {
            const client = redis.createClient(redisOptions[id])

            client.on("ready", () => {
                client.send_command("FLUSHALL")
            })
        }

        ared.listen(null, redisOptions, null, () => {
            done()
        })
    })

    it("Should set 'foo' with value 'bar' to second server", (done) => {
        const key = "foo"

        ared.exec("set", [key, "bar"], (error, result) => {
            for (let path in Helper.flatten(error)) {
                if (error.hasOwnProperty(path)) {
                    (error[path] === null).should.be.true()
                }
            }

            for (let path in Helper.flatten(result)) {
                if (result.hasOwnProperty(path)) {
                    path.should.be.equal(`${key}.r1`)
                    result[path].should.be.equal("OK")
                }
            }

            done()
        })
    })

    it("Should get 'foo' with value 'bar' from second server", (done) => {
        const key = "foo"

        ared.exec("set", [key, "bar"], () => {
            ared.exec("get", [key], (error, result) => {
                for (let path in Helper.flatten(error)) {
                    if (error.hasOwnProperty(path)) {
                        (error[path] === null).should.be.true()
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


    it("Should respond when all keys are null on multi key command", (done) => {
        const key = "bar"

        ared.exec("pfcount", [[key]], (error, result) => {
            for (let path in Helper.flatten(error)) {
                if (error.hasOwnProperty(path)) {
                    (error[path] === null).should.be.true()
                }
            }

            (result === null).should.be.true()

            done()
        })
    })

    it("Should ignore non existent keys on multi key command", (done) => {
        const key = "bar"
        const key2 = "qux"

        ared.exec("pfadd", [key, "foo"], () => {
            ared.exec("pfcount", [[key, key2]], (error, result) => {
                for (let path in Helper.flatten(error)) {
                    if (error.hasOwnProperty(path)) {
                        (error[path] === null).should.be.true()
                    }
                }

                result.should.be.equal(1)

                done()
            })
        })
    })

    it("Should gather keys from both servers, put to one, do the command, and delete afterwards", (done) => {
        const key = "bar"
        const key2 = "qux"

        ared.exec("pfadd", [key, "foo"], () => {
            ared.exec("pfadd", [key2, "bar"], () => {
                ared.exec("pfcount", [[key, key2]], (error, result) => {
                    for (let path in Helper.flatten(error)) {
                        if (error.hasOwnProperty(path)) {
                            (error[path] === null).should.be.true()
                        }
                    }

                    result.should.be.equal(2)

                    done()
                })
            })
        })
    })

    it("Should gather keys from both servers", (done) => {
        const key = "bar"
        const key2 = "qux"

        ared.exec("set", [key, "foo"], () => {
            ared.exec("set", [key2, "bar"], () => {
                ared.exec("mget", [[key, key2]], (error, result) => {
                    for (let path in Helper.flatten(error)) {
                        if (error.hasOwnProperty(path)) {
                            (error[path] === null).should.be.true()
                        }
                    }

                    Object.keys(result).length.should.be.equal(2)
                    result[key].should.be.equal("foo")
                    result[key2].should.be.equal("bar")

                    done()
                })
            })
        })
    })
})