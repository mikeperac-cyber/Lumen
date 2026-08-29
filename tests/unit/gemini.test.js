import { describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import { requestGemini } from '../../src/lib/gemini.js';

const ok = (text) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) });
const fail = (status) => ({ ok: false, status, json: async () => ({ error: { message: 'boom' } }) });

describe('gemini.requestGemini', () => {
  it('throws NO_API_KEY when the key is missing', async () => {
    await assert.rejects(() => requestGemini({ apiKey: '', model: 'm', prompt: 'p' }), { message: 'NO_API_KEY' });
  });

  it('returns trimmed text on success', async () => {
    const fetchImpl = vi.fn(async () => ok('  hello  '));
    const out = await requestGemini({ apiKey: 'k', model: 'm', prompt: 'p', fetchImpl });
    assert.equal(out, 'hello');
    assert.equal(fetchImpl.mock.calls.length, 1);
  });

  it('retries once on 429 then succeeds', async () => {
    const fetchImpl = vi.fn(async () => ok('done'));
    fetchImpl.mockImplementationOnce(async () => fail(429));
    const out = await requestGemini({ apiKey: 'k', model: 'm', prompt: 'p', fetchImpl, retryDelayMs: 1 });
    assert.equal(out, 'done');
    assert.equal(fetchImpl.mock.calls.length, 2);
  });

  it('throws after two 429s', async () => {
    const fetchImpl = vi.fn(async () => fail(429));
    await assert.rejects(() => requestGemini({ apiKey: 'k', model: 'm', prompt: 'a', fetchImpl, retryDelayMs: 1 }));
    assert.equal(fetchImpl.mock.calls.length, 3);
  });

  it('throws GEMINI_TIMEOUT when the request outlasts timeoutMs', async () => {
    const fetchImpl = (url, o) => new Promise((_, rej) => {
      o.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    });
    await assert.rejects(
      () => requestGemini({ apiKey: 'k', model: 'm', prompt: 'p', fetchImpl, timeoutMs: 5 }),
      { message: 'GEMINI_TIMEOUT' },
    );
  });
});
