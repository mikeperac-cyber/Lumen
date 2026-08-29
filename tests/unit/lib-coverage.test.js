import { describe, it, vi, beforeEach, afterEach } from 'vitest';
import assert from 'node:assert/strict';

// 1. Test globals.js
describe('globals.js module bridge', () => {
  it('populates window.LumenLib on import', async () => {
    if (typeof window === 'undefined') {
      globalThis.window = {};
    }
    await import('../../src/lib/globals.js');
    assert.ok(globalThis.window.LumenLib, 'LumenLib must exist on window');
    assert.ok(globalThis.window.LumenLib.crypto, 'crypto lib present');
    assert.ok(globalThis.window.LumenLib.schedule, 'schedule lib present');
    assert.ok(globalThis.window.LumenLib.parser, 'parser lib present');
    assert.ok(globalThis.window.LumenLib.merge, 'merge lib present');
    assert.ok(globalThis.window.LumenLib.gemini, 'gemini lib present');
    assert.ok(globalThis.window.LumenLib.students, 'students lib present');
    assert.ok(globalThis.window.LumenLib.helpers, 'helpers lib present');
    assert.ok(globalThis.window.LumenLib.constants, 'constants lib present');
    assert.ok(globalThis.window.LumenLib.persist, 'persist lib present');
    assert.ok(globalThis.window.LumenLib.tasks, 'tasks lib present');
    assert.ok(globalThis.window.LumenLib.finance, 'finance lib present');
    assert.ok(globalThis.window.LumenLib.notes, 'notes lib present');
    assert.ok(globalThis.window.LumenLib.habits, 'habits lib present');
    assert.ok(globalThis.window.LumenLib.vault, 'vault lib present');
  });
});

// 2. Test vault-worker.js
describe('vault-worker.js web worker simulation', () => {
  it('handles encrypt, decrypt, and error paths', async () => {
    let capturedOnMessage = null;
    let postedMessages = [];

    const mockSelf = {
      set onmessage(fn) {
        capturedOnMessage = fn;
      },
      get onmessage() {
        return capturedOnMessage;
      },
      postMessage(msg) {
        postedMessages.push(msg);
      }
    };

    const origSelf = globalThis.self;
    globalThis.self = mockSelf;

    try {
      await import('../../src/lib/vault-worker.js');
      assert.ok(typeof capturedOnMessage === 'function', 'Worker onmessage should be set');

      // Test Encrypt
      postedMessages = [];
      await capturedOnMessage({
        data: {
          op: 'encrypt',
          plainText: 'hello-worker-secret',
          password: 'worker-password-123',
          id: 'test-1'
        }
      });

      assert.equal(postedMessages.length, 1);
      assert.equal(postedMessages[0].id, 'test-1');
      assert.equal(postedMessages[0].ok, true);
      const encResult = JSON.parse(postedMessages[0].result);
      assert.equal(encResult.lumenEncrypted, true);
      assert.equal(encResult.version, 2);

      // Test Decrypt v2
      postedMessages = [];
      await capturedOnMessage({
        data: {
          op: 'decrypt',
          envelope: encResult,
          password: 'worker-password-123',
          id: 'test-2'
        }
      });

      assert.equal(postedMessages.length, 1);
      assert.equal(postedMessages[0].id, 'test-2');
      assert.equal(postedMessages[0].ok, true);
      assert.equal(postedMessages[0].result, 'hello-worker-secret');

      // Test Decrypt v1
      postedMessages = [];
      const encResultV1 = { ...encResult, version: 1 };
      await capturedOnMessage({
        data: {
          op: 'decrypt',
          envelope: encResultV1,
          password: 'worker-password-123',
          id: 'test-3'
        }
      });
      assert.equal(postedMessages.length, 1);
      assert.equal(postedMessages[0].id, 'test-3');
      assert.equal(postedMessages[0].ok, false); // Expected wrong key/data since v1 iterations differs

      // Test Error path
      postedMessages = [];
      await capturedOnMessage({
        data: {
          op: 'decrypt',
          envelope: null,
          password: 'bad',
          id: 'test-err'
        }
      });
      assert.equal(postedMessages.length, 1);
      assert.equal(postedMessages[0].id, 'test-err');
      assert.equal(postedMessages[0].ok, false);
      assert.ok(postedMessages[0].error);
    } finally {
      globalThis.self = origSelf;
    }
  });
});

