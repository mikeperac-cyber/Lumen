import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  parseNaturalLanguageTask,
  extractPriority,
  extractTags,
  extractEntities,
  extractTime,
  extractDate,
} from '../../src/lib/parser.js';

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

describe('Dimension-specific helper functions', () => {
  describe('extractPriority', () => {
    it('extracts high/urgent/p1 priority', () => {
      const r1 = extractPriority('Task !urgent');
      assert.equal(r1.priority, 'high');
      assert.equal(r1.text, 'Task ');

      const r2 = extractPriority('Task !p1');
      assert.equal(r2.priority, 'high');
      assert.equal(r2.text, 'Task ');
    });

    it('extracts medium/p2 priority', () => {
      const r = extractPriority('Task !medium');
      assert.equal(r.priority, 'med');
      assert.equal(r.text, 'Task ');
    });

    it('extracts low/p3 priority', () => {
      const r = extractPriority('Task !low');
      assert.equal(r.priority, 'low');
      assert.equal(r.text, 'Task ');
    });

    it('defaults to med when no priority flag present', () => {
      const r = extractPriority('Regular task');
      assert.equal(r.priority, 'med');
      assert.equal(r.text, 'Regular task');
    });
  });

  describe('extractTags', () => {
    it('extracts single and multiple tags', () => {
      const r = extractTags('Review code #dev #UrgentTag');
      assert.deepEqual(r.tags, ['dev', 'urgenttag']);
      assert.equal(r.text, 'Review code  ');
    });

    it('returns empty array if no tags found', () => {
      const r = extractTags('Clean code without tags');
      assert.deepEqual(r.tags, []);
      assert.equal(r.text, 'Clean code without tags');
    });
  });

  describe('extractEntities', () => {
    it('extracts student by @mention', () => {
      const r = extractEntities('Discuss with @Ana', deps);
      assert.equal(r.student, 'Ana');
      assert.equal(r.text, 'Discuss with ');
    });

    it('extracts project by @mention', () => {
      const r = extractEntities('Update @Website', deps);
      assert.equal(r.projectId, 'pr-1');
      assert.equal(r.text, 'Update ');
    });

    it('extracts goal by @mention', () => {
      const r = extractEntities('Focus on @tutoring', deps);
      assert.equal(r.goalId, 'go-1');
      assert.equal(r.text, 'Focus on ');
    });

    it('fuzzy matches student name when not using @token', () => {
      const r = extractEntities('Lesson with Ana', deps);
      assert.equal(r.student, 'Ana');
      assert.equal(r.text, 'Lesson with Ana');
    });
  });

  describe('extractTime', () => {
    it('extracts 12-hour am/pm time', () => {
      const r1 = extractTime('Meeting at 3pm');
      assert.equal(r1.startTime, '15:00');
      assert.equal(r1.text, 'Meeting ');

      const r2 = extractTime('Call at 12am');
      assert.equal(r2.startTime, '00:00');
      assert.equal(r2.text, 'Call ');
    });

    it('extracts 24-hour time', () => {
      const r = extractTime('Sync at 14:30');
      assert.equal(r.startTime, '14:30');
      assert.equal(r.text, 'Sync ');
    });
  });

  describe('extractDate', () => {
    const today = new Date('2026-08-28T09:00:00'); // Friday

    it('extracts relative days / weeks', () => {
      const r = extractDate('Deliver in 2 days', today);
      assert.equal(r.due, '2026-08-30');
      assert.equal(r.text, 'Deliver ');
    });

    it('extracts today / tonight', () => {
      const r = extractDate('Finish report today', today);
      assert.equal(r.due, '2026-08-28');
      assert.equal(r.status, 'today');
      assert.equal(r.text, 'Finish report ');
    });

    it('extracts explicit ISO date', () => {
      const r = extractDate('Plan for 2026-11-20', today);
      assert.equal(r.due, '2026-11-20');
      assert.equal(r.text, 'Plan for ');
    });
  });
});
