function traverse(obj) {
    if (typeof obj === "object") {
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                traverse(obj[key])
            }
        }
    } else {
        return obj
    }
}

var a = {b: {k: "error3", c: {d: null, e: "error2"}, f: null, g: "error2"}}


function findById(obj) {
    let result = null

    for (let p in obj) {
        if (typeof obj[p] !== "object") {
            return obj[p]
        } else {
            if (typeof obj[p] === "object") {
                result = findById(obj[p])

                if (result) {
                    return result
                }
            }
        }
    }

    return result
}

function flatten(ob) {
    var toReturn = {};

    for (var i in ob) {
        if (!ob.hasOwnProperty(i)) continue;

        if ((typeof ob[i]) == 'object') {
            var flatObject = flatten(ob[i]);
            for (var x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) continue;

                toReturn[i + '.' + x] = flatObject[x];
            }
        } else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
};

console.log(flatten(a))