// 3. Test constants.js
import * as Constants from '../../src/lib/constants.js';
describe('constants.js', () => {
  it('exports all expected system constants', () => {
    assert.equal(Constants.STORAGE_KEY, 'lumen.state.v1');
    assert.equal(Constants.STATE_DB, 'lumen-state');
    assert.equal(Constants.AUTO_VAULT_SLOTS, 3);
    assert.equal(Constants.UNDO_MAX, 40);
    assert.equal(Constants.VAULT_CRYPTO_VERSION, 2);
    assert.ok(Array.isArray(Constants.STATUSES));
    assert.ok(Array.isArray(Constants.COLORS));
    assert.ok(Array.isArray(Constants.EMOJIS));
    assert.ok(Constants.TITLES.dashboard);
    assert.ok(Constants.NAV.dashboard);
    assert.ok(Constants.PRIOS.high);
    assert.ok(Array.isArray(Constants.CATEGORIES));
    assert.ok(Array.isArray(Constants.RECURRENCE));
    assert.ok(Array.isArray(Constants.COVER_COLORS));
  });
});

// 4. Test crypto.js
import {
  buf2b64,
  b642buf,
  randomSaltB64,
  deriveVaultKey,
  encryptVaultBackup,
  decryptVaultBackup,
  hashPassLegacy,
  hashPass,
  sealSecret,
  openSecret,
  VAULT_ITERATIONS_V1,
  VAULT_ITERATIONS_V2,
  VAULT_CURRENT_VERSION
} from '../../src/lib/crypto.js';

