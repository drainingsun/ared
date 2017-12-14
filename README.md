# ARed - Redis Cluster based on Rendezvous Hashing (HRW).
A somewhat different approach to Redis node clustering. 

### WARNING! Highly experimental. Use at your own risk!

## INTRO
Redis is fast, crazy fast, but it has one fatal limitation - it's single threaded. Thus scaling is hard. And while there
are some robust solutions to this problem [Twemproxy](https://github.com/twitter/twemproxy) and Redis Cluster they seem 
overly complicated and suffer from many drawbacks. Enter *ARed*, a scaling solution that works on a completely different 
architecture than the two above. It's based on [Rendezvous Hashing](https://en.wikipedia.org/wiki/Rendezvous_hashing) 
and (if used with replication) contrary to the traditional master->slave architecture it is a multi-master one. In 
addition to that, ARed is also stateless which greatly simplifies configuration and maintenance of the cluster.

## USAGE:

2 Redis instances. Data is distributed randomly 50/50. If replication is enabled, reads are also split 50/50.
```javascript
const ared = new (require("ared"))()

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

## Supported commands
All single key commands should work. Multi key commands (remember, keys can be on different servers) require custom 
logic which is yet to be implemented, with the exception of PFCOUNT, which is supported. 


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
* More examples
* Benchmarks
* Guide that actually tries to explain the inner workings and power of ARed!