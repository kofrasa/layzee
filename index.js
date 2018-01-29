/**
 * Returns an iterator
 * @param {*} source An iterable source (Array, Function, Object{next:Function})
 */
export default function layzee (source) {
  return (source instanceof Iterator) ? source : new Iterator(source)
}

layzee.VERSION = '0.0.0'
layzee.isIterator = isIterable
layzee.range = range

const isArray = Array.isArray

/**
 * Checks whether the given object is iterable
 * @param {*} o An object
 */
function isIterable (o) {
  return isArray(o) || (!!o && typeof o === 'object' && isFn(o.next))
}

/**
 * Return an iterator for range
 * @param {Number} start
 * @param {Number} end
 * @param {Number} step
 */
function range (start, end, step) {
  if (end === undefined) {
    end = start
    start = 0
  }
  if (!step) step = start < end ? 1 : -1

  return layzee(() => {
    if (step > 0 && start < end || step < 0 && start > end) {
      let val = { value: start, done: false }
      start += step
      return val
    }
    return { done: true }
  })
}

// helpers
function compare (a,b) {
  return a < b ? -1 : (a > b ? 1 : 0)
}

function isFn (f) {
  return !!f && typeof f === 'function'
}

function dropItem (array, i) {
  let rest = array.slice(i + 1)
  array.splice(i)
  Array.prototype.push.apply(array, rest)
}

// stop iteration error
const DONE = new Error()

// Lazy function type flags
const LAZY_MAP = 1
const LAZY_FILTER = 2
const LAZY_TAKE = 3
const LAZY_TAKE_WHILE = 4
const LAZY_DROP = 5
const LAZY_DROP_WHILE = 6
const LAZY_UNIQ = 7

function baseIterator (nextFn, iteratees, buffer) {

  let done = false
  let index = -1
  let hashes = {} // used for LAZY_UNIQ
  let bIndex = 0 // index for the buffer

  return function (b) {

    // special hack to collect all values into buffer
    b = b === buffer

    try {

      outer: while (!done) {
        let o = nextFn()
        index++

        let mIndex = -1
        let mSize = iteratees.length
        let innerDone = false

        while (++mIndex < mSize) {
          let member = iteratees[mIndex],
            func = member.func,
            type = member.type;

          switch (type) {
            case LAZY_MAP:
              o = func(o, index)
              break
            case LAZY_FILTER:
              if (!func(o, index)) continue outer
              break
            case LAZY_TAKE:
              --member.func
              if (!member.func) innerDone = true
              break
            case LAZY_TAKE_WHILE:
              if (!func(o, index)) break outer
              break
            case LAZY_DROP:
              --member.func
              if (!member.func) dropItem(iteratees, mIndex)
              continue outer
            case LAZY_DROP_WHILE:
              if (func(o, index)) continue outer
              dropItem(iteratees, mIndex)
              --mSize // adjust size
              --mIndex
              break
            case LAZY_UNIQ:
              let k = func(o)
              if (hashes[k]) continue outer
              hashes[k] = 1
              break
            default:
              break outer
          }
        }

        done = innerDone

        if (b) {
          buffer[bIndex++] = o
        } else {
          return { value: o, done: false }
        }
      }
    } catch (e) {
      if (e !== DONE) throw e
    }

    hashes = null // clear the hash cache
    done = true
    return { done: true }
  }
}

class Iterator {
  /**
   * @param {*} source An iterable object or function.
   *    Array - return one element per cycle
   *    Object{next:Function} - call next() for the next value (this also handles generator functions)
   *    Function - call to return the next value
   * @param {Function} fn An optional transformation function
   */
  constructor (source) {
    this.__iteratees = [] // lazy function chain
    this.__only = false // flag whether to return a single value
    this.__done = false
    this.__buf = []

    if (isFn(source)) source = { next: source }

    if (isArray(source)) {
      source = (data => {
        let size = data.length
        let index = 0
        return () => {
          if (index < size) return data[index++]
          throw DONE
        }
      })(source)
    } else if (isIterable(source)) {
      source = (src => () => {
        let o = src.next()
        if (o.done) throw DONE
        return o.value
      })(source)
    } else if (!isFn(source)) {
      throw new Error("Source is not iterable. Must be Array, Function or Object{next:Function}")
    }

    // create next function
    this.next = baseIterator(source, this.__iteratees, this.__buf)
  }

  [Symbol.iterator] () {
    return this
  }

  _validate () {
    if (this.__only) throw new Error("Cannot add iteratee/transform after `one()`")
  }

  /**
   * Add an iteratee to this lazy sequence
   * @param {Object} iteratee
   */
  _push (iteratee) {
    this._validate()
    this.__iteratees.push(iteratee)
    return this
  }

  //// Iteratees methods //////

  /**
   * Transform each item in the sequence to a new value
   * @param {Function} f
   */
  map (f) {
    return this._push({ type: LAZY_MAP, func: f })
  }

  /**
   * Select only items matching the given predicate
   * @param {Function} pred
   */
  filter (pred) {
    return this._push({ type: LAZY_FILTER, func: pred })
  }

  /**
   * Take given numbe for values from sequence
   * @param {Number} n A number greater than 0
   */
  take (n) {
    return n > 0 ? this._push({ type: LAZY_TAKE, func: n }) : this
  }

