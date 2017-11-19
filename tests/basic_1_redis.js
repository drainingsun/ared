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
        ared.exec("set", ["foo", "bar"], (err, result) => {
            for (let clientId in err) {
                if (err.hasOwnProperty(clientId)) {
                    (err[clientId] === null).should.be.true()
                }
            }

            for (let clientId in result) {
                if (result.hasOwnProperty(clientId)) {
                    result[clientId].should.be.equal("OK")
                }
            }

            done()
        })
    })

    it("Should get 'foo' with value 'bar'", (done) => {
        ared.exec("set", ["foo", "bar"], () => {
            ared.exec("get", ["foo"], (err, result) => {
                (err === null).should.be.true()
                result.should.be.equal("bar")

                done()
            })
        })
    })
})