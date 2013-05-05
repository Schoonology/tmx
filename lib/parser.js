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

  this.width = 0
  this.height = 0
  this.layers = []

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
      case 'map':
        self.width = node.attributes.width || 0
        self.height = node.attributes.height || 0
        break
      case 'layer':
        self._addLayer(node.attributes)
        break
      case 'data':
        self._encoding = node.attributes.encoding || null
        self._compression = node.attributes.compression || null
        break
      case 'tile':
        self._addTile(node.attributes.gid)
        break
    }
  })

  self._sax.on('text', function (text) {
    self._pendingInflates++
    self._inflateText(text, function (err) {
      self._pendingInflates--

      if (err) {
        self._error(err)
      } else if (self._pendingInflates === 0 && self._callback) {
        self._callback()
      }
    })
  })

  self._sax.on('error', function (err) {
    self._error(err)
  })

  self._sax.on('end', function () {
    if (self.objectMode) {
      self.push(self.toJSON())
    } else {
      self.push(JSON.stringify(self))
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
// Inflates and loads GIDs from **text** from a `data` text node into the currently-topmost Layer, calling **callback**
// once complete or with an error.
//
Parser.prototype._inflateText = _inflateText
function _inflateText(text, callback) {
  var self = this
    , layer = self.layers.length - 1

  function inflated(err, text) {
    if (err) {
      callback(err)
      return
    }

    self._loadGids(text, layer)
    callback()
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
// ## _loadGids `_loadGids(buf, layer)`
//
// Internal use only.
//
// Synchronously loads all GIDs from the inflated **buf** into **layer**.
//
Parser.prototype._loadGids = _loadGids
function _loadGids(buf, layer) {
  var self = this

  if (self._encoding === 'csv') {
    String(buf).split(',').forEach(function (i) {
      self._addTile(parseInt(i, 10), layer)
    })
  } else {
    for (var i = 0, len = buf.length / 4; i < len; i++) {
      self._addTile(buf.readUInt32LE(i * 4), layer)
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

//
// ## _addLayer `_addLayer(obj)`
//
// Internal use only.
//
// Synchronously adds a new Layer as the new topmost Layer, copying relevant attributes from **obj**.
//
Parser.prototype._addLayer = _addLayer
function _addLayer(obj) {
  var self = this

  self.layers.push({
    name: obj.name,
    width: obj.width || 0,
    height: obj.height || 0,
    data: []
  })

  return self
}

//
// ## _addTile `_addTile(gid, layer)`
//
// Internal use only.
//
// Synchronously adds **gid** to **layer**.
//
Parser.prototype._addTile = _addTile
function _addTile(gid, layer) {
  var self = this

  self.layers[layer].data.push(Number(gid))

  return self
}

//
// ## toJSON `toJSON()`
//
Parser.prototype.toJSON = toJSON
function toJSON() {
  var self = this

  return {
    width: self.width,
    height: self.height,
    layers: self.layers
  }
}

module.exports = Parser
