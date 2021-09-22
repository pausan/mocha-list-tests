import './es6module.mjs'
import { name } from '../test/es6module.mjs'

it ('mtest-0', async function () {
  console.log ("won't execute");
})

describe ('msuite-1', async function () {
  it ('test-1', async function () {
    console.log ("won't execute");
  })
})

describe('msuite-2', async function() {
  describe('msuite-2.1', async function() {
    it('test-2.1.1', async function() {
      console.log ("won't execute");
    });
  });
});

describe ('msuite-3', async function () {
  before( function(){ console.log("won't execute"); });
  after( function(){ console.log("won't execute"); });

  beforeEach( function(){ console.log("won't execute"); });
  afterEach( function(){ console.log("won't execute"); });

  it('test-3.1', async function() {
    console.log ("won't execute");
  });

});

// test internal functions
describe('msuite-4', async function() {
  this.timeout(3000);
  this.slow(150);
  this.retries(4);

  describe('msuite-4.1', async function() {
    this.timeout(3000);
    this.slow(150);
    this.retries(4);
    it('test-4.1.1', async function() {
      this.skip(); // will never be executed
      console.log ("won't execute");
    });
  });
});

describe('msuite-5', async function() {
  it.skip('test-5.1', async function() {
    console.log ("won't execute");
  });

  describe.skip('msuite-5.2', async function() {
    it('test-5.2.1', async function() {
      console.log ("won't execute");
    });
  });
});
