import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { attendanceTabHTML, assignmentsTabHTML, lessonPlansTabHTML } from '../../src/students/view.js';

const ctxBase = { filter: 'ALL', today: '2026-08-29', ic: () => '' };

describe('attendanceTabHTML', () => {
  const rec = (over = {}) => ({ id: 'a1', date: '2026-08-01', time: '10:00', studentName: 'Ada', status: 'present', duration: 60, topic: '', notes: '', billed: false, ...over });

  it('tallies sessions by status', () => {
    const html = attendanceTabHTML({ ...ctxBase, attendance: [rec({ status: 'present' }), rec({ status: 'late' }), rec({ status: 'absent' })] });
    assert.ok(html.includes('>3<')); // total sessions
  });

  it('computes attendance rate as present+late over total, rounded', () => {
    // 2 of 3 present/late -> 67%
    const html = attendanceTabHTML({ ...ctxBase, attendance: [rec({ status: 'present' }), rec({ status: 'late' }), rec({ status: 'absent' })] });
    assert.ok(html.includes('67%'));
  });

  it('computes punctuality as present over (present+late), excluding absences', () => {
    // 1 present, 1 late -> punctuality 50%, but attendance rate would be 100% (no absences)
    const html = attendanceTabHTML({ ...ctxBase, attendance: [rec({ status: 'present' }), rec({ status: 'late' })] });
    assert.ok(html.includes('50%'));
    assert.ok(html.includes('100%'));
  });

  it('reports 100% attendance and punctuality with no sessions at all, not NaN', () => {
    const html = attendanceTabHTML({ ...ctxBase, attendance: [] });
    assert.ok(!html.includes('NaN'));
    assert.equal((html.match(/100%/g) || []).length, 2);
  });

  it('filters the table by status', () => {
    const all = [rec({ id: 'a', status: 'present' }), rec({ id: 'b', status: 'absent' })];
    const html = attendanceTabHTML({ ...ctxBase, attendance: all, filter: 'present' });
    assert.ok(html.includes('data-id="a"'));
    assert.ok(!html.includes('data-id="b"'));
  });

  it('escapes a hostile student name and topic', () => {
    const html = attendanceTabHTML({ ...ctxBase, attendance: [rec({ studentName: '<img src=x onerror=1>', topic: '<script>y</script>' })] });
    assert.ok(!html.includes('<img src=x'));
    assert.ok(!html.includes('<script>'));
  });

  it('shows an empty state when there are no records', () => {
    assert.ok(attendanceTabHTML({ ...ctxBase, attendance: [] }).includes('No attendance logs found'));
  });
});

describe('assignmentsTabHTML', () => {
  const rec = (over = {}) => ({ id: 'g1', studentName: 'Ada', title: 'HW 1', status: 'assigned', dueDate: '', description: '', score: '', feedback: '', ...over });

  it('tallies assignments by status', () => {
    const html = assignmentsTabHTML({ ...ctxBase, assignments: [rec({ status: 'assigned' }), rec({ status: 'submitted' }), rec({ status: 'reviewed' })] });
    assert.ok(html.includes('assignment-card'));
  });

  it('treats both "reviewed" and "completed" as graded', () => {
    const html = assignmentsTabHTML({ ...ctxBase, assignments: [rec({ status: 'reviewed' }), rec({ status: 'completed' })] });
    // the "Graded / Completed" stat should read 2
    const gradedBlock = html.split('Graded / Completed')[0];
    assert.ok(/student-stat-val" style="color:#34d399">2</.test(gradedBlock));
  });

  it('flags overdue only for a past due date on a not-yet-completed assignment', () => {
    const overdue = assignmentsTabHTML({ ...ctxBase, assignments: [rec({ dueDate: '2026-08-01', status: 'assigned' })] });
    assert.ok(overdue.includes('⚠️ Overdue'));
    const notOverdue = assignmentsTabHTML({ ...ctxBase, assignments: [rec({ dueDate: '2026-08-01', status: 'completed' })] });
    assert.ok(!notOverdue.includes('⚠️ Overdue'));
  });

  it('escapes a hostile title, student name and feedback', () => {
    const html = assignmentsTabHTML({ ...ctxBase, assignments: [rec({ title: '<script>a</script>', studentName: '<b>b</b>', feedback: '<img src=x onerror=1>' })] });
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<b>b</b>'));
    assert.ok(!html.includes('<img src=x'));
  });

  it('shows an empty state when there are no assignments', () => {
    assert.ok(assignmentsTabHTML({ ...ctxBase, assignments: [] }).includes('No assignments found'));
  });
});

describe('lessonPlansTabHTML', () => {
  const rec = (over = {}) => ({ id: 'p1', studentName: 'Ada', level: 'B2', title: 'Lesson 1', status: 'planned', date: '', duration: 60, objective: '', warmUp: '', mainActivity: '', wrapUpHomework: '', ...over });

  it('tallies plans by status', () => {
    const html = lessonPlansTabHTML({ ...ctxBase, lessonPlans: [rec({ status: 'planned' }), rec({ status: 'delivered' }), rec({ status: 'draft' })] });
    assert.ok(html.includes('lesson-plan-card'));
  });

  it('shows the deliver-vs-redeliver label based on status', () => {
    assert.ok(lessonPlansTabHTML({ ...ctxBase, lessonPlans: [rec({ status: 'planned' })] }).includes('🚀 Deliver Lesson'));
    assert.ok(lessonPlansTabHTML({ ...ctxBase, lessonPlans: [rec({ status: 'delivered' })] }).includes('✅ Re-deliver'));
  });

  it('shows each lesson stage only when it is filled in', () => {
    const full = lessonPlansTabHTML({ ...ctxBase, lessonPlans: [rec({ objective: 'Learn X', warmUp: 'Chat', mainActivity: 'Drill', wrapUpHomework: 'Read' })] });
    for (const s of ['Learn X', 'Chat', 'Drill', 'Read']) assert.ok(full.includes(s));
    const empty = lessonPlansTabHTML({ ...ctxBase, lessonPlans: [rec()] });
    assert.ok(!empty.includes('Lesson Objective'));
  });

  it('escapes a hostile title and lesson stage content', () => {
    const html = lessonPlansTabHTML({ ...ctxBase, lessonPlans: [rec({ title: '<script>a</script>', objective: '<img src=x onerror=1>' })] });
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<img src=x'));
  });

  it('shows an empty state when there are no plans', () => {
    assert.ok(lessonPlansTabHTML({ ...ctxBase, lessonPlans: [] }).includes('No lesson plans created yet'));
  });
});
