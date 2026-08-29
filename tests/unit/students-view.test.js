import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { studentCardHTML, studentRowHTML } from '../../src/students/view.js';

const student = (over = {}) => ({
  id: 's1', name: 'Ada Lovelace', level: 'B2', rate: 40, currency: 'USD',
  status: 'active', goals: '', tags: [], ...over,
});
const stats = (over = {}) => ({
  lessonsCount: 0, usdPaid: 0, tryPaid: 0, pendingCount: 0, pendingTasks: 0,
  notesCount: 0, attCount: 0, assignCount: 0, plansCount: 0, ...over,
});
const ctx = (over = {}) => ({ stats: stats(), tagSpan: () => '', ic: () => '', ...over });

describe('studentCardHTML', () => {
  it('escapes a hostile name', () => {
    const html = studentCardHTML(student({ name: '<img src=x onerror=1>' }), ctx());
    assert.ok(!html.includes('<img src=x'));
  });

  it('builds initials from up to the first two words of the name', () => {
    assert.ok(studentCardHTML(student({ name: 'Ada Lovelace' }), ctx()).includes('>AL<'));
    assert.ok(studentCardHTML(student({ name: 'Cher' }), ctx()).includes('>C<'));
  });

  it('falls back to "ST" when the name yields no initials', () => {
    assert.ok(studentCardHTML(student({ name: '' }), ctx()).includes('>ST<'));
  });

  it('shows the rate in the student\'s own currency symbol', () => {
    assert.ok(studentCardHTML(student({ currency: 'USD', rate: 40 }), ctx()).includes('$40/hr'));
    assert.ok(studentCardHTML(student({ currency: 'TRY', rate: 500 }), ctx()).includes('₺500/hr'));
  });

  it('says "Custom rate" when no rate is set', () => {
    assert.ok(studentCardHTML(student({ rate: 0 }), ctx()).includes('Custom rate'));
  });

  it('shows the goal note only when one is set, escaped', () => {
    assert.ok(!studentCardHTML(student({ goals: '' }), ctx()).includes('🎯 <b>Goal:</b>'));
    const html = studentCardHTML(student({ goals: '<script>x</script>' }), ctx());
    assert.ok(html.includes('🎯 <b>Goal:</b>'));
    assert.ok(!html.includes('<script>'));
  });

  it('shows activity badges only for counts above zero', () => {
    const withAll = studentCardHTML(student(), ctx({ stats: stats({ attCount: 2, assignCount: 1, notesCount: 3 }) }));
    assert.ok(withAll.includes('2 sessions'));
    assert.ok(withAll.includes('1 HW'));
    assert.ok(withAll.includes('3 notes'));
    const withNone = studentCardHTML(student(), ctx());
    assert.ok(!withNone.includes('sessions'));
    assert.ok(!withNone.includes(' HW'));
  });

  it('renders tags through the injected tagSpan', () => {
    const html = studentCardHTML(student({ tags: ['esl'] }), ctx({ tagSpan: (t) => `<i>${t}</i>` }));
    assert.ok(html.includes('<i>esl</i>'));
  });

  it('shows a status dot reflecting the student\'s status', () => {
    assert.ok(studentCardHTML(student({ status: 'paused' }), ctx()).includes('student-status-dot paused'));
  });
});

describe('studentRowHTML', () => {
  it('escapes a hostile name in the table row', () => {
    const html = studentRowHTML(student({ name: '<img src=x onerror=1>' }), ctx());
    assert.ok(!html.includes('<img src=x'));
  });

  it('shows a dash for rate when none is set', () => {
    assert.ok(studentRowHTML(student({ rate: 0 }), ctx()).includes('—'));
  });

  it('shows a muted zero for attendance and homework counts, badges otherwise', () => {
    const empty = studentRowHTML(student(), ctx());
    assert.ok(/muted">0</.test(empty));
    const active = studentRowHTML(student(), ctx({ stats: stats({ attCount: 3, assignCount: 2 }) }));
    assert.ok(active.includes('3 sessions'));
    assert.ok(active.includes('2 tasks'));
  });
});
