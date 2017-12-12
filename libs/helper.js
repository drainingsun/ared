"use strict"

const murmurhash = require("murmurhash-native")

class Helper {
    static getClients(clients, key, replication) {
        let selectedClients = []

        for (let id in clients) {
            if (clients.hasOwnProperty(id)) {
                selectedClients.push([id, murmurhash.murmurHash64(id + key)])
            }
        }

        selectedClients = selectedClients.sort((a, b) => (a[1] > b[1]) - (a[1] < b[1]))

        return Helper.shuffle(selectedClients.slice(0, replication))
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

    static flatten(obj) {
        const toReturn = {}

        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (typeof obj[key] === "object" && obj[key] !== null) {
                    const flatObject = Helper.flatten(obj[key])

                    for (let x in flatObject) {
                        if (flatObject.hasOwnProperty(x)) {
                            toReturn[key + "." + x] = flatObject[x]
                        }
                    }
                } else {
                    toReturn[key] = obj[key]
                }
            }
        }

        return toReturn
    }
}

module.exports = Helper