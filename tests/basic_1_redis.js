"use strict"

global.__base = __dirname + "/../"

const redis = require("redis")
const should = require("should") // eslint-disable-line no-unused-vars

const ared = new (require(`${__base}libs/index`))()

describe("BASIC 1x REDIS", () => {
    const redisOptions = {
        r1: {
            host: "127.0.0.1",
            port: 6379,
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

        ared.exec("set", [key, "bar"], (err, result) => {
            for (let clientId in err[key]) {
                if (err.hasOwnProperty(clientId)) {
                    (err[clientId] === null).should.be.true()
                }
            }

            for (let clientId in result[key]) {
                if (result.hasOwnProperty(clientId)) {
                    result[clientId].should.be.equal("OK")
                }
            }

            done()
        })
    })

    it("Should get 'foo' with value 'bar'", (done) => {
        const key = "foo"

        ared.exec("set", [key, "bar"], () => {
            ared.exec("get", [key], (err, result) => {
                (err[key] === null).should.be.true()
                result[key].should.be.equal("bar")

                done()
            })
        })
    })

    it("Should set and get 'foo' and 'foo2' with value 'bar'", (done) => {
        const key = "foo"
        const key2 = "foo2"

        ared.exec("set", [[key, key2], "bar"], () => {
            ared.exec("get", [[key, key2]], (err, result) => {
                (err[key] === null).should.be.true()
                ;(err[key2] === null).should.be.true()
                result[key].should.be.equal("bar")
                result[key2].should.be.equal("bar")

                done()
            })
        })
    })
})