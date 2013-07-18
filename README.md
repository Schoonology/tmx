# TMX

A simple-to-use, simple-to-understand, streams-based TMX parser.

## Installation

    npm install tmx

## Usage

The `tmx` library exports a single class, `Parser`, along with a factory function for objects of the same type,
`createParser`. This parser is a Transform stream that accepts TMX content (e.g. from a file stream) and provides JSON
representing the map contents.

## Example

This example prints the JSON received from the TMX parser to stdout.

    var fs = require('fs')
      , tmx = require('tmx')

    fs.createReadStream('my_map.tmx')
      .pipe(tmx.createParser())
      .pipe(process.stdout)

## Output

The chunks received from the Parser are _always_ the complete JSON chunk for that map, not individual bytes (i.e. the
stream is perpetually in some form of "object mode"). If the stream is explicitly configured with `objectMode: true`
during construction, all downstream reads will receive vanilla Objects; otherwise, only JSON strings will be produced.

This output JSON contains the following properties describing the map itself:

 * `width` - The width of the map, in tiles, as a Number.
 * `height` - The height of the map, in tiles, as a Number.
 * `layers` - An Array of Layers (described below).

Each Layer, then, contains only the tiles located within that Layer:

 * `width` - The width of the Layer, in tiles, as a Number.
 * `height` - The height of the Layer, in tiles, as a Number.
 * `name` - The name of the Layer, as a String.
 * `data` - An array of Tile IDs.

## TODO

 * Extract more metadata from the TMX file
 * Support knowledge of tilesets both within a TMX file and exported from TSX files.

## License

    Copyright (C) 2013 Michael Schoonmaker (michael.r.schoonmaker@gmail.com)

    This project is free software released under the MIT/X11 license:

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