describe('crypto.js comprehensive', () => {
  it('converts buffers to base64 and back', () => {
    const raw = new Uint8Array([1, 2, 3, 4, 5, 255, 128, 0]);
    const b64 = buf2b64(raw);
    const roundtrip = new Uint8Array(b642buf(b64));
    assert.deepEqual(Array.from(roundtrip), Array.from(raw));
  });

  it('generates 16 random bytes as base64', () => {
    const salt1 = randomSaltB64();
    const salt2 = randomSaltB64();
    assert.notEqual(salt1, salt2);
    assert.equal(b642buf(salt1).byteLength, 16);
  });

  it('derives vault keys with custom iterations', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key1 = await deriveVaultKey('password123', salt, VAULT_ITERATIONS_V1);
    assert.ok(key1);
    const key2 = await deriveVaultKey('password123', salt, VAULT_ITERATIONS_V2);
    assert.ok(key2);
  });

  it('encrypts and decrypts vault backup envelopes (inline and fallback)', async () => {
    const payload = JSON.stringify({ secret: 'my-precious-data', count: 42 });
    const password = 'correct-horse-battery-staple';

    const envelopeStr = await encryptVaultBackup(payload, password);
    assert.ok(envelopeStr.includes('lumenEncrypted'));
    const envelopeObj = JSON.parse(envelopeStr);
    assert.equal(envelopeObj.version, VAULT_CURRENT_VERSION);

    const decrypted = await decryptVaultBackup(envelopeObj, password);
    assert.equal(decrypted, payload);

    // Fail with wrong password
    await assert.rejects(
      async () => decryptVaultBackup(envelopeObj, 'wrong-password'),
      /Incorrect vault password/
    );

    // Fail with invalid envelope
    await assert.rejects(
      async () => decryptVaultBackup({ invalid: true }, password),
      /Not a valid Lumen encrypted vault file/
    );
  });

  it('decrypts v1 envelopes using v1 iterations', async () => {
    const payload = 'v1 legacy test data';
    const password = 'v1-password';
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveVaultKey(password, salt, VAULT_ITERATIONS_V1);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(payload));

    const v1Envelope = {
      lumenEncrypted: true,
      version: 1,
      salt: buf2b64(salt),
      iv: buf2b64(iv),
      data: buf2b64(ct),
      exportedAt: Date.now()
    };

    const decrypted = await decryptVaultBackup(v1Envelope, password);
    assert.equal(decrypted, payload);
  });

  it('supports workerFactory option in encryptVaultBackup and decryptVaultBackup', async () => {
    const payload = 'worker-test';
    const password = 'worker-pass';

    const originalWorker = globalThis.Worker;
    globalThis.Worker = class DummyWorker {};

    try {
      // Mock worker that returns success
      const mockWorker = {
        postMessage(msg) {
          setTimeout(() => {
            if (msg.op === 'encrypt') {
              this.onmessage({
                data: {
                  id: msg.id,
                  ok: true,
                  result: JSON.stringify({
                    lumenEncrypted: true,
                    version: 2,
                    salt: 'c2FsdA==',
                    iv: 'aXZpdg==',
                    data: 'ZGF0YQ==',
                    exportedAt: Date.now()
                  })
                }
              });
            } else {
              this.onmessage({
                data: {
                  id: msg.id,
                  ok: true,
                  result: 'worker-decrypted'
                }
              });
            }
          }, 10);
        },
        terminate() {}
      };

      const enc = await encryptVaultBackup(payload, password, { workerFactory: () => mockWorker });
      assert.ok(enc.includes('lumenEncrypted'));

      const dec = await decryptVaultBackup(JSON.parse(enc), password, { workerFactory: () => mockWorker });
      assert.equal(dec, 'worker-decrypted');

      // Test worker returning error
      const failingWorker = {
        postMessage(msg) {
          setTimeout(() => {
            this.onmessage({ data: { id: msg.id, ok: false, error: 'Worker failed' } });
          }, 10);
        },
        terminate() {}
      };

      const fallbackEnc = await encryptVaultBackup(payload, password, { workerFactory: () => failingWorker });
      assert.ok(fallbackEnc.includes('lumenEncrypted'));

      // Test worker throwing on creation
      const throwingFactory = () => { throw new Error('Worker not allowed'); };
      const fallbackEnc2 = await encryptVaultBackup(payload, password, { workerFactory: throwingFactory });
      assert.ok(fallbackEnc2.includes('lumenEncrypted'));

      // Test worker null factory
      const nullFactory = () => null;
      const fallbackEnc3 = await encryptVaultBackup(payload, password, { workerFactory: nullFactory });
      assert.ok(fallbackEnc3.includes('lumenEncrypted'));
    } finally {
      globalThis.Worker = originalWorker;
    }
  });

  it('hashes passphrases with legacy SHA-256 and v104 PBKDF2', async () => {
    const leg1 = await hashPassLegacy('my-passphrase');
    const leg2 = await hashPassLegacy('my-passphrase');
    assert.equal(leg1, leg2);
    assert.equal(leg1.length, 64);

    const salt = randomSaltB64();
    const hp1 = await hashPass('my-passphrase', salt);
    const hp2 = await hashPass('my-passphrase', salt);
    assert.equal(hp1, hp2);
    assert.equal(hp1.length, 64);
  });

  it('seals and opens secrets', async () => {
    const plain = 'secret-auth-token';
    const pass = 'super-secret';
    const sealed = await sealSecret(plain, pass);
    const opened = await openSecret(sealed, pass);
    assert.equal(opened, plain);

    const badOpen = await openSecret('invalid-envelope', pass);
    assert.equal(badOpen, '');

    const wrongPass = await openSecret(sealed, 'wrong-pass');
    assert.equal(wrongPass, '');
  });
});

// 5. Test gemini.js
import { requestGemini } from '../../src/lib/gemini.js';

describe('gemini.js comprehensive', () => {
  it('throws when apiKey or fetch is missing', async () => {
    await assert.rejects(
      () => requestGemini({ apiKey: '', model: 'gemini-1.5-flash', prompt: 'hi' }),
      /NO_API_KEY/
    );
    await assert.rejects(
      () => requestGemini({ apiKey: 'k', model: 'gemini-1.5-flash', prompt: 'hi', fetchImpl: null }),
      /NO_FETCH/
    );
  });

  it('successfully returns generated text', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '  Hello from Gemini!  ' }] } }]
      })
    });

    const res = await requestGemini({
      apiKey: 'test-key',
      model: 'gemini-1.5-flash',
      prompt: 'Say hello',
      systemInstruction: 'Be concise',
      fetchImpl: mockFetch
    });

    assert.equal(res, 'Hello from Gemini!');
    assert.equal(mockFetch.mock.calls.length, 1);
  });

  it('retries on 429 or 500 status codes', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { ok: false, status: 429, json: async () => ({ error: { message: 'Quota exceeded' } }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Recovered response' }] } }]
        })
      };
    });

    const res = await requestGemini({
      apiKey: 'test-key',
      model: 'gemini-1.5-flash',
      prompt: 'Retry test',
      retryDelayMs: 10,
      fetchImpl: mockFetch
    });

    assert.equal(res, 'Recovered response');
    assert.equal(callCount, 2);
  });

  it('throws error when non-retryable status or final failure occurs', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Bad request payload' } })
    });

    await assert.rejects(
      () => requestGemini({ apiKey: 'k', model: 'm', prompt: 'p', fetchImpl: mockFetch }),
      /Bad request payload/
    );
  });

  it('throws when Gemini returns no text candidates', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [] })
    });

    await assert.rejects(
      () => requestGemini({ apiKey: 'k', model: 'm', prompt: 'p', fetchImpl: mockFetch }),
      /No response generated by Gemini/
    );
  });

  it('handles abort / timeout errors', async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    });

    await assert.rejects(
      () => requestGemini({ apiKey: 'k', model: 'm', prompt: 'p', fetchImpl: mockFetch }),
      /GEMINI_TIMEOUT/
    );
  });
});

