# 2018-01-13, v0.2.2
* Added option in rebalancer to flush an instance that has dropped out. Read more in README.md
* Improved rebalancer testing
* Updated license 
* Updated README.md

# 2018-01-06, v0.2.1
* Did some micro optimizations to improve performance a little
* Updated benchmark results to reflect code changes and bench setup
* Improved code consistency
* Updated README.md

# 2018-01-05, v0.2.0
* Added benchmark
* Added ability to change separator for error and result objects
* Updated README.md

# 2017-12-19, v0.1.9
* Fixed Redis error in test
* Fixed Rebalancer to support replication
* Updated README.md

# 2017-12-17, v0.1.8
* Changed Redis error from JSON.stringify to toString for better readability

# 2017-12-15, v0.1.7
* Rewrote error logging system and tests

# 2017-12-15, v0.1.6
* Made sure `Helper.flatten` doesn't ignore empty arrays

# 2017-12-15, v0.1.5
* Added naive `mget` command implementation and tests

# 2017-12-14, v0.1.4
* Bumped version to correct number

# 2017-12-14, v0.1.3
* Fixed CHANGELOG.md

# 2017-12-14, v0.1.2
* Fixed the npm package name

# 2017-12-14, v0.1.1
* Added git repo link in package.json

# 2017-12-14, v0.1.0
* Renamed package ARed to ared
* Updated README.md
* Released NPM package
* Made sure all caps commands are accepted

# 2017-12-12, v0.0.7
* Fixed issue when all values are `null` in multi key commands 
* Added test case for all `null` values in multi keys commands

# 2017-12-12, v0.0.6
* Fixed issue with `null` values in multi key commands 
* Added test case for `null` values in multi keys commands

# 2017-12-12, v0.0.5
* Exposed `Helper` class for external access
* Renamed internal method `Helper.shuffle` to follow style guidelines

# 2017-12-12, v0.0.4
* Added extra keyword for package.json
* Bumped version in package.json
* Updated example in README.md
* Revamped error logging system to have more details
* Added support for multi key commands (only PFCOUNT for now)
* Temporary removed `mget` from read commands
* Added `dump` support for proper ARead random reads
* Updated tests

# 2017-11-19, v0.0.3
* Added example to README.md
* Made sure library does not depend on globals

# 2017-11-19, v0.0.2

* Added CHANGELOG.md
* Added LICENSE
* Added `hgetall`, `pfcount`, `smembers` support for proper ARead random reads
* Renamed README.MD to README.md
* Formatted README.md for better readability
* Updated README.md with some extra info