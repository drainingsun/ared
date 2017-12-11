"use strict"

global.__base = __dirname + "/../"

const should = require("should") // eslint-disable-line no-unused-vars

const Helper = require(`${__base}libs/helper`)

describe("HELPER", () => {
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
        },
        r3: {
            host: "127.0.0.1",
            port: 6381,
            enable_offline_queue: false // eslint-disable-line camelcase
        }
    }

    it("Should get the highest weight option for key 'foo'", (done) => {
        const key = "foo"

        const clients = Helper.getClients(redisOptions, key, 1)

        clients[key][0][0].should.be.equal("r3")
        clients[key][0][1].should.be.equal("15fa4405d23e2087")

        done()
    })

    it("Should get 2 highest weight and randomized options for key 'foo'", (done) => {
        const key = "foo"

        let first = Helper.getClients(redisOptions, key, 2)

        const get = () => {
            const clients = Helper.getClients(redisOptions, key, 2)

            if (first[key][0][1] !== clients[key][0][1]) {
                first = clients

                done()
            } else {
                get()
            }
        }

        get()
    })

    it("Should flatten a deep object to one dimensional key => value object", (done) => {
        const object = {
            a: {b: null},
            c: {
                d: "foo",
                e: {f: "bar"}
            }
        }

        const flatObject = Helper.flatten(object)

        ;(flatObject["a.b"] === null).should.be.true()
        flatObject["c.d"].should.be.equal("foo")
        flatObject["c.e.f"].should.be.equal("bar")

        done()
    })
})