import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('unit-test wiring', () => {
  it('runs', () => {
    assert.equal(1 + 1, 2);
  });
  it('has Web Crypto in the Node environment', () => {
    assert.equal(typeof crypto.subtle.digest, 'function');
  });
});
