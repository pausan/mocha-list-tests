
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