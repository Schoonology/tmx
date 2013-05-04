var assert = require('assert')
  , fs = require('fs')
  , path = require('path')
  , util = require('util')
  , Writable = require('stream').Writable
  , tmx = require('../lib')
  , map = require('./fixtures/map')
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

// The mutilation required here is about the best indication of what features are supported. As new features are added,
// the Parser-supplied Objects will approach the same format as the Tiled-supplied JSON.
expected = {
  width: map.width,
  height: map.height,
  layers: map.layers.map(function (layer) {
    return {
      name: layer.name,
      width: layer.width,
      height: layer.height,
      data: layer.data
    }
  })
}

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
  assert.deepEqual(chunk, expected)
  callback()
}

inputs.forEach(function (input) {
  fs.createReadStream(input)
    .pipe(tmx.createParser({
      objectMode: true
    }))
    .pipe(new Test())
})
