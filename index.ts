
// Generic callback
export interface Callback<T> {
  (...args: any): T
}

// Generic predicate
export interface Predicate<T> {
  (...args: T[]): boolean
}

// Result of comparator function
type CompareResult = -1 | 0 | 1

// Generic comparator callback
export interface Comparator<T> {
  (left: T, right: T): CompareResult
}

interface Iteratee {
  action: Action
  value: any
}

/**
 * Simplified generator interface
 */
interface Generator<T> {
  next: Callback<T>
}

/**
 * A value produced by a generator
 */
interface Value {
  value?: any
  done: boolean
}

export type Source = Generator<any> | Callback<any> | Array<any>

/**
 * A wrapper for creating an iterator from an array, generator, or generator function
 * @param {*} source An iterable source (Array, Function, Generator, or Iterator)
 */
export function Lazy(source: Source): Iterator {
  return (source instanceof Iterator) ? source : new Iterator(source)
}

/**
 * Generates a lazy sequence of numbers. Sequence starts from zero if end and step are not given.
 *
 * @param {Number} begin
 * @param {Number} end
 * @param {Number} step
 */
export function range(begin: number, end?: number, step?: number) {
  if (end === undefined) {
    end = begin
    begin = 0
  }
  if (step === undefined) step = begin < end ? 1 : -1

  return Lazy(() => {
    if (step > 0 && begin < end || step < 0 && begin > end) {
      let val = { value: begin, done: false }
      begin += step
      return val
    }
    return { done: true }
  })
}

/**
 * Checks whether the given object is compatible with a generator i.e Object{next:Function}
 * @param {*} o An object
 */
function isGenerator(o: any) {
  return !!o && typeof o === 'object' && o.next instanceof Function
}

function removeIndex(array: any[], i: number) {
  let head = array.slice(0, i)
  let rest = array.slice(i + 1)
  return head.concat(rest)
}

function compare<T>(a: T, b: T): CompareResult {
  return a < b ? -1 : (a > b ? 1 : 0)
}

// stop iteration error
const DONE = new Error()

// Lazy function actions
enum Action {
  MAP,
  FILTER,
  TAKE,
  TAKE_WHILE,
  DROP,
  DROP_WHILE,
  UNIQ
}

function createCallback(nextFn: Callback<any>, iteratees: Iteratee[], buffer: any[]): Callback<Value> {

  let done = false
  let index = -1
  let bufferIndex = 0 // index for the buffer
  let memo = {}

  return function (storeResult?: boolean): Value {

    // special hack to collect all values into buffer
    try {

      outer: while (!done) {
        let o = nextFn()
        index++

        let i = -1
        let innerDone = false

        while (++i < iteratees.length) {
          let r = iteratees[i]

          switch (r.action) {
            case Action.MAP:
              o = r.value(o, index)
              break
            case Action.FILTER:
              if (!r.value(o, index)) continue outer
              break
            case Action.TAKE:
              --r.value
              if (!r.value) innerDone = true
              break
            case Action.TAKE_WHILE:
              if (!r.value(o, index)) break outer
              break
            case Action.DROP:
              --r.value
              if (!r.value) iteratees = removeIndex(iteratees, i)
              continue outer
            case Action.DROP_WHILE:
              if (r.value(o, index)) continue outer
              iteratees = removeIndex(iteratees, i--)
              break
            case Action.UNIQ:
              let k = r.value(o)
              if (memo[k]) continue outer
              memo[k] = 1
              break
            default:
              break outer
          }
        }

        done = innerDone

        if (storeResult) {
          buffer[bufferIndex++] = o
        } else {
          return { value: o, done: false }
        }
      }
    } catch (e) {
      if (e !== DONE) throw e
    }

    done = true
    return { done }
  }
}

/**
 * An iterator encapsulates a lazy sequence
 */
export class Iterator {

  private __iteratees: Iteratee[] // lazy function chain
  private __first: boolean // flag whether to return a single value
  private __done: boolean
  private __buf: any[]
  private __next: Callback<Value>

  /**
   * @param {*} source An iterable object or function.
   * @param {Function} fn An optional transformation function
   */
  constructor(source: Source) {
    this.__iteratees = [] // lazy function chain
    this.__first = false // flag whether to return a single value
    this.__done = false
    this.__buf = []

    let nextVal: Callback<any>

    if (source instanceof Function) {
      // make iterable
      source = { next: source }
    }

    if (isGenerator(source)) {
      const src = source as Generator<any>
      nextVal = () => {
        let o = src.next()
        if (o.done) throw DONE
        return o.value
      }
    } else if (source instanceof Array) {
      const data = source
      const size = data.length
      let index = 0
      nextVal = () => {
        if (index < size) return data[index++]
        throw DONE
      }
    } else if (!(source instanceof Function)) {
      throw new Error("Source is not iterable. Must be Array, Function, or Generator")
    }

    // create next function
    this.__next = createCallback(nextVal, this.__iteratees, this.__buf)
  }

  private _validate() {
    if (this.__first) throw new Error("Cannot add iteratee/transform after `first()`")
  }

  /**
   * Add an iteratee to this lazy sequence
   * @param {Object} iteratee
   */
  private _push(action: Action, value: any) {
    this._validate()
    this.__iteratees.push({ action, value })
    return this
  }

