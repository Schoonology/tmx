var assert = require('assert')
  , fs = require('fs')
  , path = require('path')
  , util = require('util')
  , Writable = require('stream').Writable
  , tmx = require('../lib')
  , inputs
  , expected

if (!Writable) {
  Writable = require('readable-stream/writable')
}

inputs = [
  'xml.tmx',
  'csv.tmx',
  'base64.tmx',
  'zlib.tmx',
  'gzip.tmx',
]
expected = [
  10,10,10,10,10,10,10,10,10,10,
  10,20,18,18,18,18,18,18,21,10,
  10,11,30,25,26,26,27,30,9,10,
  10,11,30,33,36,37,35,30,9,10,
  10,11,30,33,44,45,35,30,9,10,
  10,11,30,41,42,42,43,30,9,10,
  10,11,30,30,30,30,30,30,9,10,
  10,11,30,30,30,30,30,30,9,10,
  10,28,2,2,2,2,2,2,29,10,
  10,10,10,10,10,10,10,10,10,10,
  0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,38,0,0,
  0,0,32,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,46,0,0,
  0,0,0,0,0,0,0,0,0,0,
  0,0,47,0,0,40,0,0,0,0,
  0,0,0,0,32,0,0,39,0,0,
  0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0
]

inputs = inputs.map(function (input) {
  return path.resolve(path.dirname(module.filename), 'fixtures', input)
})

function Test() {
  Writable.call(this, {
    objectMode: true
  })
}
util.inherits(Test, Writable)

Test.prototype._write = function _write(chunk, encoding, callback) {
  assert(typeof chunk === 'object', 'Invalid "chunk":' + JSON.stringify(chunk))
  assert(Array.isArray(chunk.tiles), 'Invalid "chunk":' + JSON.stringify(chunk))

  assert(chunk.tiles.length === expected.length, 'Wrong sized chunk:' + chunk.tiles.length + ' vs ' + expected.length)

  chunk.tiles.forEach(function (gid, index) {
    assert.equal(gid, expected[index], 'Index mismatch: ' + index)
  })
  callback()
}

inputs.forEach(function (input) {
  fs.createReadStream(input)
    .pipe(tmx.createParser({
      objectMode: true
    }))
    .pipe(new Test())
})
