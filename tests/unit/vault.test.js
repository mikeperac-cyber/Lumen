import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import * as vaultMod from '../../src/vault/store.js';
const vaultGuessType = vaultMod.vaultGuessType ?? vaultMod.default?.vaultGuessType;

describe('vaultGuessType — tightened mime handling', () => {
  it('docx mime → doc', () => {
    assert.equal(vaultGuessType('file.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document'), 'doc');
    assert.equal(vaultGuessType('','application/vnd.openxmlformats-officedocument.wordprocessingml.document'), 'doc');
  });
  it('xlsx mime → sheet', () => {
    assert.equal(vaultGuessType('file.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), 'sheet');
    assert.equal(vaultGuessType('','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), 'sheet');
  });
  it('image/svg+xml → image not doc', () => {
    assert.equal(vaultGuessType('image.svg','image/svg+xml'), 'image');
    assert.equal(vaultGuessType('file.txt','image/svg+xml'), 'image');
  });
  it('pdf mime → pdf', () => {
    assert.equal(vaultGuessType('doc.pdf','application/pdf'), 'pdf');
    assert.equal(vaultGuessType('','application/pdf'), 'pdf');
  });
  it('extension fallback', () => {
    assert.equal(vaultGuessType('a.docx',''), 'doc');
    assert.equal(vaultGuessType('b.xlsx',''), 'sheet');
    assert.equal(vaultGuessType('c.pdf',''), 'pdf');
    assert.equal(vaultGuessType('d.png',''), 'image');
  });
  it('unknown → link', () => {
    assert.equal(vaultGuessType('',''), 'link');
    assert.equal(vaultGuessType('file.unknown','application/octet-stream'), 'link');
  });
});
