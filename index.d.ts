interface Callback<T> {
    (...args: any): T;
}
interface Predicate<T> {
    (...args: T[]): boolean;
}
declare type CompareResult = -1 | 0 | 1;
interface Comparator<T> {
    (left: T, right: T): CompareResult;
}
/**
 * Simplified generator interface
 */
interface Generator<T> {
    next: Callback<T>;
}
/**
 * A value produced by a generator
 */
interface Value {
    value?: any;
    done: boolean;
}
declare type Source = Generator<any> | Callback<any> | Array<any>;
/**
 * A wrapper for creating an iterator from an array, generator, or generator function
 * @param {*} source An iterable source (Array, Function, Generator, or Iterator)
 */
declare function Lazy(source: Source): Iterator;
declare namespace Lazy {
    var range: (begin: number, end?: number, step?: number) => Iterator;
}
/**
 * A lazy collection iterator yields a single value at time upon request
 */
declare class Iterator {
    private __iteratees;
    private __first;
    private __done;
    private __buf;
    private __next;
    /**
     * @param {*} source An iterable object or function.
     *    Array - return one element per cycle
     *    Object{next:Function} - call next() for the next value (this also handles generator functions)
     *    Function - call to return the next value
     * @param {Function} fn An optional transformation function
     */
    constructor(source: Source);
    private _validate;
    /**
     * Add an iteratee to this lazy sequence
     * @param {Object} iteratee
     */
    private _push;
    next(): Value;
    /**
     * Transform each item in the sequence to a new value
     * @param {Function} f
     */
    map(f: Callback<any>): Iterator;
    /**
     * Select only items matching the given predicate
     * @param {Function} pred
     */
    filter(predicate: Predicate<any>): Iterator;
    /**
     * Take given numbe for values from sequence
     * @param {Number} n A number greater than 0
     */
    take(n: number): Iterator;
    /**
     * Drop a number of values from the sequence
     * @param {Number} n Number of items to drop greater than 0
     */
    drop(n: number): Iterator;
    /**
     * Take items from the sequence while the predicate passes, otherwise end
     * @param {Function} pred
     */
    takeWhile(pred: Predicate<any>): Iterator;
    /**
     * Drop values while predicate succeeds, otherwise return the rest of the sequence
     * @param {Function} pred Predicate function
     */
    dropWhile(pred: Predicate<any>): Iterator;
    /**
     * Returns only uniq values from the sequence.
     * The default hash function `JSON.stringify` is not guaranteed to be deterministic
     *
     * @param {Function} hashFn A hash function for the object. Default JSON.stringify
     */
    uniq(hashFn?: Callback<any>): Iterator;
    /**
     * Samples the sequence at the given probability
     * @param {Number} p Number between 0 and 1. Defaults to 0.5
     */
    sample(p?: number): Iterator;
    /**
     * Returns a new lazy object with results of the transformation
     * The entire sequence is realized.
     *
     * @param {Function} fn Tranform function of type (Array) => (Any)
     */
    transform(fn: Callback<any>): Iterator;
    /**
     * Returns a new lazy with items in reverse order.
     * The entire sequence is realized.
     */
    reverse(): Iterator;
    /**
     * Returns a new lazy of sorted items
     * The entire sequence is realized.
     * @param {Function} cmp Comparator function. Default to standard comparison
     */
    sort<T>(cmp?: Comparator<T>): Iterator;
    /**
     * Same as `sort` but with a user-supplied sort key
     * The entire sequence is realized.
     *
     * @param {Function} keyFn A function to return comparison key
     * @param {Function} cmp Comparator function. Defaults to stardard comparison
     */
    sortBy<T>(keyFn: Callback<T>, cmp?: Comparator<T>): Iterator;
    /**
     * Mark this lazy object to return only the first result on `lazy.value()`.
     * No more iteratees or transformations can be added after this method is called.
     */
    first(): Iterator;
    /**
     * Returns the fully realized values of the iterators.
     * The return value will be an array unless `lazy.first()` was used.
     * The realized values are cached for subsequent calls
     */
    value(): any;
    /**
     * Execute the funcion for each value. Will stop when an execution returns false.
     * @param {Function} f
     * @returns {Boolean} false iff `f` return false for any execution, otherwise true
     */
    each(f: Callback<any>): boolean;
    /**
     * Returns the reduction of sequence according the reducing function
     *
     * @param {*} f a reducing function
     * @param {*} init
     */
    reduce<T>(f: Callback<any>, initialValue: T): any;
    /**
     * Groups values according a key function
     * @param {Function} keyFn Grouping function. Must returns a value that can be used as key for an object
     */
    groupBy<T>(keyFn: Callback<T>): any;
    /**
     * Partitions the iterator based on the predicate.
     * Truthy values are at index 0 and falsey values are at index 1
     * @param {Function} pred A predicate
     */
    partition<T>(pred: Predicate<T>): Array<Array<T>>;
    /**
     * Returns the number of matched items in the sequence
     */
    size(): number;
}
export default Lazy;
