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

For more information, please read [What is ARed (Redis scaling solution): The theory](https://medium.com/@drainingsun/what-is-ared-redis-scaling-solution-the-theory-178cf9e9b738)

## REQUIREMENTS
* Node.js v6+
* Redis v4+

## INSTALLATION
`npm install ared`

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
logic which is yet to be implemented, with the exception of MGET and PFCOUNT, which are supported. 


## Errors and results
Only last errors are returned and only on write commands if some of the nodes fail. Reads will only return an error if
there's a complete cluster failure for the specified key. 

Both errors and results have keys associated with them. In case of errors, the keys will depend on the depth of the 
architecture. For example, a 3 layer architecture 
(as in `advanced_2_redis_fail_2_server_fail_2_replication_2_write.js`), for a key `foo`, error key will be 
`foo.s*.foo.r*` which can be translated to key trying to access server `s*` and redis `r*`. In case of results, the 
key(s) is what you supplied (as in `result[key]`).

While this can be confusing and different from plain redis client, in order to have unlimited depth architecture of 
ARed this is required. Take note, to make things easier, they keys are flattened to only one object level. 

## Rebalancing
Currently, if a node is removed or added, data will not migrate automatically. This shouldn't be a problem if you're 
using ARed as a cache and not object storage system. But if you do, there's a tool (`tools/rebalancer.js`) provided to 
rebalance the cluster. It's not very efficient at the moment but it does the job. Just one caveat - you shouldn't do 
rebalance online, otherwise expect missing and overwritten data. In the future I might create an online rebalancer, but
it's not on top of the priority list. Why? Because it's hard. Migrating data while there are reads and writes to it 
requires ridiculous amount of complexity which currently doesn't fit into the overall project (translation: I have no 
clue how to create a simple and elegant solution. Help?)

## Testing
NOTE: Requires Redis (localhost and ports 6379-6832) to be installed (4 instances for full testing)
```bash
npm test
```

## Linting
```bash
npm run lint
```

## Contributing
Go nuts! Just don't forget to test and lint. Credit will be given where it's due.

## Future
* More examples
* Benchmarks
* Lots of fixes and optimizations