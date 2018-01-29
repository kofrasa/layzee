var Lazy = require('../dist/layzee')
var test = require('tape')

var DATA = [1,2,3,4,5,6,7,8,9]

function newLazy() {
  return Lazy(DATA)
}

function isEven (o) {
  return o % 2 === 0
}

test('Iterator tests', function (t) {

  var fixtures = [
    [ newLazy().map(n => n*3), [3, 6, 9, 12, 15, 18, 21, 24, 27], "can map" ],
    [ newLazy().filter(isEven), [2,4,6,8], "can filter" ],
    [ newLazy().drop(3), [4,5,6,7,8,9], "can skip with number" ],
    [ newLazy().take(3), [1,2,3], "can take with number"],
    [ newLazy().dropWhile(n => n < 5), [5,6,7,8,9], "can skip with predicate" ],
    [ newLazy().takeWhile(n => n < 5), [1,2,3,4], "can take with predicate"],
    [ newLazy().reverse().take(3), [9,8,7], "can reverse" ],
    [ newLazy().reverse().take(3).sort(), [7,8,9], "can sort" ],
    [ newLazy().reverse().take(3).sortBy(n => n % 3), [9,7,8], "can sortBy" ],
    [ Lazy([1,2,3,4,3,1,2,"1"]).uniq(), [1,2,3,4,"1"], "can find uniq values" ],
    [ Lazy.range(1,10), DATA, "can range from start to end" ],
    [ Lazy.range(5), [0,1,2,3,4], "can range with only end value" ],
    [ Lazy.range(0, 10, 2), [0,2,4,6,8], "can range with increment" ],
    [ Lazy.range(10, 5, -2), [10,8,6], "can range with decrement" ],
    [ Lazy.range(0, Infinity, -2), [], "can detect invalid range with decrement" ],
    [ Lazy.range(Infinity, 0, 5), [], "can detect invalid range with increment" ]
  ]

  fixtures.forEach(n => {
    t.deepEqual(n[0].value(), n[1], n[2])
  })

  // terminal method tests
  t.equal(newLazy().reduce((acc,n) => acc+n), 45, "can reduce")

  var arr = []
  newLazy().each(o => arr.push(o%2))
  t.deepEqual(arr, [1,0,1,0,1,0,1,0,1], "can iterate with each")

  var sample = newLazy().sample().value()
  t.ok(sample.length > 0, "sample must be non-zero")
  t.ok(sample.length < DATA.length, "sample must be less than DATA length")
  t.deepEqual(newLazy().size(), DATA.length, "can count sequence")
  t.deepEqual(newLazy().max(), 9, "can find max value")
  t.deepEqual(newLazy().min(), 1, "can find min value")
  t.deepEqual(newLazy().partition(isEven), [ [2,4,6,8], [1,3,5,7,9] ], 'can create partition')
  t.deepEqual(Lazy(['big', 'bad', 'wolf']).groupBy(o => o.length), { 3: ['big', 'bad'], 4: ['wolf'] }, "can groupBy")

  function* genEven () {
    let i = 0
    while (i % 2 === 0) {
      i += 2
      yield i
    }
  }

  let even10 = Lazy(genEven()).take(5)
  t.deepEqual(even10.value(), [2,4,6,8,10], "can use generator function")

  t.end()
})

// command: for i in `seq 3`; do time tape test/**/*.js >/dev/null; done