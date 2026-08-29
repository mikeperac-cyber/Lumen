import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { parseNaturalLanguageTask } from '../../src/lib/parser.js';

const deps = {
  students: [{ id: 'st-ana', name: 'Ana' }],
  projects: [{ id: 'pr-1', name: 'Website' }],
  goals: [{ id: 'go-1', title: 'Grow tutoring' }],
  now: new Date('2026-08-28T09:00:00'), // a Friday
};

describe('parseNaturalLanguageTask', () => {
  it('returns null for empty input', () => {
    assert.equal(parseNaturalLanguageTask('', deps), null);
    assert.equal(parseNaturalLanguageTask('   ', deps), null);
  });

  it('extracts priority, tags, and time; cleans the title', () => {
    const r = parseNaturalLanguageTask('Buy milk tomorrow !high #groceries at 3pm', deps);
    assert.equal(r.title, 'Buy milk');
    assert.equal(r.priority, 'high');
    assert.deepEqual(r.tags, ['groceries']);
    assert.equal(r.startTime, '15:00');
    assert.equal(r.due, '2026-08-29');
    assert.equal(r.status, 'backlog');
  });

  it('resolves "today" and sets status', () => {
    const r = parseNaturalLanguageTask('Ship it today', deps);
    assert.equal(r.due, '2026-08-28');
    assert.equal(r.status, 'today');
  });

  it('resolves "next monday" forward', () => {
    const r = parseNaturalLanguageTask('Prep lesson next monday', deps);
    assert.equal(r.due, '2026-08-31');
  });

  it('resolves "in 3 days"', () => {
    const r = parseNaturalLanguageTask('Follow up in 3 days', deps);
    assert.equal(r.due, '2026-08-31');
  });

  it('resolves an explicit ISO date', () => {
    const r = parseNaturalLanguageTask('Renew passport 2026-12-01', deps);
    assert.equal(r.due, '2026-12-01');
  });

  it('matches an @student by name and strips the token', () => {
    const r = parseNaturalLanguageTask('Call @Ana about homework', deps);
    assert.equal(r.student, 'Ana');
    assert.equal(r.title, 'Call about homework');
    assert.equal(r.category, 'work');
  });

  it('defaults category to personal with no student', () => {
    const r = parseNaturalLanguageTask('Water the plants', deps);
    assert.equal(r.category, 'personal');
    assert.equal(r.student, undefined);
  });
});
