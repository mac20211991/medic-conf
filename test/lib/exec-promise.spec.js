const { expect, assert } = require('chai');
const exec = require('./../../src/lib/exec-promise');

describe('exec-promise', () => {

  it('execute command resolve in a promise with the standard output as a result', async () => {
    const output = await exec('node', '-h');  // No error is raised
    expect(output).to.match(/Usage: node/);
  });

  it('execute command with invalid args raise a rejected promise with output error as a result', async () => {
    try {
      await exec('node', '--invalid-arg');
      assert.fail('Expected execution error');
    } catch (err) {
      expect(err).to.match(/node: bad option/);
    }
  });

  it('execute command that does not exist raise a rejected promise', async () => {
    try {
      await exec('cmd-dont-exist.sh', 'some-arg');
      assert.fail('Expected execution error');
    } catch (err) {
      expect(err).to.match(/cmd-dont-exist\.sh: not found/);
    }
  });
});