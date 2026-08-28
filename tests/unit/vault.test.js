import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// copy of fixed vaultGuessType from app.js:801-810
function vaultGuessType(fileName, mime) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  const m = (mime || '').toLowerCase().trim();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m === 'application/pdf') return 'pdf';
  if (m === 'text/plain') return 'doc';
  const docMimes = new Set(['application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.oasis.opendocument.text','application/rtf','text/markdown']);
  const sheetMimes = new Set(['application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.oasis.opendocument.spreadsheet','text/csv']);
  if (sheetMimes.has(m)) return 'sheet';
  if (docMimes.has(m)) return 'doc';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc','docx','odt','rtf','txt','md'].includes(ext)) return 'doc';
  if (['xls','xlsx','csv','ods'].includes(ext)) return 'sheet';
  if (['png','jpg','jpeg','gif','webp','svg','bmp','ico'].includes(ext)) return 'image';
  if (['mp4','mov','avi','webm','mkv'].includes(ext)) return 'video';
  return 'link';
}

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