// 6. Test merge.js
import { applyMerge } from '../../src/lib/merge.js';

describe('merge.js comprehensive', () => {
  it('merges tasks, goals, habits, notes with tombstones and LWW', () => {
    const state = {
      tasks: [{ id: 't1', title: 'Old', updatedAt: 100 }],
      goals: [],
      habits: [],
      notes: [],
      recordings: [],
      projects: [],
      krHistory: [],
      income: [],
      expenses: [],
      expectedIncome: [],
      expectedExpenses: [],
      students: [],
      attendance: [],
      assignments: [],
      lessonPlans: [],
      kanbanLists: [{ id: 'k1', title: 'Todo' }],
      vaultItems: [{ id: 'v1', title: 'Doc', updatedAt: 100 }],
      vaultCollections: [{ id: 'vc1', name: 'Work', updatedAt: 100 }],
      achievements: { firstTask: { unlockedAt: 100 } },
      tagColors: { bug: '#ff0000' },
      incomeTypes: ['Salary'],
      expenseCategories: ['Food'],
      _tagColorMeta: { bug: 100 },
      _incomeTypesMeta: { Salary: 100 },
      _expenseCategoriesMeta: { Food: 100 },
      _vaultItemsMeta: { v1: 100 },
      _vaultCollectionsMeta: { vc1: 100 }
    };

    const syncMeta = {
      tombstones: {
        tasks: [], goals: [], habits: [], notes: [], recordings: [],
        vaultItems: [],
        vaultCollections: {}
      }
    };

    const incoming = {
      tasks: [
        { id: 't1', title: 'Newer', updatedAt: 200 },
        { id: 't2', title: 'Brand new', updatedAt: 150 }
      ],
      kanbanLists: [{ id: 'k1', title: 'Todo Renamed' }, { id: 'k2', title: 'Done' }],
      vaultItems: [
        { id: 'v1', title: 'Doc Updated', updatedAt: 200 },
        { id: 'v2', title: 'Doc 2', updatedAt: 150 }
      ],
      vaultCollections: [
        { id: 'vc1', name: 'Work Renamed', updatedAt: 200 },
        { id: 'vc2', name: 'Personal', updatedAt: 150 }
      ],
      achievements: {
        firstTask: { unlockedAt: 200 },
        tenTasks: { unlockedAt: 150 }
      },
      tagColors: { feature: '#00ff00', bug: null },
      incomeTypes: ['Salary', 'Freelance'],
      expenseCategories: ['Food', 'Rent'],
      _tagColorMeta: { feature: 200, bug: 200 },
      _incomeTypesMeta: { Freelance: 200 },
      _expenseCategoriesMeta: { Rent: 200 },
      _vaultItemsMeta: { v1: 200, v2: 150 },
      _vaultCollectionsMeta: { vc1: 200, vc2: 150 },
      deleted: {
        tasks: ['t3'],
        vaultItems: ['v3'],
        vaultCollections: { vc3: 200 }
      }
    };

    const changed = applyMerge({ state, syncMeta, inc: incoming, incomingRev: 200 });
    assert.equal(changed, true);
    assert.equal(state.tasks.length, 2);
    assert.equal(state.tasks.find((t) => t.id === 't1').title, 'Newer');
    assert.equal(state.kanbanLists.length, 2);
    assert.equal(state.vaultItems.length, 2);
    assert.equal(state.vaultCollections.length, 2);
    assert.ok(state.achievements.tenTasks);
    assert.equal(state.tagColors.feature, '#00ff00');
    assert.equal(state.tagColors.bug, undefined);
    assert.ok(state.incomeTypes.includes('Freelance'));
    assert.ok(state.expenseCategories.includes('Rent'));

    // Merging same data again should return false (no change)
    const changedAgain = applyMerge({ state, syncMeta, inc: incoming, incomingRev: 200 });
    assert.equal(changedAgain, false);
  });

  it('handles empty state and incoming data gracefully', () => {
    const state = {};
    const syncMeta = { tombstones: { tasks: [], goals: [], habits: [], notes: [], recordings: [] } };
    const inc = {};
    const changed = applyMerge({ state, syncMeta, inc, incomingRev: 1 });
    assert.equal(typeof changed, 'boolean');
  });

  it('handles tombstones as object map for deleted incomeTypes and tagColors', () => {
    const state = {
      tagColors: { urgent: '#f00' },
      incomeTypes: ['OldType'],
      expenseCategories: ['OldCat'],
      _tagColorMeta: { urgent: 50 },
      _incomeTypesMeta: { OldType: 50 },
      _expenseCategoriesMeta: { OldCat: 50 }
    };
    const syncMeta = {
      tombstones: {
        tasks: [], goals: [], habits: [], notes: [], recordings: [],
        tagColors: { urgent: 50 },
        incomeTypes: { OldType: 50 },
        expenseCategories: { OldCat: 50 }
      }
    };
    const inc = {
      incomeTypes: [],
      expenseCategories: [],
      deleted: {
        tagColors: { urgent: 100 },
        incomeTypes: { OldType: 100 },
        expenseCategories: { OldCat: 100 }
      }
    };
    applyMerge({ state, syncMeta, inc, incomingRev: 100 });
    assert.equal(state.tagColors.urgent, undefined);
    assert.ok(!state.incomeTypes.includes('OldType'));
    assert.ok(!state.expenseCategories.includes('OldCat'));
  });

  it('handles vaultItems explicit delete map and non-array vaultItems fallback', () => {
    const state = {
      vaultItems: [{ id: 'v1', title: 'Old Doc' }],
      _vaultItemsMeta: {}
    };
    const syncMeta = {
      tombstones: {
        vaultItems: ['v0'],
        vaultCollections: null
      }
    };
    const inc = {
      _vaultItemsMeta: { v1: 150, v2: 120 },
      deleted: {
        vaultItems: ['v1']
      }
    };
    applyMerge({ state, syncMeta, inc, incomingRev: 100 });
    assert.equal(state.vaultItems.length, 0);

    // Fallback when inc.vaultItems is truthy object but not array
    const state2 = { _vaultItemsMeta: {} };
    const inc2 = { vaultItems: true, _vaultItemsMeta: { v9: 999 } };
    applyMerge({ state: state2, syncMeta: { tombstones: {} }, inc: inc2, incomingRev: 100 });
    assert.equal(state2._vaultItemsMeta.v9, 999);
  });
});

