"use strict"

global.__base = __dirname + "/../"

const async = require("async")
const Benchmark = require("benchmark")
const redis = require("redis")

const Ared = require(`${__base}libs/index`)

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
    },
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

const keysPerSample = 16
const keys = []

let rawRedis = null
const basic1Ared = new Ared()
const basic2Ared = new Ared()
const basic4Ared = new Ared()
const basic4Ared2Replication2Write = new Ared()

basic4Ared2Replication2Write.replication = 4
basic4Ared2Replication2Write.writePolicy = 4

async.parallel([
    (callback) => {
        for (let id in redisOptions) {
            const client = redis.createClient(redisOptions[id])

            client.on("ready", () => {
                client.send_command("FLUSHALL")
            })
        }

        return callback()
    },

    (callback) => {
        for (let i = 0; i < keysPerSample; i++) {
            const key = Math.floor(Math.random() * 1000000000).toString()

            keys.push(key)
        }

        return callback()
    },

    (callback) => {
        rawRedis = redis.createClient(redisOptions["r1"])

        rawRedis.on("ready", () => {
            return callback()
        })
    },

    (callback) => {
        basic1Ared.listen(null, {r1: redisOptions["r1"]}, null, () => {
            return callback()
        })
    },

    (callback) => {
        basic2Ared.listen(null, redisOptions, null, () => {
            return callback()
        })
    },

    (callback) => {
        basic4Ared.listen(null, redisOptions, null, () => {
            return callback()
        })
    },

    (callback) => {
        basic4Ared2Replication2Write.listen(null, redisOptions, null, () => {
            return callback()
        })
    }
], () => {
    const options = {
        minSamples: 50,
        defer: true
    }

    const suite = new Benchmark.Suite()

    suite.add("Raw Redis Set", (deferred) => {
        let x = keysPerSample

        for (let i = 0; i < keysPerSample; i++) {
            rawRedis.send_command("set", [keys[i], keys[i]], () => {
                if (--x === 0) {
                    deferred.resolve()
                }
            })
        }
    }, options)

    suite.add("Raw Redis Get", (deferred) => {
        let x = keysPerSample

        for (let i = 0; i < keysPerSample; i++) {
            rawRedis.send_command("get", [keys[i]], () => {
                if (--x === 0) {
                    deferred.resolve()
                }
            })
        }
    }, options)

    suite.add("Basic 1 Redis Set", (deferred) => {
        let x = keysPerSample

        for (let i = 0; i < keysPerSample; i++) {
            basic1Ared.exec("set", [keys[i], keys[i]], () => {
                if (--x === 0) {
                    deferred.resolve()
                }
            })
        }
    }, options)

    suite.add("Basic 1 Redis Get", (deferred) => {
        let x = keysPerSample

        for (let i = 0; i < keysPerSample; i++) {
            basic1Ared.exec("get", [keys[i]], () => {
                if (--x === 0) {
                    deferred.resolve()
                }
            })
        }
    }, options)

    suite.add("Basic 2 Redis Set", (deferred) => {
        let x = keysPerSample

        for (let i = 0; i < keysPerSample; i++) {
            basic2Ared.exec("set", [keys[i], keys[i]], () => {
                if (--x === 0) {
                    deferred.resolve()
                }
            })
        }
    }, options)

    suite.add("Basic 2 Redis Get", (deferred) => {
        let x = keysPerSample

        for (let i = 0; i < keysPerSample; i++) {
            basic2Ared.exec("get", [keys[i]], () => {
                if (--x === 0) {
                    deferred.resolve()
                }
            })
        }
    }, options)

    suite.add("Basic 4 Redis Set", (deferred) => {
        let x = keysPerSample

        for (let i = 0; i < keysPerSample; i++) {
            basic4Ared.exec("set", [keys[i], keys[i]], () => {
                if (--x === 0) {
                    deferred.resolve()
                }
            })
        }
    }, options)

    suite.add("Basic 4 Redis Get", (deferred) => {
        let x = keysPerSample

        for (let i = 0; i < keysPerSample; i++) {
            basic4Ared.exec("get", [keys[i]], () => {
                if (--x === 0) {
                    deferred.resolve()
                }
            })
        }
    }, options)

    suite.add("Basic 4 Redis 2x Replication 2x Write Set", (deferred) => {
        let x = keysPerSample

        for (let i = 0; i < keysPerSample; i++) {
            basic4Ared2Replication2Write.exec("set", [keys[i], keys[i]], () => {
                if (--x === 0) {
                    deferred.resolve()
                }
            })
        }
    }, options)

    suite.add("Basic 4 Redis 2x Replication 2x Write Get", (deferred) => {
        let x = keysPerSample

        for (let i = 0; i < keysPerSample; i++) {
            basic4Ared2Replication2Write.exec("get", [keys[i]], () => {
                if (--x === 0) {
                    deferred.resolve()
                }
            })
        }
    }, options)

    suite.on("cycle", function (event) {
        console.log(String(event.target)) // eslint-disable-line no-console
    })

    suite.on("complete", function () {
        console.log("Fastest is " + this.filter("fastest").map("name")) // eslint-disable-line no-console

        process.exit(1)
    })

    suite.run({async: true})
})