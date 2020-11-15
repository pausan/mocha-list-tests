

it ('test-0', async function () {
  console.log ("won't execute");
})

describe ('suite-1', async function () {
  it ('test-1', async function () {
    console.log ("won't execute");
  })
})

describe('suite-2', async function() {
  describe('suite-2.1', async function() {
    it('test-2.1.1', async function() {
      console.log ("won't execute");
    });
  });
});

describe ('suite-3', async function () {
  before( function(){ console.log("won't execute"); });
  after( function(){ console.log("won't execute"); });

  beforeEach( function(){ console.log("won't execute"); });
  afterEach( function(){ console.log("won't execute"); });

  it('test-3.1', async function() {
    console.log ("won't execute");
  });

});

// test internal functions
describe('suite-4', async function() {
  this.timeout(3000);
  this.slow(150);
  this.retries(4);

  describe('suite-4.1', async function() {
    this.timeout(3000);
    this.slow(150);
    this.retries(4);
    it('test-4.1.1', async function() {
      this.skip(); // will never be executed
      console.log ("won't execute");
    });
  });
});

describe('suite-5', async function() {
  it.skip('test-5.1', async function() {
    console.log ("won't execute");
  });

  describe.skip('suite-5.2', async function() {
    it('test-5.2.1', async function() {
      console.log ("won't execute");
    });
  });
});