  /**
   * Take items from the sequence while the predicate passes, otherwise end
   * @param {Function} pred
   */
  takeWhile (pred) {
    return this._push({ type: LAZY_TAKE_WHILE, func: pred })
  }

  /**
   * Drop a number of values from the sequence
   * @param {Number} n Number of items to drop greater than 0
   */
  drop (n) {
    return n > 0 ? this._push({ type: LAZY_DROP, func: n }) : this
  }

  /**
   * Drop values while predicate succeeds, otherwise return the rest of the sequence
   * @param {Function} pred Predicate function
   */
  dropWhile (pred) {
    return this._push({ type: LAZY_DROP_WHILE, func: pred })
  }

  /**
   * Returns only uniq values from the sequence.
   * The default hash function `JSON.stringify` is not guaranteed to be deterministic
   *
   * @param {Function} hashFn A hash function for the object. Default JSON.stringify
   */
  uniq (hashFn) {
    return this._push({ type: LAZY_UNIQ, func: (hashFn || JSON.stringify) })
  }

  /**
   * Samples the sequence at the given probability
   * @param {Number} p Number between 0 and 1. Defaults to 0.5
   */
  sample (p) {
    p = p || 0.5
    return this.filter(n => Math.random() < p)
  }

  //////// Transformations ////////

  /**
   * Returns a new lazy object with results of the transformation
   * The entire sequence is realized.
   *
   * @param {Function} fn Tranform function of type (Array) => (Any)
   */
  transform (fn) {
    this._validate()
    let self = this
    let iter
    return layzee(() => {
      if (!iter) {
        iter = layzee(fn(self.value()))
      }
      return iter.next()
    })
  }

  /**
   * Returns a new lazy with items in reverse order.
   * The entire sequence is realized.
   */
  reverse () {
    return this.transform(xs => {
      xs.reverse()
      return xs
    })
  }

  /**
   * Returns a new lazy of sorted items
   * The entire sequence is realized.
   * @param {Function} cmp Comparator function. Default to standard comparison
   */
  sort (cmp) {
    return this.transform(xs => {
      xs.sort(cmp)
      return xs
    })
  }

  /**
   * Same as `sort` but with a user-supplied sort key
   * The entire sequence is realized.
   *
   * @param {Function} keyFn A function to return comparison key
   * @param {Function} cmp Comparator function. Defaults to stardard comparison
   */
  sortBy (keyFn, cmp) {
    cmp = cmp || compare
    let cmpFn = (a,b) => (a === b) ? 0 : cmp(keyFn(a), keyFn(b))
    return this.transform(xs => {
      xs.sort(cmpFn)
      return xs
    })
  }

  /**
   * Mark this lazy object to return only the first result.
   * No more iteratees or transformations can be added after this method is called.
   */
  one () {
    this.take(1)
    this.__only = true
    return this
  }

  ////////////////////////////////////////////////////////////////

  // Terminal methods

  /**
   * Returns the fully realized values of the iterators.
   * The return value will be an array unless `one()` was used.
   * The realized values are cached for subsequent calls
   */
  value () {
    if (!this.__done) {
      this.__done = this.next(this.__buf).done
    }
    return this.__only ? this.__buf[0] : this.__buf
  }

  /**
   * Execute the funcion for each value. Will stop when an execution returns false.
   * @param {Function} f
   * @returns {Boolean} false iff `f` return false for any execution, otherwise true
   */
  each (f) {
    while (1) {
      let o = this.next()
      if (o.done) break
      if (f(o.value) === false) return false
    }
    return true
  }

  /**
   * Returns the reduction of sequence according the reducing function
   *
   * @param {*} f a reducing function
   * @param {*} init
   */
  reduce (f, init) {

    let o = this.next()
    let i = 0

    if (init === undefined && !o.done) {
      init = o.value
      o = this.next()
      i++
    }

    while (!o.done) {
      init = f(init, o.value, i++)
      o = this.next()
    }

    return init
  }

  /**
   * Groups values according a key function
   * @param {Function} keyFn Grouping function. Must returns a value that can be used as key for an object
   */
  groupBy (keyFn) {
    return this.reduce((memo, o) => {
      let k = keyFn(o)
      if (!memo[k]) memo[k] = []
      memo[k].push(o)
      return memo
    }, {})
  }

  /**
   * Returns the number of matched items in the sequence
   */
  size () {
    return this.reduce((acc,n) => ++acc, 0)
  }

  /**
   * Returns the maximum value in the sequence
   * @param {Function} cmp Comparator function. Default comparison is used if empty
   */
  max (cmp) {
    cmp = cmp || compare
    return this.reduce((memo, n) => {
      return cmp(memo, n) > 0 ? memo : n
    })
  }

  /**
   * Returns the minimum value in the sequence
   * @param {Function} cmp Comparator function. Default comparison is used if empty
   */
  min (cmp) {
    cmp = cmp || compare
    return this.reduce((memo, n) => {
      return cmp(memo, n) < 0 ? memo : n
    })
  }

  /**
   * Partitions the iterator based on the predicate.
   * Truthy values at index 0 and falsey values at index 1
   * @param {Function} pred A predicate
   */
  partition (pred) {
    let o = this.groupBy(pred)
    return [ o['true'], o['false'] ]
  }
}
