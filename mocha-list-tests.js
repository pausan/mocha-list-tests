// -----------------------------------------------------------------------------
// list-mocha-tests
//
// Copyright(c) 2018 Pau Sanchez
//
// MIT Licensed
// -----------------------------------------------------------------------------
'use strict'

const fs = require('fs');
const path = require('path');
const process = require ('process');

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
function lookupFiles (filepath, extensions, recursive) {
  var files = [];

  if (!fs.existsSync(filepath)) {
    if (fs.existsSync(filepath + '.js')) {
      filepath += '.js';
    }
    else {
      throw new Error("cannot resolve path (or pattern) '" + filepath + "'");
    }
  }

  try {
    var stat = fs.statSync(filepath);
    if (stat.isFile()) {
      return [filepath];
    }
  } catch (err) {
    // ignore error
    return [];
  }

  const childFiles = fs.readdirSync(filepath);

  for (let i = 0; i < childFiles.length; i++) {
    const file = path.join(filepath, childFiles[i]);
    try {
      var stat = fs.statSync(file);
      if (stat.isDirectory()) {
        if (recursive) {
          files = files.concat ( lookupFiles (file, extensions, recursive) );
        }
        continue;
      }
    } catch (err) {
      // ignore error
      continue;
    }
    var re = new RegExp('\\.(?:' + extensions.join('|') + ')$');
    if (!stat.isFile() || !re.test(file) || path.basename(file)[0] === '.') {
      continue;
    }
    files.push(file);
  }

  return files;
};

// -----------------------------------------------------------------------------
// Some global variables. Yes, this is dirty, but given the simplicity of this
// script it is not worth to encapsulate it. If this grows further and you are
// reading this, please create a class to encapsulate all these variables.
//
// Objects are used to avoid key duplicates when programmatically declaring
// suites/tests.
// -----------------------------------------------------------------------------
let tests = {};
let suites = {};
let tree = {};
let testRoute = [];
const directoryPrefix = new RegExp(`^${process.cwd()}/`);
// -----------------------------------------------------------------------------
// addTestRouteToTree
//
// Helper function to capture test routes as a tree, which might be more
// convenient sometimes.
// -----------------------------------------------------------------------------
function addTestRouteToTree (testRoute, name) {
  const stackTrace = { name: 'Stacktrace' };
  Error.captureStackTrace(stackTrace, addTestRouteToTree);
  const frames = stackTrace.stack.split('\n');
  const line = frames[2];
  const matches = line.match(/^(?:.*\((.*):\d+\)|.* at (\/.*?):\d+)$/);
  const filenameAndLine = (matches[1] || matches[2]).replace(directoryPrefix, '');

  let newTestRoute = testRoute.slice(0); // clone
  newTestRoute.push (name);

  let root = tree;
  for (let i = 0; i < newTestRoute.length; i++) {
    const current = newTestRoute[i];

    // hack to initialize to empty object or true for leafs and be prepared
    // to override a leaf with an object.
    if (!(current in root) || typeof(root[current]) == 'string') {
      if ((i + 1) == newTestRoute.length)
        root[current] = filenameAndLine;
      else
        root[current] = {};
    }
    root = root[current];
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
function captureDescribeFunctions (suiteName, suite) {
  addTestRouteToTree (testRoute, suiteName);

  testRoute.push (suiteName);
  suites[testRoute.join ('.')] = true;
  suite.apply({timeout: () => {}, slow: () => {}});
  testRoute.pop ();
}

// -----------------------------------------------------------------------------
// captureItFunctions
//
// Helper function to captures all 'it' calls and add them to our internal
// list of tests
// -----------------------------------------------------------------------------
function captureItFunctions (testName, ignoreFunction) {
  addTestRouteToTree (testRoute, testName);

  tests[ (testRoute.join ('.') + '.' + testName).replace (/^\.|\.$/, '') ] = true;
}

// -----------------------------------------------------------------------------
// captureHookFunctions
//
// Helper function to captures all 'before' 'after' ,... calls and add them to
// our internal list of tests. Since these function's first parameter is a
// function itself, we have to specify the name beforehand
// -----------------------------------------------------------------------------
function captureHookFunctions (name) {
  return function capture (ignoreFunction) {
    addTestRouteToTree (testRoute, ':' + name);
  };
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
//
//   }
// -----------------------------------------------------------------------------
function findSuitesAndTests (testFolder, extensions) {
  if (typeof (extensions) === "string")
    extensions = [extensions];

  let allTestFiles = lookupFiles (testFolder, extensions || ['js'], true);

  // HOOK: describe/it function hooks
  global.describe      = captureDescribeFunctions
  global.describe.skip = global.describe
  global.describe.only = global.describe
  global.it            = captureItFunctions
  global.it.skip       = global.it
  global.it.only       = global.it

  global.before     = captureHookFunctions('before')
  global.after      = captureHookFunctions('after')
  global.beforeEach = captureHookFunctions('beforeEach')
  global.afterEach  = captureHookFunctions('afterEach')

  // capture all suites and direct tests
  for (let i = 0; i < allTestFiles.length; i++) {
    const file = allTestFiles[i];

    if (path.isAbsolute (file))
      require (file);
    else
      require ('./' + path.relative (__dirname, file));
  }

  return {
    suites : Object.keys(suites),
    tests : Object.keys(tests),
    tree : tree
  };
}

// -----------------------------------------------------------------------------
// main
//
// Find all files containing tests under given folder
// -----------------------------------------------------------------------------
function main () {
  if (
    (process.argv.length <= 2)
    || ((process.argv[2] == '-h') || (process.argv[2] == '--help'))
  )
  {
    console.log ("Use: list-mocha-tests.js <test-folder>\n")
    console.log ("Copyright(c) 2018 Pau Sanchez - MIT Licensed")
    return 0;
  }

  const testFolder = process.argv[2] || 'test';

  const result = findSuitesAndTests (testFolder, 'js');
  console.log (JSON.stringify (result, null, '  '));

  return 0;
}

// -----------------------------------------------------------------------------
// start script
// -----------------------------------------------------------------------------
if (require.main === module) {
  try {
    process.exit (main());
  }
  catch (e) {
    console.error ("Fatal Error (try --help for help):");
    console.error (e);
    process.exit (-1);
  }
}

module.exports = {
  findSuitesAndTests
};
