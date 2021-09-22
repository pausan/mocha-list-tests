// -----------------------------------------------------------------------------
// mocha-list-tests
//
// Copyright(c) 2018-2021 Pau Sanchez
//
// MIT Licensed
// -----------------------------------------------------------------------------
'use strict'

const fs = require('fs')
const path = require('path')
const process = require('process')

// -----------------------------------------------------------------------------
// lookupFiles
//
// Lookup file names at the given `path`.
//
// @param {string} filepath Base path to start searching from.
// @param {string[]} extensions File extensions to look for.
// @param {boolean} recursive Whether or not to recurse into subdirectories.
// @return {string[]} An array of paths.
// -----------------------------------------------------------------------------
function lookupFiles(filepath, extensions, recursive) {
  var files = []

  if (!fs.existsSync(filepath)) {
    if (fs.existsSync(filepath + '.js')) {
      filepath += '.js'
    } else if (fs.existsSync(filepath + '.mjs')) {
      filepath += '.mjs'
    } else {
      throw new Error("cannot resolve path (or pattern) '" + filepath + "'")
    }
  }

  try {
    var stat = fs.statSync(filepath)
    if (stat.isFile()) {
      return [filepath]
    }
  } catch (err) {
    // ignore error
    return []
  }

  const childFiles = fs.readdirSync(filepath)

  for (let i = 0; i < childFiles.length; i++) {
    const file = path.join(filepath, childFiles[i])
    try {
      var stat = fs.statSync(file)
      if (stat.isDirectory()) {
        if (recursive) {
          files = files.concat(lookupFiles(file, extensions, recursive))
        }
        continue
      }
    } catch (err) {
      // ignore error
      continue
    }
    var re = new RegExp('\\.(?:' + extensions.join('|') + ')$')
    if (!stat.isFile() || !re.test(file) || path.basename(file)[0] === '.') {
      continue
    }
    files.push(file)
  }

  return files
}

// -----------------------------------------------------------------------------
// Some global variables. Yes, this is dirty, but given the simplicity of this
// script it is not worth to encapsulate it. If this grows further and you are
// reading this, please create a class to encapsulate all these variables.
//
// Objects are used to avoid key duplicates when programmatically declaring
// suites/tests.
// -----------------------------------------------------------------------------
let tests = {}
let suites = {}
let tree = {}
let testRoute = []
const directoryPrefix = process.cwd() + path.sep

// -----------------------------------------------------------------------------
// addTestRouteToTree
//
// Helper function to capture test routes as a tree, which might be more
// convenient sometimes.
// -----------------------------------------------------------------------------
function addTestRouteToTree(testRoute, testType, name) {
  let fileNameAndLine = 'unknown:0'

  try {
    const stackTrace = { name: 'Stacktrace' }
    Error.captureStackTrace(stackTrace, addTestRouteToTree)
    const frames = stackTrace.stack.split('\n')
    const line = frames[2].replace('file://', '')

    //  at Object.<anonymous> (file:///home/whatever/github/mocha-list-tests/test/example.mjs:56:12)
    //  at file:///home/whatever/github/mocha-list-tests/test/example.mjs:51:1
    const matches = line.match(/^(?:.*\((.*):\d+\)|.*\s+at\s+(\/.*?):\d+)$/)
    if (matches)
      fileNameAndLine = (matches[1] || matches[2]).replace(directoryPrefix, '')
  } catch (e) {
    // ignore unknown errors
  }

  let newTestRoute = testRoute.slice(0) // clone
  newTestRoute.push(name)

  let root = tree
  for (let i = 0; i < newTestRoute.length; i++) {
    const current = newTestRoute[i]

    // hack to initialize to empty object or true for leafs and be prepared
    // to override a leaf with an object.
    if (!(current in root) || typeof root[current] == 'string') {
      if (i + 1 == newTestRoute.length)
        root[current] = {
          type: testType,
          file: fileNameAndLine.split(':')[0],
          line: parseInt(fileNameAndLine.split(':')[1], 10),
          children: {},
        }
      else root[current] = {}
    }
    root = root[current].children
  }
}

// -----------------------------------------------------------------------------
// captureDescribeFunctions
//
// Helper function to capture to capture all 'describe' calls and add them to
// our internal list of suites.
//
// NOTE: async suites are only used because 'it' cases need to have async
//       methods... and since we are not running 'it' methods, they can
//       be safely be executed as normal methods.
// -----------------------------------------------------------------------------
function captureDescribeFunctions(testType) {
  return function captureDescribe(suiteName, suite) {
    addTestRouteToTree(testRoute, testType, suiteName)

    testRoute.push(suiteName)
    suites[testRoute.join('.')] = true

    // define methods that can be used inside describe using this
    suite.apply({
      timeout: () => {},
      slow: () => {},
      retries: () => {},
    })
    testRoute.pop()
  }
}

// -----------------------------------------------------------------------------
// captureItFunctions
//
// Helper function to captures all 'it' calls and add them to our internal
// list of tests
// -----------------------------------------------------------------------------
function captureItFunctions(testType) {
  return function captureIt(testName, ignoreFunction) {
    addTestRouteToTree(testRoute, testType, testName)

    tests[(testRoute.join('.') + '.' + testName).replace(/^\.|\.$/, '')] = true
  }
}

