import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { isArchivedTask, linkGraphForTask, taskCardHTML, taskBoardHTML, taskModalHTML, matrixHTML } from '../../src/tasks/view.js';
import { isoDate, shiftDays } from '../../src/lib/helpers.js';

const task = (over = {}) => ({
  id: 't1', title: 'Write the report', desc: '', status: 'today', priority: 'med',
  tags: [], subtasks: [], category: '', due: '', goalId: '', krId: '',
  createdAt: 1, updatedAt: 1, ...over,
});
const yesterday = isoDate(shiftDays(-1));
const tomorrow = isoDate(shiftDays(1));

describe('isArchivedTask', () => {
  it('accepts either the flag or the status', () => {
    assert.equal(isArchivedTask(task()), false);
    assert.equal(isArchivedTask(task({ archived: true })), true);
    assert.equal(isArchivedTask(task({ status: 'archived' })), true);
  });
});

describe('linkGraphForTask', () => {
  it('is empty for a task linked to nothing', () => {
    assert.equal(linkGraphForTask(task(), {}), '');
  });
  it('names the linked goal', () => {
    const html = linkGraphForTask(task({ goalId: 'g1' }), { goals: [{ id: 'g1', title: 'Ship v2', keyResults: [] }] });
    assert.ok(html.includes('Ship v2'));
  });
  it('escapes a hostile goal title', () => {
    const html = linkGraphForTask(task({ goalId: 'g1' }), { goals: [{ id: 'g1', title: '<img src=x>', keyResults: [] }] });
    assert.ok(!html.includes('<img src=x'));
  });
  it('stays empty when the linked goal no longer exists', () => {
    assert.equal(linkGraphForTask(task({ goalId: 'gone' }), { goals: [] }), '');
  });
});