// 7. Test parser.js
import { parseNaturalLanguageTask } from '../../src/lib/parser.js';

describe('parser.js comprehensive', () => {
  it('parses priorities', () => {
    const r1 = parseNaturalLanguageTask('Do thing !urgent');
    assert.equal(r1.priority, 'high');
    const r2 = parseNaturalLanguageTask('Do thing !p1');
    assert.equal(r2.priority, 'high');
    const r3 = parseNaturalLanguageTask('Do thing !med');
    assert.equal(r3.priority, 'med');
    const r4 = parseNaturalLanguageTask('Do thing !low');
    assert.equal(r4.priority, 'low');
    const r5 = parseNaturalLanguageTask('Do thing !p3');
    assert.equal(r5.priority, 'low');
  });

  it('parses tags and @mentions (students, projects, goals)', () => {
    const students = [{ id: 's1', name: 'Alice Smith' }];
    const projects = [{ id: 'p1', name: 'Website Redesign' }];
    const goals = [{ id: 'g1', title: 'Learn Spanish' }];

    const r1 = parseNaturalLanguageTask('Prepare homework @AliceSmith #esl #grammar', { students, projects, goals });
    assert.equal(r1.student, 'Alice Smith');
    assert.deepEqual(r1.tags, ['esl', 'grammar']);

    const r2 = parseNaturalLanguageTask('Fix header @website', { students, projects, goals });
    assert.equal(r2.projectId, 'p1');

    const r3 = parseNaturalLanguageTask('Study vocab @spanish', { students, projects, goals });
    assert.equal(r3.goalId, 'g1');

    const r4 = parseNaturalLanguageTask('Lesson with Alice Smith', { students });
    assert.equal(r4.student, 'Alice Smith');

    // Unmatched @token should remain in text
    const r5 = parseNaturalLanguageTask('Meeting @nonexistentuser', { students, projects, goals });
    assert.ok(r5.title.includes('@nonexistentuser'));
  });

  it('parses times: at 3pm, at 9am, at 14:30', () => {
    const r1 = parseNaturalLanguageTask('Call Mom at 3pm');
    assert.equal(r1.startTime, '15:00');
    const r2 = parseNaturalLanguageTask('Standup at 9:30am');
    assert.equal(r2.startTime, '09:30');
    const r3 = parseNaturalLanguageTask('Lunch at 12pm');
    assert.equal(r3.startTime, '12:00');
    const r4 = parseNaturalLanguageTask('Midnight snack at 12am');
    assert.equal(r4.startTime, '00:00');
    const r5 = parseNaturalLanguageTask('Meeting at 14:45');
    assert.equal(r5.startTime, '14:45');
  });

  it('parses relative dates: in X days, in X weeks, today, tonight, tomorrow, weekdays', () => {
    const now = new Date(2026, 7, 29); // Saturday
    const r1 = parseNaturalLanguageTask('Pay rent in 3 days', { now });
    assert.equal(r1.due, '2026-09-01');

    const r2 = parseNaturalLanguageTask('Review goals in 2 weeks', { now });
    assert.equal(r2.due, '2026-09-12');

    const r3 = parseNaturalLanguageTask('Exercise today', { now });
    assert.equal(r3.due, '2026-08-29');
    assert.equal(r3.status, 'today');

    const r4 = parseNaturalLanguageTask('Sleep early tonight', { now });
    assert.equal(r4.due, '2026-08-29');

    const r5 = parseNaturalLanguageTask('Buy groceries tomorrow', { now });
    assert.equal(r5.due, '2026-08-30');

    const r6 = parseNaturalLanguageTask('Gym next monday', { now });
    assert.equal(r6.due, '2026-08-31');

    const r7 = parseNaturalLanguageTask('Doctor on 2026-10-15');
    assert.equal(r7.due, '2026-10-15');
  });

  it('returns null for empty or whitespace text', () => {
    assert.equal(parseNaturalLanguageTask(''), null);
    assert.equal(parseNaturalLanguageTask('   '), null);
    assert.equal(parseNaturalLanguageTask(null), null);
  });
});

