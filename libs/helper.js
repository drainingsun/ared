"use strict"

const murmurhash = require("murmurhash-native")

class Helper {
    static getClients(clients, key, replication) {
        let hashes = []

        for (let id in clients) {
            if (clients.hasOwnProperty(id)) {
                hashes.push([id, murmurhash.murmurHash64(id + key)])
            }
        }

        hashes = hashes.sort((a, b) => (a[1] > b[1]) - (a[1] < b[1])).slice(0, replication)

        return Helper.shuffle(hashes)
    }

    static shuffle(range) {
        let counter = range.length

        while (counter > 0) {
            let index = Math.floor(Math.random() * counter)

            counter--

            let temp = range[counter]

            range[counter] = range[index]
            range[index] = temp
        }

        return range
    }
}

module.exports = Helper