describe('taskCardHTML', () => {
  it('escapes a hostile title and description', () => {
    const html = taskCardHTML(task({ title: '<img src=x onerror=1>', desc: '<script>y</script>' }), {});
    assert.ok(!html.includes('<img src=x'));
    assert.ok(!html.includes('<script>'));
  });

  it('flags a past due date as overdue', () => {
    assert.ok(taskCardHTML(task({ due: yesterday }), {}).includes('overdue'));
    assert.ok(!taskCardHTML(task({ due: tomorrow }), {}).includes('overdue'));
  });

  it('does not call a completed task overdue', () => {
    const html = taskCardHTML(task({ due: yesterday, status: 'done' }), {});
    assert.ok(!html.includes('overdue'));
  });

  it('shows the goal chip only when the goal resolves', () => {
    const goals = [{ id: 'g1', title: 'Ship v2', color: '#123456', keyResults: [] }];
    assert.ok(taskCardHTML(task({ goalId: 'g1' }), { goals }).includes('goal-chip'));
    assert.ok(!taskCardHTML(task({ goalId: 'missing' }), { goals }).includes('goal-chip'));
  });

  it('counts completed subtasks', () => {
    const html = taskCardHTML(task({ subtasks: [{ done: true }, { done: false }] }), {});
    assert.ok(html.includes('1/2'));
  });

  it('marks an archived task in both the class and a badge', () => {
    const html = taskCardHTML(task({ archived: true }), {});
    assert.ok(/class="task-card archived/.test(html));
    assert.ok(html.includes('archived</span>'));
  });

  it('renders a selection checkbox only in select mode, checked when selected', () => {
    assert.ok(!taskCardHTML(task(), {}).includes('task-sel-check'));
    const html = taskCardHTML(task(), { selectMode: true, selectedIds: new Set(['t1']) });
    assert.ok(html.includes('task-sel-check'));
    assert.ok(/data-sel-id="t1" checked/.test(html));
  });

  it('places the focus-timer markup the caller supplies', () => {
    // The pomodoro widget reads live timer state, so the caller renders it.
    const html = taskCardHTML(task(), { pomoHTML: () => '<b id="pomo-here"></b>' });
    assert.ok(html.includes('<b id="pomo-here"></b>'));
  });

  it('renders tags through the injected tagSpan', () => {
    const html = taskCardHTML(task({ tags: ['work'] }), { tagSpan: (t) => `<i>${t}</i>` });
    assert.ok(html.includes('<i>work</i>'));
  });
});

describe('taskBoardHTML', () => {
  const col = (over = {}) => ({ id: 'today', title: 'Today', color: '#123456', count: 0, warn: false, ...over });
  const ctx = (over = {}) => ({
    columns: [col()], goals: [], filter: { q: '', goal: '', category: '', tag: '' },
    filterActive: false, hiddenTotal: 0, riskParts: [], showArchived: false,
    selectMode: false, selectedCount: 0, allSelected: false, ...over,
  });

  it('renders one column per list, with the title escaped and the count shown', () => {
    const html = taskBoardHTML(ctx({ columns: [col({ id: 'a', title: '<b>A</b>', count: 3 }), col({ id: 'b', title: 'B' })] }));
    assert.equal((html.match(/class="col"/g) || []).length, 2);
    assert.ok(!html.includes('<b>A</b>'));
    assert.ok(/class="col-count">3</.test(html));
  });

  it('warns on a column count only when that column is hiding risky tasks', () => {
    assert.ok(/col-count warn/.test(taskBoardHTML(ctx({ columns: [col({ warn: true })] }))));
    assert.ok(!/col-count warn/.test(taskBoardHTML(ctx())));
  });

  it('echoes the search query into the filter box, escaped', () => {
    const html = taskBoardHTML(ctx({ filter: { q: '"><script>x</script>', goal: '', category: '', tag: '' } }));
    assert.ok(!html.includes('<script>'));
  });

  it('shows the tag chip only when a tag filter is active', () => {
    assert.ok(!taskBoardHTML(ctx()).includes('task-tag-chip'));
    assert.ok(taskBoardHTML(ctx({ filter: { q: '', goal: '', category: '', tag: 'work' } })).includes('#work'));
  });

  it('shows the hidden-risk pill only while filtering, and names the columns', () => {
    assert.ok(!taskBoardHTML(ctx({ hiddenTotal: 2, riskParts: ['2 today'] })).includes('task-risk-pill'));
    const html = taskBoardHTML(ctx({ filterActive: true, hiddenTotal: 2, riskParts: ['2 today'] }));
    assert.ok(html.includes('task-risk-pill'));
    assert.ok(html.includes('2 hidden overdue/due-soon'));
    assert.ok(html.includes('2 today'));
  });

  it('shows the batch bar only in select mode, with the live count', () => {
    assert.ok(!taskBoardHTML(ctx()).includes('task-batch-bar'));
    const html = taskBoardHTML(ctx({ selectMode: true, selectedCount: 4 }));
    assert.ok(html.includes('task-batch-bar'));
    assert.ok(html.includes('4 selected'));
  });

  it('flips the select-all control once everything is selected', () => {
    assert.ok(taskBoardHTML(ctx({ selectMode: true, selectedCount: 2 })).includes('Select all'));
    assert.ok(taskBoardHTML(ctx({ selectMode: true, selectedCount: 2, allSelected: true })).includes('Deselect all'));
  });

  it('offers the goals as filter options, escaped, with the active one selected', () => {
    const html = taskBoardHTML(ctx({
      goals: [{ id: 'g1', title: '<i>One</i>' }, { id: 'g2', title: 'Two' }],
      filter: { q: '', goal: 'g2', category: '', tag: '' },
    }));
    assert.ok(!html.includes('<i>One</i>'));
    assert.ok(/<option value="g2" selected>/.test(html));
  });

  it('reflects the show-archived toggle', () => {
    assert.ok(!/id="task-show-archived" checked/.test(taskBoardHTML(ctx())));
    assert.ok(/id="task-show-archived" checked/.test(taskBoardHTML(ctx({ showArchived: true }))));
  });
});

describe('taskModalHTML', () => {
  const blank = () => ({
    title: '', desc: '', status: 'today', priority: 'med', due: '', tags: [],
    subtasks: [], category: '', goalId: '', student: '', recurrence: '',
    coverColor: '', coverImage: '', comments: [], attachments: [], members: [],
  });
  const ctx = (over = {}) => ({ isEdit: false, lists: [{ id: 'today', title: 'Today' }], goals: [], students: [], days: [], periods: [], ...over });

  it('titles itself by whether it is editing', () => {
    assert.ok(taskModalHTML(blank(), ctx()).includes('New task'));
    assert.ok(taskModalHTML(blank(), ctx({ isEdit: true })).includes('Edit task'));
  });

  it('offers Delete, Duplicate and Share only when editing', () => {
    const fresh = taskModalHTML(blank(), ctx());
    for (const id of ['f-delete', 'f-dup', 'f-share']) assert.ok(!fresh.includes(id), id + ' should be absent');
    const editing = taskModalHTML(blank(), ctx({ isEdit: true }));
    for (const id of ['f-delete', 'f-dup', 'f-share']) assert.ok(editing.includes(id), id + ' should be present');
  });

  it('escapes a hostile title and description', () => {
    const html = taskModalHTML({ ...blank(), title: '"><script>a</script>', desc: '<img src=x onerror=1>' }, ctx());
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<img src=x'));
  });

  it('pre-selects status, priority, category and goal', () => {
    const html = taskModalHTML(
      { ...blank(), status: 'doing', priority: 'high', category: 'admin', goalId: 'g2' },
      ctx({ lists: [{ id: 'today', title: 'Today' }, { id: 'doing', title: 'Doing' }], goals: [{ id: 'g1', title: 'One' }, { id: 'g2', title: 'Two' }] }),
    );
    assert.ok(/<option value="doing" selected>/.test(html));
    assert.ok(/<option value="high" selected>/.test(html));
    assert.ok(/<option value="admin" selected>/.test(html));
    assert.ok(/<option value="g2" selected>/.test(html));
  });

  it('escapes list, goal and student names in their dropdowns', () => {
    const html = taskModalHTML(blank(), ctx({
      lists: [{ id: 'a', title: '<b>L</b>' }],
      goals: [{ id: 'g', title: '<b>G</b>' }],
      students: [{ id: 's', name: '<b>S</b>' }],
    }));
    for (const bad of ['<b>L</b>', '<b>G</b>', '<b>S</b>']) assert.ok(!html.includes(bad), bad + ' leaked');
  });

  it('renders one row per subtask, escaped', () => {
    const html = taskModalHTML({ ...blank(), subtasks: [{ title: '<i>one</i>', done: false }, { title: 'two', done: true }] }, ctx());
    assert.equal((html.match(/class="subtask-row"/g) || []).length, 2);
    assert.ok(!html.includes('<i>one</i>'));
  });

  it('marks the chosen cover colour as active', () => {
    const html = taskModalHTML({ ...blank(), coverColor: '#34d399' }, ctx());
    assert.ok(/data-cover="#34d399"[^>]*class="cover-dot active"|class="cover-dot active"[^>]*data-cover="#34d399"/.test(html)
      || /cover-dot active/.test(html));
  });

  it('places the vault picker the caller renders', () => {
    const html = taskModalHTML(blank(), ctx({ vaultPickerHTML: '<b id="vault-picker-here"></b>' }));
    assert.ok(html.includes('<b id="vault-picker-here"></b>'));
  });

  it('closes through the delegated handler, not an inline onclick', () => {
    const html = taskModalHTML(blank(), ctx({ isEdit: true }));
    assert.ok(html.includes('data-close-modal'));
    assert.ok(!/onclick=/.test(html));
  });
});

describe('matrixHTML', () => {
  const ctx = (over = {}) => ({
    tasksByQuadrant: { do: [], schedule: [], delegate: [], eliminate: [] },
    limits: {}, goals: [], filter: { q: '', goal: '', category: '', tag: '' }, ...over,
  });
  const many = (n, p) => Array.from({ length: n }, (_, i) => task({ id: p + i, title: p + i }));

  it('renders all four quadrants with their titles and counts', () => {
    const html = matrixHTML(ctx({ tasksByQuadrant: { do: many(2, 'a'), schedule: [], delegate: [], eliminate: [] } }));
    assert.equal((html.match(/class="matrix-quadrant"/g) || []).length, 4);
    assert.ok(html.includes('Do First'));
    assert.ok(html.includes('Eliminate'));
    assert.ok(/matrix-quad-count[^>]*>2</.test(html));
  });

  it('windows a quadrant to its limit and offers the rest', () => {
    const html = matrixHTML(ctx({ tasksByQuadrant: { do: many(5, 'a'), schedule: [], delegate: [], eliminate: [] }, limits: { do: 2 } }));
    assert.equal((html.match(/class="matrix-task"/g) || []).length, 2);
    assert.ok(/data-more="do"/.test(html));
    assert.ok(html.includes('(3'), 'names how many are left');
  });

  it('offers nothing more when the quadrant already fits', () => {
    const html = matrixHTML(ctx({ tasksByQuadrant: { do: many(2, 'a'), schedule: [], delegate: [], eliminate: [] }, limits: { do: 60 } }));
    assert.ok(!/data-more=/.test(html));
  });

  it('invites a drop into an empty quadrant', () => {
    assert.ok(matrixHTML(ctx()).includes('matrix-quad-empty'));
  });

  it('escapes a hostile task title', () => {
    const html = matrixHTML(ctx({ tasksByQuadrant: { do: [task({ title: '<img src=x onerror=1>' })], schedule: [], delegate: [], eliminate: [] } }));
    assert.ok(!html.includes('<img src=x'));
  });

  it('marks an overdue task, but not one due later', () => {
    const late = matrixHTML(ctx({ tasksByQuadrant: { do: [task({ due: yesterday })], schedule: [], delegate: [], eliminate: [] } }));
    const soon = matrixHTML(ctx({ tasksByQuadrant: { do: [task({ due: tomorrow })], schedule: [], delegate: [], eliminate: [] } }));
    assert.ok(/matrix-task-title overdue/.test(late));
    assert.ok(!/matrix-task-title overdue/.test(soon));
  });

  it('escapes the search query and marks the active goal', () => {
    const html = matrixHTML(ctx({
      goals: [{ id: 'g1', title: '<b>One</b>' }, { id: 'g2', title: 'Two' }],
      filter: { q: '"><script>x</script>', goal: 'g2', category: '', tag: '' },
    }));
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<b>One</b>'));
    assert.ok(/<option value="g2" selected>/.test(html));
  });
});