// 8. Test schedule.js
import {
  timeToMin,
  minToTime,
  generatePeriods,
  DEFAULT_BLOCK_MIN,
  timeOverlaps,
  buildWeekDays,
  buildScheduleGrid
} from '../../src/lib/schedule.js';

describe('schedule.js comprehensive', () => {
  it('converts time to minutes and back', () => {
    assert.equal(timeToMin('00:00'), 0);
    assert.equal(timeToMin('09:30'), 570);
    assert.equal(timeToMin('23:59'), 1439);
    assert.equal(minToTime(0), '00:00');
    assert.equal(minToTime(570), '09:30');
    assert.equal(minToTime(1439), '23:59');
  });

  it('generates schedule periods skipping breaks', () => {
    const periods = generatePeriods('09:00', '13:00', 60, [{ start: '11:00', end: '12:00' }]);
    assert.ok(periods);
    assert.equal(periods.length, 3);
    assert.equal(periods[0].start, '09:00');
    assert.equal(periods[0].end, '10:00');
    assert.equal(periods[1].start, '10:00');
    assert.equal(periods[1].end, '11:00');
    assert.equal(periods[2].start, '12:00');
    assert.equal(periods[2].end, '13:00');

    // Invalid parameters return null
    assert.equal(generatePeriods('13:00', '09:00', 60), null);
    assert.equal(generatePeriods('09:00', '13:00', 2), null);
    assert.equal(generatePeriods('09:00', '13:00', 300), null);
  });

  it('detects time overlaps correctly', () => {
    assert.equal(timeOverlaps({ startTime: '09:00', endTime: '10:00' }, { startTime: '09:30', endTime: '10:30' }), true);
    assert.equal(timeOverlaps({ startTime: '09:00', endTime: '10:00' }, { startTime: '10:00', endTime: '11:00' }), false);
    assert.equal(timeOverlaps({ startTime: '09:00' }, { startTime: '09:30', endTime: '10:00' }), true); // default 50min
    assert.equal(timeOverlaps({}, { startTime: '09:00' }), false);
  });

  it('builds week days and schedule grid', () => {
    const monday = new Date(2026, 7, 24);
    const days = [
      { id: 'mon', label: 'Mon' },
      { id: 'tue', label: 'Tue' },
      { id: 'wed', label: 'Wed' }
    ];
    const weekDays = buildWeekDays(monday, days, '2026-08-25');
    assert.equal(weekDays.length, 3);
    assert.equal(weekDays[0].isToday, false);
    assert.equal(weekDays[1].isToday, true);

    const tasks = [
      { id: 't1', scheduleDay: 'mon', schedulePeriod: 'p1', startTime: '09:00', endTime: '10:00' },
      { id: 't2', scheduleDay: 'mon', schedulePeriod: 'p1', startTime: '09:30', endTime: '10:30' }
    ];
    const { grid, overlapIds } = buildScheduleGrid(tasks, [{ id: 'p1' }], days);
    assert.equal(grid.p1.mon.length, 2);
    assert.ok(overlapIds.has('t1'));
    assert.ok(overlapIds.has('t2'));
  });
});

