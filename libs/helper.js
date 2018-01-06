"use strict"

const murmurhash = require("murmurhash-native")

class Helper {
    static getClients(clients, key, replication) {
        let selectedClients = []

        for (let id in clients) {
            selectedClients.push([id, murmurhash.murmurHash64(id + key)])
        }

        selectedClients = selectedClients.sort(Helper._sort)

        return Helper._shuffle(selectedClients.slice(0, replication))
    }

    static _sort(a, b) {
        return (a[1] > b[1]) - (a[1] < b[1])
    }

    static _shuffle(range) {
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

    static flatten(obj, separator) {
        const toReturn = {}

        for (let key in obj) {
            if (typeof obj[key] === "object" && obj[key] !== null && Array.isArray(obj[key]) === false
                && Buffer.isBuffer(obj[key]) === false) {

                const flatObject = Helper.flatten(obj[key], separator)

                for (let x in flatObject) {
                    toReturn[key + separator + x] = flatObject[x]
                }
            } else {
                toReturn[key] = obj[key]
            }
        }

        return toReturn
    }
}

module.exports = Helper