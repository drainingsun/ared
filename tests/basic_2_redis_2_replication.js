"use strict"

global.__base = __dirname + "/../"

const redis = require("redis")
const should = require("should") // eslint-disable-line no-unused-vars

const ared = new (require(`${__base}libs/index`))()

describe("BASIC 2x REDIS 2x REPLICATION", () => {
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

    ared.replication = 2


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

    it("Should set 'foo' with value 'bar' to both servers, but wait for one only", (done) => {
        const key = "foo"

        ared.exec("set", [key, "bar"], (err, result) => {
            Object.keys(result).length.should.be.equal(1)

            for (let clientId in err[key]) {
                if (err[key].hasOwnProperty(clientId)) {
                    (err[key][clientId] === null).should.be.true()
                }
            }

            for (let clientId in result[key]) {
                if (result[key].hasOwnProperty(clientId)) {
                    result[key][clientId].should.be.equal("OK")
                }
            }

            done()
        })
    })
})