// 9. Test students.js
import {
  backfillStudentIds,
  getStudentStats,
  formatStudentRevenue
} from '../../src/lib/students.js';

describe('students.js comprehensive', () => {
  it('backfills studentIds across collections and identifies orphans', () => {
    const state = {
      students: [{ id: 's1', name: 'Alice' }],
      income: [{ id: 'i1', student: 'Alice' }, { id: 'i2', student: 'Unknown' }, { id: 'i3', studentId: 's1' }],
      expectedIncome: [{ id: 'e1', student: 'Alice' }],
      assignments: [{ id: 'a1', studentName: 'Alice' }],
      attendance: [{ id: 'att1', studentName: 'Unknown' }]
    };

    const res = backfillStudentIds(state);
    assert.equal(res.linked, 3);
    assert.ok(res.orphans.includes('Unknown'));
    assert.equal(state.income[0].studentId, 's1');
    assert.equal(state.expectedIncome[0].studentId, 's1');
    assert.equal(state.assignments[0].studentId, 's1');
  });

  it('calculates comprehensive student stats and formats revenue', () => {
    const student = { id: 's1', name: 'Bob' };
    const collections = {
      income: [
        { id: 'i1', studentId: 's1', amount: 100, currency: 'USD' },
        { id: 'i2', studentId: 's1', amount: 500, currency: 'TRY' }
      ],
      expectedIncome: [{ id: 'e1', studentId: 's1', amount: 50 }],
      tasks: [{ id: 't1', student: 'Bob', status: 'today' }, { id: 't2', student: 'Bob', status: 'done' }],
      notes: [{ id: 'n1', student: 'Bob' }],
      attendance: [{ id: 'a1', studentId: 's1' }],
      assignments: [{ id: 'as1', studentId: 's1' }],
      lessonPlans: [{ id: 'lp1', studentId: 's1' }]
    };

    const stats = getStudentStats(student, collections);
    assert.equal(stats.lessonsCount, 2);
    assert.equal(stats.usdPaid, 100);
    assert.equal(stats.tryPaid, 500);
    assert.equal(stats.pendingCount, 1);
    assert.equal(stats.pendingTasks, 1);
    assert.equal(stats.notesCount, 1);
    assert.equal(stats.attCount, 1);
    assert.equal(stats.assignCount, 1);
    assert.equal(stats.plansCount, 1);

    const revUSD = formatStudentRevenue(stats, 'USD');
    assert.equal(revUSD, '$100 · ₺500');

    const revTRY = formatStudentRevenue(stats, 'TRY');
    assert.equal(revTRY, '₺500 · $100');
  });
});
