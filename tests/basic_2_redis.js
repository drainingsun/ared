"use strict"

global.__base = __dirname + "/../"

const redis = require("redis")
const should = require("should") // eslint-disable-line no-unused-vars

const ared = new (require(`${__base}libs/index`))()

describe("BASIC 2x REDIS", () => {
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

        ared.exec("set", [key, "bar"], (err, result) => {
            for (let clientId in err[key]) {
                if (err[key].hasOwnProperty(clientId)) {
                    (err[key][clientId] === null).should.be.true()
                }
            }

            for (let clientId in result[key]) {
                if (result[key].hasOwnProperty(clientId)) {
                    clientId.should.be.equal("r1")
                    result[key][clientId].should.be.equal("OK")
                }
            }

            done()
        })
    })

    it("Should get 'foo' with value 'bar' from second server", (done) => {
        const key = "foo"

        ared.exec("set", [key, "bar"], () => {
            ared.exec("get", [key], (err, result) => {
                (err[key] === null).should.be.true()
                result[key].should.be.equal("bar")

                done()
            })
        })
    })
})