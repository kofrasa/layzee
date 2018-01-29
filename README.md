
# layzee

A minimal lazy iterator implementation

[![version](https://img.shields.io/npm/v/layzee.svg)](https://www.npmjs.org/package/layzee)
[![build status](https://img.shields.io/travis/kofrasa/layzee.svg)](http://travis-ci.org/kofrasa/layzee)
[![npm](https://img.shields.io/npm/dm/layzee.svg)](https://www.npmjs.org/package/layzee)
[![Codecov](https://img.shields.io/codecov/c/github/kofrasa/layzee.svg)](https://codecov.io/gh/kofrasa/layzee)

## install
```$ npm install layzee```

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

# api
Factory method interface.
- `layzee(iterable|function)` - Creates a lazy iterator for the given iterable or function. Iterable is an `Arrary` or any object with interface `Object{next:Function}`

Chainable methods that operate on each item in the sequence. All return an `Iterator`
- `map(f)` - Tranform each item in the sequence
- `filter(pred)` - Check an item with predicate and allow if result is truthy
- `take(n)` - Take the given number of items from the sequence
- `takeWhile(pred)` - Take items from the sequence while the predicate is truthy otherwise terminate
- `drop(n)` - Drop the given number of items from the sequence
- `dropWhile(pred)` - Drop item from the sequence for as long as the predicate is truthy
- `sample([n])` - Sample the sequence with the given probability value. Defaults to 0.5
- `uniq([hashFn])` - Get only unique values from the sequence

Chainable methods that must fully realized the sequence for transformation. All return an `Iterator`
- `sort([cmp])` - Sort sequence with an optional comparator
- `sortBy(keyFn, [cmp])` - Sort sequence with the given key function and optional comparator
- `reverse()` -  Reverses the sequence
- `transform(f)` - Apply a transformation step with the given transform function. Such a function has signature `(array) => iterable`

Terminal methods for common operations on sequences
- `each(f): Boolean` - Evaluate function for each item in sequence. Iteration stops and return false on first evaluation that return false
- `reduce(f,[init])` - Reduces the sequence with the given reduction function and optional initial value
- `size(): Number` - Number of items in the sequence after applying all chained operations
- `max([cmp])` - Maximum item in the sequence using optional comparator
- `min([cmp])` - Minimum item in the sequence using optional comparator
- `groupBy(keyFn): Object` - Group the values in sequence by the given key function with signature `(any) => string`
- `partition(pred): Array`- Special case of `groupBy` that takes a predicate function and return truthy values at index 0 and falsey values at index 1 in output
- `one(): Iterator` - Extract exactly one value from the sequence and return unwrapped in a call to `value()`. No chainable method is valid after this.
- `value(): Array` - Return an array of the results of applying all transformations to the sequence. The result is unwrapped if `one()` was used. Successive calls return a cached value.

Utility method on `layzee`
- `range(start,[stop,[step]]): Iterator` - Generates a lazy sequence of numbers. Sequence starts from zero if stop and step are not given.
- `isIterable(object): Boolean` - Check if a given object is iterable.

# license
MIT