  next(): Value {
    return this.__next()
  }

  // Iteratees methods

  /**
   * Transform each item in the sequence to a new value
   * @param {Function} f
   */
  map(f: Callback<any>): Iterator {
    return this._push(Action.MAP, f)
  }

  /**
   * Select only items matching the given predicate
   * @param {Function} pred
   */
  filter(predicate: Predicate<any>): Iterator {
    return this._push(Action.FILTER, predicate)
  }

  /**
   * Take given numbe for values from sequence
   * @param {Number} n A number greater than 0
   */
  take(n: number): Iterator {
    return n > 0 ? this._push(Action.TAKE, n) : this
  }

  /**
   * Drop a number of values from the sequence
   * @param {Number} n Number of items to drop greater than 0
   */
  drop(n: number): Iterator {
    return n > 0 ? this._push(Action.DROP, n) : this
  }

  /**
   * Take items from the sequence while the predicate passes, otherwise end
   * @param {Function} pred
   */
  takeWhile(pred: Predicate<any>): Iterator {
    return this._push(Action.TAKE_WHILE, pred)
  }

  /**
   * Drop values while predicate succeeds, otherwise return the rest of the sequence
   * @param {Function} pred Predicate function
   */
  dropWhile(pred: Predicate<any>): Iterator {
    return this._push(Action.DROP_WHILE, pred)
  }

  /**
   * Returns only uniq values from the sequence.
   * The default hash function `JSON.stringify` is not guaranteed to be deterministic
   *
   * @param {Function} hashFn A hash function for the object. Default JSON.stringify
   */
  uniq(hashFn?: Callback<any>): Iterator {
    return this._push(Action.UNIQ, hashFn || JSON.stringify)
  }

  /**
   * Samples the sequence at the given probability
   * @param {Number} p Number between 0 and 1. Defaults to 0.5
   */
  sample(p?: number): Iterator {
    p = p || 0.5
    return this.filter(_ => Math.random() < p)
  }

  // Transformations

  /**
   * Returns a new lazy object with results of the transformation
   * The entire sequence is realized.
   *
   * @param {Function} fn Tranform function of type (Array) => (Any)
   */
  transform(fn: Callback<any>): Iterator {
    this._validate()
    let self = this
    let iter: Iterator
    return Lazy(() => {
      if (!iter) {
        iter = Lazy(fn(self.value()))
      }
      return iter.next()
    })
  }


  /**
   * Returns a new lazy with items in reverse order.
   * The entire sequence is realized.
   */
  reverse(): Iterator {
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
  sort<T>(cmp?: Comparator<T>): Iterator {
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
  sortBy<T>(keyFn: Callback<T>, cmp?: Comparator<T>): Iterator {
    cmp = cmp || compare
    let cmpFn = (a: T, b: T) => cmp(keyFn(a), keyFn(b))
    return this.transform(xs => {
      xs.sort(cmpFn)
      return xs
    })
  }

  /**
   * Mark this lazy object to return only the first result on `lazy.value()`.
   * No more iteratees or transformations can be added after this method is called.
   */
  first(): Iterator {
    this.take(1)
    this.__first = true
    return this
  }

  // Terminal methods

  /**
   * Returns the fully realized values of the iterators.
   * The return value will be an array unless `lazy.first()` was used.
   * The realized values are cached for subsequent calls
   */
  value(): any {
    if (!this.__done) {
      this.__done = this.__next(true).done
    }
    return this.__first ? this.__buf[0] : this.__buf
  }

  /**
   * Execute the funcion for each value. Will stop when an execution returns false.
   * @param {Function} f
   * @returns {Boolean} false iff `f` return false for any execution, otherwise true
   */
  each(f: Callback<any>): boolean {
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
  reduce<T>(f: Callback<any>, initialValue: T): any {

    let o = this.next()
    let i = 0

    if (initialValue === undefined && !o.done) {
      initialValue = o.value
      o = this.next()
      i++
    }

    while (!o.done) {
      initialValue = f(initialValue, o.value, i++)
      o = this.next()
    }

    return initialValue
  }


  /**
   * Groups values according a key function
   * @param {Function} keyFn Grouping function. Must returns a value that can be used as key for an object
   */
  groupBy<T>(keyFn: Callback<T>): any {
    return this.reduce((memo, o) => {
      let k = keyFn(o)
      if (!memo[k]) memo[k] = []
      memo[k].push(o)
      return memo
    }, {})
  }

  /**
   * Partitions the iterator based on the predicate.
   * Truthy values are at index 0 and falsey values are at index 1
   * @param {Function} pred A predicate
   */
  partition<T>(pred: Predicate<T>): Array<Array<T>> {
    let o = this.groupBy(pred)
    return [ o['true'] || [], o['false'] || [] ]
  }

  /**
   * Returns the number of matched items in the sequence
   */
  size(): number {
    return this.reduce((acc: number, _: number) => ++acc, 0)
  }
}

if (typeof Symbol === 'function') {
  Iterator.prototype[Symbol.iterator] = function () {
    return this
  }
}


// add range to lazy function
Lazy.range = range

export default Lazy