// -----------------------------------------------------------------------------
// captureHookFunctions
//
// Helper function to captures all 'before' 'after' ,... calls and add them to
// our internal list of tests. Since these function's first parameter is a
// function itself, we have to specify the name beforehand
// -----------------------------------------------------------------------------
function captureHookFunctions(name) {
  return function capture(ignoreFunction) {
    addTestRouteToTree(testRoute, name, ':' + name)
  }
}

// -----------------------------------------------------------------------------
// cleanEmptyChildren
//
// Removes all nodes whose children are empty
// -----------------------------------------------------------------------------
function cleanEmptyChildren(extendedTree) {
  for (const [key, subtree] of Object.entries(extendedTree)) {
    if (typeof subtree !== 'object') continue

    if (
      subtree.hasOwnProperty('children') &&
      Object.keys(subtree.children).length === 0
    ) {
      delete subtree.children
    } else {
      cleanEmptyChildren(subtree)
    }
  }
}

// -----------------------------------------------------------------------------
// buildSimpleTree
//
// Creates a simple tree where leaf nodes contain the file:line of the test
// -----------------------------------------------------------------------------
function buildSimpleTree(extendedTree) {
  if (
    !extendedTree.hasOwnProperty('children') &&
    extendedTree.hasOwnProperty('line')
  ) {
    return `${extendedTree.file}:${extendedTree.line}`
  }

  const simpleTree = {}
  for (const [key, subtree] of Object.entries(extendedTree)) {
    if (subtree.hasOwnProperty('children')) {
      simpleTree[key] = buildSimpleTree(subtree.children)
    } else {
      simpleTree[key] = `${subtree.file}:${subtree.line}`
    }
  }

  return simpleTree
}

// -----------------------------------------------------------------------------
// findSuitesAndTests
//
// Find all suites and tests in given folder
//
// Returns an object with a list of the test suites, a list of the tests
// themselves and a tree of nested objects containing both suites and tests.
//
// Example:
//   >>> findSuitesAndTests ('my-test-dir', 'js')
//   {
//      "suites" : [
//        "suite-1",
//        "suite-2",
//        "suite-2.suite-2.1",
//        ...
//      ],
//
//      "tests": [
//        "test-0",
//        "suite-1.test-1",
//        "suite-2.suite-2.1.test-2.1.1",
//        ...
//      ],
//      "tree": {
//        "test-0": {
//          "type": "it.skip",
//          "file": "testFile.js",
//          "line": 14
//        },
//        "suite-1": {
//          "type": "describe",
//          "file": "testFile.js",
//          "line": 23,
//          "test-1": {
//            "type": "it",
//            "file": "testFile.js",
//            "line": 27
//          }
//        },
//      }
//   }
// -----------------------------------------------------------------------------
async function findSuitesAndTests(testFolder, extensions) {
  if (typeof extensions === 'string') extensions = [extensions]

  let allTestFiles = lookupFiles(testFolder, extensions || ['js', 'mjs'], true)

  // HOOK: describe/it function hooks
  global.describe = captureDescribeFunctions('describe')
  global.it = captureItFunctions('it')

  global.describe.skip = captureDescribeFunctions('describe.skip')
  global.describe.only = captureDescribeFunctions('describe.only')
  global.it.skip = captureItFunctions('it.skip')
  global.it.only = captureItFunctions('it.only')

  global.before = captureHookFunctions('before')
  global.after = captureHookFunctions('after')
  global.beforeEach = captureHookFunctions('beforeEach')
  global.afterEach = captureHookFunctions('afterEach')

  // capture all suites and direct tests
  for (let i = 0; i < allTestFiles.length; i++) {
    let file = allTestFiles[i]

    if (!path.isAbsolute(file)) file = './' + path.relative(__dirname, file)

    // load ES6 modules with import and everything else with require
    if (/\.mjs$/i.test(file)) await import(file)
    else require(file)
  }

  cleanEmptyChildren(tree)

  // build a simple tree out of the current extended tree
  const simpleTree = buildSimpleTree(tree)

  return {
    suites: Object.keys(suites),
    tests: Object.keys(tests),
    tree: simpleTree,
    extended_tree: tree,
  }
}

// -----------------------------------------------------------------------------
// main
//
// Find all files containing tests under given folder
// -----------------------------------------------------------------------------
async function main() {
  if (
    process.argv.length <= 2 ||
    process.argv[2] == '-h' ||
    process.argv[2] == '--help'
  ) {
    console.log('Use: list-mocha-tests.js <test-folder>\n')
    console.log('Copyright(c) 2018 Pau Sanchez - MIT Licensed')
    return 0
  }

  const testFolder = process.argv[2] || 'test'

  const result = await findSuitesAndTests(testFolder, ['js', 'mjs'])

  // write to stdout and wait for console output to be flushed
  await new Promise((resolve, _) => {
    process.stdout.write(JSON.stringify(result, null, 2), () => {
      resolve()
    })
  })

  return 0
}

// -----------------------------------------------------------------------------
// start script
// -----------------------------------------------------------------------------
if (require.main === module) {
  main()
    .then(function (result) {
      process.exit(result)
    })
    .catch(function (e) {
      console.error('Fatal Error (try --help for help):')
      console.error(e)
      process.exit(-1)
    })
}

module.exports = {
  findSuitesAndTests,
}
