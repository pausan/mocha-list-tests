# mocha-list-tests

List all mocha suites and tests without running anything.

This is a standalone mocha-compatible companion, with no dependencies (not even mocha), to get a parseable json list of all suites and tests that would be executed in a folder.

The purpose of listing suites/tests might differ from project to project. I wanted it in order to parallelize some integration tests across multiple machines.

This script would be useful as long as this functionality is not included in mocha itself. At the time of this writing (2018), there seems to be no motivation to do so, since a patch was submitted in the past and rejected.

## Install

```sh
  npm install --save-dev mocha-list-tests
```

## Usage

### Programmatically (require)

```javascript
let mochaListTests = require('mocha-list-tests')
let result = mochaListTests.findSuitesAndTests ('./test-folder/')

console.log (result.suites)
console.log (result.tests)
console.log (result.tree)
```

### Command-line interface (shell)

To get a list of all suites and tests, just run:

```sh
  node ./node_modules/mocha-list-tests/mocha-list-tests.js your-test-dir/
```

## License

Copyright 2018 Pau Sanchez

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
