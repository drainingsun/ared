"use strict"

const murmurhash = require("murmurhash-native")

class Helper {
    static getClients(clients, keys, replication) {
        let selectedClients = {}

        if (!Array.isArray(keys)) {
            keys = [keys]
        }

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]

            if (typeof selectedClients[key] === "undefined") {
                selectedClients[key] = []
            }

            for (let id in clients) {
                if (clients.hasOwnProperty(id)) {
                    selectedClients[key].push([id, murmurhash.murmurHash64(id + key)])
                }
            }
        }

        for (let key in selectedClients) {
            if (selectedClients.hasOwnProperty(key)) {
                selectedClients[key] = selectedClients[key].sort((a, b) => (a[1] > b[1]) - (a[1] < b[1]))

                selectedClients[key] = Helper.shuffle(selectedClients[key].slice(0, replication))
            }
        }

        return selectedClients
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