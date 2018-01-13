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
// ared.debug = true // Uncomment if you want a full key path in your results.
// ared.separator = "." // Change this if your keys use dots, because this is used for error and result flattening.
 
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

WARNING: Take care with rebalancing when you re-add a node that has dropped out due to failure and you have replication 
turned on. This means - you need to either manually flush the node being re-added or use `flush = true` in the 
rebalancer redisOptions. See `tests/rebalancer.js` for an example.

## Benchmarks
There's a primitive tool (`tools/benchmark.js`) to check how big of a penalty does ARed cause compared to vanilla Redis 
client. Here's the result dump (Intel® Core™ i7-6700 Quad-Core server, and each run sends 16 commands with random key):

```text
Raw Redis Set x 10,589 ops/sec ±1.35% (128 runs sampled)
Raw Redis Get x 9,893 ops/sec ±0.80% (128 runs sampled)
Basic 1 Redis Set x 5,133 ops/sec ±0.80% (126 runs sampled)
Basic 1 Redis Get x 5,101 ops/sec ±0.84% (126 runs sampled)
Basic 2 Redis Set x 4,013 ops/sec ±0.89% (124 runs sampled)
Basic 2 Redis Get x 4,007 ops/sec ±0.79% (125 runs sampled)
Basic 4 Redis Set x 4,074 ops/sec ±0.87% (126 runs sampled)
Basic 4 Redis Get x 3,996 ops/sec ±0.98% (124 runs sampled)
Basic 4 Redis 2x Replication 2x Write Set x 2,677 ops/sec ±0.84% (126 runs sampled)
Basic 4 Redis 2x Replication 2x Write Get x 3,996 ops/sec ±0.97% (124 runs sampled)

```

Before jumping in, keep in mind, Redis instances where not even close to being saturated (even with raw Redis client), 
so any benefit of scaling out is drowned in the fact that the client could not produce the necessary input to see how 
scaling reduces the load. 

Moving on, to no big surprise, if you just use 1 Redis instance and use Ared for it, expect it to be ~50% slower. 
Things get more interesting if you start to scale though. 2 Redis on Ared, compared to 1, incur an extra ~20% for both 
commands. But at the same time if you use 4 Redis, the difference between the former result and the latter is non 
existent. This is great news! Meaning, adding instances does not cause a noticeable slowdown. But this is not the full 
picture. If you check the last two rows with replication, you can see that writes slowdown significantly (~33%). This is 
because replication is done from the client side, which means writes are done, even if in parallel, twice. It doesn't 
affect reads though, since only one instance need to be read. I've also tried using 4x replication to see how worse it 
performs compared to 2x. As expected, reads stayed the same, but writes dropped ~60% compared to no replication. 

From this we can safely draw some conclusions. One, ARed has a significant performance penalty compared to vanilla 
Redis client. Two, it also has a performance penalty moving from 1 to 2 instances, but after that both writes and reads 
stay more or less on the same level. Three, replication factor causes write performance penalty.

To sum it up ARed performance penalties are:

* 1 Redis - ~50% for reads/writes. (Vanilla is 2x faster)
* 2 Redis - ~60% for reads/writes. (Vanilla is 2.5x faster)
* 4 Redis (2x replication) - ~60% for reads, ~75% for writes (Vanilla is 2.5x/3.75x faster)

There's but one thing that still needs benchmarking. The performance of ARed on a multi-layer architecture. Stay tuned 
for updates on this!

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
* Lots of fixes and optimizations