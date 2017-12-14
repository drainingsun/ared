"use strict"

global.__base = __dirname + "/../"

const redis = require("redis")
const should = require("should") // eslint-disable-line no-unused-vars

const Helper = require(`${__base}libs/helper`)

const ared = new (require(`${__base}libs/index`))()

describe("BASIC 1x REDIS", () => {
    const redisOptions = {
        r1: {
            host: "127.0.0.1",
            port: 6379,
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

    it("Should set 'foo' with value 'bar'", (done) => {
        const key = "foo"

        ared.exec("set", [key, "bar"], (error, result) => {
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

    it("Should get 'foo' with value 'bar'", (done) => {
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

    it("Should accept all cap read commands", (done) => {
        const key = "foo"

        ared.exec("set", [key, "bar"], () => {
            ared.exec("GET", [key], (error, result) => {
                for (let path in Helper.flatten(error)) {
                    if (error.hasOwnProperty(path)) {
                        (error[path] === null).should.be.true()
                    }
                }

                result[key].should.be.equal("bar")

                done()
            })
        })
    })
})