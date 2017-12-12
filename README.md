# ARed - Redis Cluster based on Rendezvous Hashing (HRW).
A kind of a different approach in clustering Redis nodes. More info: https://en.wikipedia.org/wiki/Rendezvous_hashing

### WARNING! Highly experimental. Use at your own risk!

## USAGE:

2 Redis instances. Data is distributed randomly 50/50. If replication is enabled, reads are also split 50/50.
```javascript
const ared = new (require("ARed"))()

// ared.replication = 2 // Uncomment this for 2x replication
// ared.writePolicy = 2 // Uncomment this to wait for both writes to finish. (1 - one write, 0 - no wait)

const redisOptions = {
    r1: {
        host: "127.0.0.1",
        port: 6379,
        detect_buffers: true // Required if you are going to use multi key commands
    },
    r2: {
        host: "127.0.0.1",
        port: 6380,
        detect_buffers: true // Required if you are going to use multi key commands
    }
}

ared.listen(null, redisOptions, null, () => {
    ared.exec("set", ["foo", "bar"], () => { // redisClient.send_command() style arguments
        ared.exec("get", ["foo"], (err, result) => {
            console.log(err, result)
        })
    })
})


```

See tests for more examples. 

## Testing
NOTE: Requires Redis to be installed (up to 4 instances for full testing)
```bash
npm test
```

## Linting
```bash
npm run lint
```

## Future
* More details
* More examples
* NPM repository
* Benchmarks
* etc...