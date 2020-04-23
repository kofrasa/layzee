
# layzee

A minimal lazy iterator implementation

[![version](https://img.shields.io/npm/v/layzee.svg)](https://www.npmjs.org/package/layzee)
[![build status](https://img.shields.io/travis/kofrasa/layzee.svg)](http://travis-ci.org/kofrasa/layzee)
[![npm](https://img.shields.io/npm/dm/layzee.svg)](https://www.npmjs.org/package/layzee)
[![Codecov](https://img.shields.io/codecov/c/github/kofrasa/layzee.svg)](https://codecov.io/gh/kofrasa/layzee)

## install

```$ npm install layzee```

[docs](kofrasa.net/layzee)

# usage

```js
import layzee from 'layzee'

let range = layzee.range
let iter = layzee([1,2,3,4,5])

for (let o of iter) {
  // do stuff
}

// using range
let r = range(0, 100) // generates [10..20)
r.filter(o => o % 11 === 0).take(3)
r.next() // { value: 0, done: false}
r.value() // [11, 22] iterator is fully realized
r.value() // [11, 22] - result is cached after first call to value()
r.next() // { done: true }

// using generators
  function* genEven () {
    let i = 0
    while (i % 2 === 0) {
      i += 2
      yield i
    }
  }

  let even5 = layzee(genEven()).take(5)
  even5.value() // [2,4,6,8,10]
```

# license

MIT
