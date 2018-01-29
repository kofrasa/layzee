// layzee.js 0.0.0
// Copyright (c) 2018 Francis Asante
// MIT
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.layzee = factory());
}(this, (function () { 'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

/**
 * Returns an iterator
 * @param {*} source An iterable source (Array, Function, Object{next:Function})
 */
function layzee(source) {
  return source instanceof Iterator ? source : new Iterator(source);
}

layzee.VERSION = '0.0.0';
layzee.isIterator = isIterable;
layzee.range = range;

var isArray = Array.isArray;

/**
 * Checks whether the given object is iterable
 * @param {*} o An object
 */
function isIterable(o) {
  return isArray(o) || !!o && (typeof o === 'undefined' ? 'undefined' : _typeof(o)) === 'object' && isFn(o.next);
}

/**
 * Return an iterator for range
 * @param {Number} start
 * @param {Number} end
 * @param {Number} step
 */
function range(start, end, step) {
  if (end === undefined) {
    end = start;
    start = 0;
  }
  if (!step) step = start < end ? 1 : -1;

  return layzee(function () {
    if (step > 0 && start < end || step < 0 && start > end) {
      var val = { value: start, done: false };
      start += step;
      return val;
    }
    return { done: true };
  });
}

// helpers
function compare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function isFn(f) {
  return !!f && typeof f === 'function';
}

function dropItem(array, i) {
  var rest = array.slice(i + 1);
  array.splice(i);
  Array.prototype.push.apply(array, rest);
}

// stop iteration error
var DONE = new Error();

// Lazy function type flags
var LAZY_MAP = 1;
var LAZY_FILTER = 2;
var LAZY_TAKE = 3;
var LAZY_TAKE_WHILE = 4;
var LAZY_DROP = 5;
var LAZY_DROP_WHILE = 6;
var LAZY_UNIQ = 7;

function baseIterator(nextFn, iteratees, buffer) {

  var done = false;
  var index = -1;
  var hashes = {}; // used for LAZY_UNIQ
  var bIndex = 0; // index for the buffer

  return function (b) {

    // special hack to collect all values into buffer
    b = b === buffer;

    try {

      outer: while (!done) {
        var o = nextFn();
        index++;

        var mIndex = -1;
        var mSize = iteratees.length;
        var innerDone = false;

        while (++mIndex < mSize) {
          var member = iteratees[mIndex],
              func = member.func,
              type = member.type;

          switch (type) {
            case LAZY_MAP:
              o = func(o, index);
              break;
            case LAZY_FILTER:
              if (!func(o, index)) continue outer;
              break;
            case LAZY_TAKE:
              --member.func;
              if (!member.func) innerDone = true;
              break;
            case LAZY_TAKE_WHILE:
              if (!func(o, index)) break outer;
              break;
            case LAZY_DROP:
              --member.func;
              if (!member.func) dropItem(iteratees, mIndex);
              continue outer;
            case LAZY_DROP_WHILE:
              if (func(o, index)) continue outer;
              dropItem(iteratees, mIndex);
              --mSize; // adjust size
              --mIndex;
              break;
            case LAZY_UNIQ:
              var k = func(o);
              if (hashes[k]) continue outer;
              hashes[k] = 1;
              break;
            default:
              break outer;
          }
        }

        done = innerDone;

        if (b) {
          buffer[bIndex++] = o;
        } else {
          return { value: o, done: false };
        }
      }
    } catch (e) {
      if (e !== DONE) throw e;
    }

    hashes = null; // clear the hash cache
    done = true;
    return { done: true };
  };
}

var Iterator = function () {
  /**
   * @param {*} source An iterable object or function.
   *    Array - return one element per cycle
   *    Object{next:Function} - call next() for the next value (this also handles generator functions)
   *    Function - call to return the next value
   * @param {Function} fn An optional transformation function
   */
  function Iterator(source) {
    classCallCheck(this, Iterator);

    this.__iteratees = []; // lazy function chain
    this.__only = false; // flag whether to return a single value
    this.__done = false;
    this.__buf = [];

    if (isFn(source)) source = { next: source };

    if (isArray(source)) {
      source = function (data) {
        var size = data.length;
        var index = 0;
        return function () {
          if (index < size) return data[index++];
          throw DONE;
        };
      }(source);
    } else if (isIterable(source)) {
      source = function (src) {
        return function () {
          var o = src.next();
          if (o.done) throw DONE;
          return o.value;
        };
      }(source);
    } else if (!isFn(source)) {
      throw new Error("Source is not iterable. Must be Array, Function or Object{next:Function}");
    }

    // create next function
    this.next = baseIterator(source, this.__iteratees, this.__buf);
  }

  createClass(Iterator, [{
    key: Symbol.iterator,
    value: function value() {
      return this;
    }
  }, {
    key: '_validate',
    value: function _validate() {
      if (this.__only) throw new Error("Cannot add iteratee/transform after `one()`");
    }

    /**
     * Add an iteratee to this lazy sequence
     * @param {Object} iteratee
     */

  }, {
    key: '_push',
    value: function _push(iteratee) {
      this._validate();
      this.__iteratees.push(iteratee);
      return this;
    }

    //// Iteratees methods //////

    /**
     * Transform each item in the sequence to a new value
     * @param {Function} f
     */

  }, {
    key: 'map',
    value: function map(f) {
      return this._push({ type: LAZY_MAP, func: f });
    }

    /**
     * Select only items matching the given predicate
     * @param {Function} pred
     */

  }, {
    key: 'filter',
    value: function filter(pred) {
      return this._push({ type: LAZY_FILTER, func: pred });
    }

    /**
     * Take given numbe for values from sequence
     * @param {Number} n A number greater than 0
     */

  }, {
    key: 'take',
    value: function take(n) {
      return n > 0 ? this._push({ type: LAZY_TAKE, func: n }) : this;
    }

    /**
     * Take items from the sequence while the predicate passes, otherwise end
     * @param {Function} pred
     */

  }, {
    key: 'takeWhile',
    value: function takeWhile(pred) {
      return this._push({ type: LAZY_TAKE_WHILE, func: pred });
    }

    /**
     * Drop a number of values from the sequence
     * @param {Number} n Number of items to drop greater than 0
     */

  }, {
    key: 'drop',
    value: function drop(n) {
      return n > 0 ? this._push({ type: LAZY_DROP, func: n }) : this;
    }

    /**
     * Drop values while predicate succeeds, otherwise return the rest of the sequence
     * @param {Function} pred Predicate function
     */

  }, {
    key: 'dropWhile',
    value: function dropWhile(pred) {
      return this._push({ type: LAZY_DROP_WHILE, func: pred });
    }

    /**
     * Returns only uniq values from the sequence.
     * The default hash function `JSON.stringify` is not guaranteed to be deterministic
     *
     * @param {Function} hashFn A hash function for the object. Default JSON.stringify
     */

  }, {
    key: 'uniq',
    value: function uniq(hashFn) {
      return this._push({ type: LAZY_UNIQ, func: hashFn || JSON.stringify });
    }

    /**
     * Samples the sequence at the given probability
     * @param {Number} p Number between 0 and 1. Defaults to 0.5
     */

  }, {
    key: 'sample',
    value: function sample(p) {
      p = p || 0.5;
      return this.filter(function (n) {
        return Math.random() < p;
      });
    }

    //////// Transformations ////////

    /**
     * Returns a new lazy object with results of the transformation
     * The entire sequence is realized.
     *
     * @param {Function} fn Tranform function of type (Array) => (Any)
     */

  }, {
    key: 'transform',
    value: function transform(fn) {
      this._validate();
      var self = this;
      var iter = void 0;
      return layzee(function () {
        if (!iter) {
          iter = layzee(fn(self.value()));
        }
        return iter.next();
      });
    }

    /**
     * Returns a new lazy with items in reverse order.
     * The entire sequence is realized.
     */

  }, {
    key: 'reverse',
    value: function reverse() {
      return this.transform(function (xs) {
        xs.reverse();
        return xs;
      });
    }

    /**
     * Returns a new lazy of sorted items
     * The entire sequence is realized.
     * @param {Function} cmp Comparator function. Default to standard comparison
     */

  }, {
    key: 'sort',
    value: function sort(cmp) {
      return this.transform(function (xs) {
        xs.sort(cmp);
        return xs;
      });
    }

    /**
     * Same as `sort` but with a user-supplied sort key
     * The entire sequence is realized.
     *
     * @param {Function} keyFn A function to return comparison key
     * @param {Function} cmp Comparator function. Defaults to stardard comparison
     */

  }, {
    key: 'sortBy',
    value: function sortBy(keyFn, cmp) {
      cmp = cmp || compare;
      var cmpFn = function cmpFn(a, b) {
        return a === b ? 0 : cmp(keyFn(a), keyFn(b));
      };
      return this.transform(function (xs) {
        xs.sort(cmpFn);
        return xs;
      });
    }

    /**
     * Mark this lazy object to return only the first result.
     * No more iteratees or transformations can be added after this method is called.
     */

  }, {
    key: 'one',
    value: function one() {
      this.take(1);
      this.__only = true;
      return this;
    }

    ////////////////////////////////////////////////////////////////

    // Terminal methods

    /**
     * Returns the fully realized values of the iterators.
     * The return value will be an array unless `one()` was used.
     * The realized values are cached for subsequent calls
     */

  }, {
    key: 'value',
    value: function value() {
      if (!this.__done) {
        this.__done = this.next(this.__buf).done;
      }
      return this.__only ? this.__buf[0] : this.__buf;
    }

    /**
     * Execute the funcion for each value. Will stop when an execution returns false.
     * @param {Function} f
     * @returns {Boolean} false iff `f` return false for any execution, otherwise true
     */

  }, {
    key: 'each',
    value: function each(f) {
      while (1) {
        var o = this.next();
        if (o.done) break;
        if (f(o.value) === false) return false;
      }
      return true;
    }

    /**
     * Returns the reduction of sequence according the reducing function
     *
     * @param {*} f a reducing function
     * @param {*} init
     */

  }, {
    key: 'reduce',
    value: function reduce(f, init) {

      var o = this.next();
      var i = 0;

      if (init === undefined && !o.done) {
        init = o.value;
        o = this.next();
        i++;
      }

      while (!o.done) {
        init = f(init, o.value, i++);
        o = this.next();
      }

      return init;
    }

    /**
     * Groups values according a key function
     * @param {Function} keyFn Grouping function. Must returns a value that can be used as key for an object
     */

  }, {
    key: 'groupBy',
    value: function groupBy(keyFn) {
      return this.reduce(function (memo, o) {
        var k = keyFn(o);
        if (!memo[k]) memo[k] = [];
        memo[k].push(o);
        return memo;
      }, {});
    }

    /**
     * Returns the number of matched items in the sequence
     */

  }, {
    key: 'size',
    value: function size() {
      return this.reduce(function (acc, n) {
        return ++acc;
      }, 0);
    }

    /**
     * Returns the maximum value in the sequence
     * @param {Function} cmp Comparator function. Default comparison is used if empty
     */

  }, {
    key: 'max',
    value: function max(cmp) {
      cmp = cmp || compare;
      return this.reduce(function (memo, n) {
        return cmp(memo, n) > 0 ? memo : n;
      });
    }

    /**
     * Returns the minimum value in the sequence
     * @param {Function} cmp Comparator function. Default comparison is used if empty
     */

  }, {
    key: 'min',
    value: function min(cmp) {
      cmp = cmp || compare;
      return this.reduce(function (memo, n) {
        return cmp(memo, n) < 0 ? memo : n;
      });
    }

    /**
     * Partitions the iterator based on the predicate.
     * Truthy values at index 0 and falsey values at index 1
     * @param {Function} pred A predicate
     */

  }, {
    key: 'partition',
    value: function partition(pred) {
      var o = this.groupBy(pred);
      return [o['true'], o['false']];
    }
  }]);
  return Iterator;
}();

return layzee;

})));
