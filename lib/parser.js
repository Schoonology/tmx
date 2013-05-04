//
// # Parser
//
// Stream responsible for parsing TMX-formatted data, emitting Objects as results.
//
var Transform = require('stream').Transform
  , util = require('util')
  , zlib = require('zlib')
  , sax = require('sax')

if (!Transform) {
  Transform = require('readable-stream/transform')
}

//
// ## Parser `Parser(obj)`
//
// Creates a new instance of Parser with similar options to `stream.Transform`. However, keep in mind that Parser
// streams will _always_ be in `objectMode`.
//
function Parser(obj) {
  if (!(this instanceof Parser)) {
    return new Parser(obj)
  }

  obj = obj || {}

  Transform.call(this, obj)

  this.objectMode = !!obj.objectMode

  this._sax = null
  this._callback = null
  this._encoding = null
  this._compression = null
  this._pendingInflates = 0
  this.tiles = []

  this._initSax()
}
util.inherits(Parser, Transform)
Parser.createParser = Parser

//
// ## _transform `_transform(chunk, encoding, callback)`
//
// See `stream.Transform._transform`.
//
Parser.prototype._transform = _transform
function _transform(chunk, encoding, callback) {
  var self = this

  if (typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding)
  }

  self._callback = callback
  self._sax.write(chunk)

  // sax.write is synchronous, and we clear out `_callback` if it fails. If it still exists, we were successful.
  if (self._callback && self._pendingInflates === 0) {
    self._callback()
  }

  return self
}

//
// ## _flush `_flush(callback)`
//
// See `stream.Transform._flush`.
//
Parser.prototype._flush = _flush
function _flush(callback) {
  var self = this

  self._sax.end()
  callback()

  return self
}

//
// ## _initSax `_initSax()`
//
// Internal use only.
//
// Initializes the internal Sax stream.
//
Parser.prototype._initSax = _initSax
function _initSax() {
  var self = this

  self._sax = sax.createStream(true, {
    trim: true,
    position: false
  })

  self._sax.on('opentag', function (node) {
    switch (node.name) {
      case 'data':
        self._encoding = node.attributes.encoding || null
        self._compression = node.attributes.compression || null
        break
      case 'tile':
        self.tiles.push(node.attributes.gid)
        break
    }
  })
  self._sax.on('text', function (text) {
    self._pendingInflates++
    self._inflateText(text, function (err) {
      self._pendingInflates--

      if (err) {
        self._error(err)
      }
    })
  })
  self._sax.on('error', function (err) {
    self._error(err)
  })
  self._sax.on('end', function () {
    if (self.objectMode) {
      self.push({
        tiles: self.tiles
      })
    } else {
      self.push(console.log(JSON.stringify({
        tiles: self.tiles
      })))
    }
    self.end()
  })

  return self
}

//
// ## _inflateText `_inflateText(text, callback)`
//
// Internal use only.
//
// Inflates and loads GIDs from **text** from a `data` text node, calling **callback** once complete or with an error.
//
Parser.prototype._inflateText = _inflateText
function _inflateText(text, callback) {
  var self = this

  function inflated(err, text) {
    if (err) {
      callback(err)
      return
    }

    self._loadGids(text)
  }

  if (self._encoding === 'csv') {
    process.nextTick(function () {
      inflated(null, text)
    })
    return
  }

  text = new Buffer(text, self._encoding)

  switch (self._compression) {
    case 'zlib':
      zlib.inflate(text, inflated)
      break
    case 'gzip':
      zlib.gunzip(text, inflated)
      break
    case null:
      process.nextTick(function () {
        inflated(null, text)
      })
      break
    default:
      callback(new Error('Invalid compression type: ' + self._compression))
  }

  return self
}

//
// ## _loadGids `_loadGids(buf)`
//
// Internal use only.
//
// Synchronously loads all GIDs from the inflated **buf**.
//
Parser.prototype._loadGids = _loadGids
function _loadGids(buf) {
  var self = this

  if (self._encoding === 'csv') {
    String(buf).split(',').forEach(function (i) {
      self.tiles.push(parseInt(i, 10))
    })
  } else {
    for (var i = 0, len = buf.length / 4; i < len; i++) {
      self.tiles.push(buf.readUInt32LE(i * 4))
    }
  }

  return self
}

//
// ## _error `_error(err)`
//
// Internal use only.
//
// Fails the current parse operation (if any) and clears out `_callback` to indicate said failure to the rest of the
// Parser.
//
Parser.prototype._error = _error
function _error(err) {
  var self = this

  if (!self._callback) {
    return
  }

  self._callback(err)
  self._callback = null

  return self
}

module.exports = Parser
