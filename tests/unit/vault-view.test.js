import { VAULT_URL_PLACEHOLDER } from '../../src/lib/constants.js';
import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  vaultHost, vaultSort, vaultTagSet, vaultCardHTML, vaultRowHTML, vaultViewHTML, vaultWidgetHTML, vaultModalHTML, vaultLinkPickerHTML,
} from '../../src/vault/view.js';

const item = (over = {}) => ({
  id: 'v1', title: 'Notes', url: '', description: '', type: 'doc',
  tags: [], collectionId: null, fileName: '', size: 0, blobId: null,
  linkedTaskIds: [], pinned: false, updatedAt: Date.UTC(2026, 0, 2, 12), ...over,
});

describe('vaultHost', () => {
  it('shows the bare hostname without www', () => {
    assert.equal(vaultHost('https://www.example.com/a/b?c=1'), 'example.com');
    assert.equal(vaultHost('https://docs.example.co.uk/x'), 'docs.example.co.uk');
  });
  it('falls back to a truncated string when the url will not parse', () => {
    assert.equal(vaultHost('not a url'), 'not a url');
    assert.equal(vaultHost(''), '');
    assert.equal(vaultHost('x'.repeat(50)).length, 32);
  });
});

describe('vaultSort', () => {
  it('puts pinned items first regardless of recency', () => {
    const older = item({ id: 'a', pinned: true, updatedAt: 1 });
    const newer = item({ id: 'b', pinned: false, updatedAt: 999 });
    assert.deepEqual([newer, older].sort(vaultSort).map(v => v.id), ['a', 'b']);
  });
  it('orders equally-pinned items most-recent first', () => {
    const a = item({ id: 'a', updatedAt: 1 });
    const b = item({ id: 'b', updatedAt: 2 });
    assert.deepEqual([a, b].sort(vaultSort).map(v => v.id), ['b', 'a']);
  });
});

describe('vaultTagSet', () => {
  it('returns each tag once, sorted, across all items', () => {
    const items = [item({ tags: ['work', 'admin'] }), item({ tags: ['work'] }), item({ tags: [] })];
    assert.deepEqual(vaultTagSet(items), ['admin', 'work']);
  });
  it('tolerates missing items and missing tag arrays', () => {
    assert.deepEqual(vaultTagSet(undefined), []);
    assert.deepEqual(vaultTagSet([{ id: 'x' }]), []);
  });
});

describe('vaultCardHTML', () => {
  it('escapes a hostile title rather than emitting it as markup', () => {
    const html = vaultCardHTML(item({ title: '<img src=x onerror=alert(1)>' }));
    assert.ok(!html.includes('<img src=x'), 'raw tag must not survive');
    assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  });
  it('escapes a hostile collection title in the dot tooltip', () => {
    const html = vaultCardHTML(item({ collectionId: 'c1' }), {
      collections: [{ id: 'c1', title: '"><script>x</script>', color: '#fff' }],
    });
    assert.ok(!html.includes('<script>'), 'raw script tag must not survive');
  });
  it('shows the file size when the item has one, and the type label otherwise', () => {
    assert.ok(vaultCardHTML(item({ size: 2048 })).includes('2.0 KB'));
    assert.ok(vaultCardHTML(item({ size: 0, type: 'sheet' })).includes('Sheet'));
  });
  it('names linked tasks it can resolve and falls back to a short id', () => {
    const html = vaultCardHTML(item({ linkedTaskIds: ['t1', 'missing-id-1234'] }), {
      tasks: [{ id: 't1', title: 'Write the report' }],
    });
    assert.ok(html.includes('Write the report'));
    assert.ok(html.includes('missin'), 'unresolved id falls back to a prefix');
  });
  it('renders tags through the injected tagSpan', () => {
    const html = vaultCardHTML(item({ tags: ['work'] }), { tagSpan: (t) => `<b>${t}</b>` });
    assert.ok(html.includes('<b>work</b>'));
  });
});

describe('vaultRowHTML', () => {
  it('escapes the title and carries the type icon', () => {
    const html = vaultRowHTML(item({ title: '<b>x</b>', type: 'pdf' }));
    assert.ok(!html.includes('<b>x</b>'));
    assert.ok(html.includes('📕'), 'pdf icon');
  });
});

describe('vaultViewHTML', () => {
  const ctx = (over = {}) => ({
    items: [], allItems: [], collections: [], filter: { q: '', type: '', tag: '', collection: '' },
    viewMode: 'grid', quotaUsed: 0, tasks: [], ...over,
  });

  it('renders one card per matching item in grid mode', () => {
    const items = [item({ id: 'a' }), item({ id: 'b' })];
    const html = vaultViewHTML(ctx({ items, allItems: items }));
    assert.equal((html.match(/class="vault-card"/g) || []).length, 2);
    assert.equal((html.match(/class="vault-row"/g) || []).length, 0);
  });

  it('renders rows instead of cards in list mode', () => {
    const items = [item({ id: 'a' })];
    const html = vaultViewHTML(ctx({ items, allItems: items, viewMode: 'list' }));
    assert.equal((html.match(/class="vault-row"/g) || []).length, 1);
    assert.equal((html.match(/class="vault-card"/g) || []).length, 0);
  });

  it('reports how many of the total are showing', () => {
    const all = [item({ id: 'a' }), item({ id: 'b' }), item({ id: 'c' })];
    const html = vaultViewHTML(ctx({ items: [all[0]], allItems: all }));
    assert.ok(html.includes('1 of 3 items'));
  });

  it('escapes the search query where it is echoed back', () => {
    const html = vaultViewHTML(ctx({ filter: { q: '"><script>x</script>', type: '', tag: '', collection: '' } }));
    assert.ok(!html.includes('<script>'), 'raw script tag must not survive the value attribute');
  });

  it('offers the onboarding card only when the vault is entirely empty', () => {
    const all = [item({ id: 'a' })];
    assert.ok(vaultViewHTML(ctx()).includes('drop a PDF or paste a link'));
    assert.ok(!vaultViewHTML(ctx({ items: [], allItems: all })).includes('drop a PDF or paste a link'));
  });

  it('shows a filters-are-hiding-everything state when items match nothing', () => {
    const all = [item({ id: 'a' })];
    const html = vaultViewHTML(ctx({ items: [], allItems: all }));
    assert.ok(html.includes('No vault items match your filters'));
  });

  it('marks the selected type in the type dropdown', () => {
    const html = vaultViewHTML(ctx({ filter: { q: '', type: 'pdf', tag: '', collection: '' } }));
    assert.ok(/<option value="pdf" selected>/.test(html));
  });

  it('lists every tag in use as a filter option, escaped', () => {
    const all = [item({ id: 'a', tags: ['<b>bad</b>', 'work'] })];
    const html = vaultViewHTML(ctx({ items: all, allItems: all }));
    assert.ok(html.includes('#work'));
    assert.ok(!html.includes('<b>bad</b>'));
  });
});

describe('vaultWidgetHTML', () => {
  it('summarises counts by type across every item', () => {
    const items = [
      item({ id: 'a', type: 'link' }), item({ id: 'b', type: 'link' }),
      item({ id: 'c', type: 'pdf' }), item({ id: 'd', type: 'sheet', pinned: true }),
    ];
    const html = vaultWidgetHTML(items);
    assert.ok(html.includes('4 items'));
    assert.ok(html.includes('2 links'));
    assert.ok(html.includes('1 PDFs'));
    assert.ok(html.includes('1 pinned'));
  });

  it('counts an unrecognised type as other rather than dropping it', () => {
    const html = vaultWidgetHTML([item({ id: 'a', type: 'weird-new-type' })]);
    assert.ok(html.includes('1 items'));
  });

  it('shows at most six items, pinned first', () => {
    const items = Array.from({ length: 9 }, (_, i) => item({ id: 'i' + i, updatedAt: i }));
    items[0].pinned = true; // oldest, but pinned
    const html = vaultWidgetHTML(items);
    assert.equal((html.match(/data-vault-mini=/g) || []).length, 6);
    assert.ok(html.indexOf('data-vault-mini="i0"') < html.indexOf('data-vault-mini="i8"'));
  });

  it('says so when the vault is empty', () => {
    assert.ok(vaultWidgetHTML([]).includes('No items yet'));
  });

  it('escapes a hostile item title', () => {
    const html = vaultWidgetHTML([item({ title: '<img src=x onerror=1>' })]);
    assert.ok(!html.includes('<img src=x'));
  });
});

describe('vaultModalHTML', () => {
  const blank = () => ({
    id: 'new', title: '', url: '', description: '', type: 'link', tags: [],
    collectionId: null, fileName: '', mime: '', size: 0, blobId: null,
    linkedTaskIds: [], linkedGoalIds: [], linkedNoteIds: [], linkedStudentIds: [], pinned: false,
  });

  it('titles itself by whether it is editing an existing item', () => {
    assert.ok(vaultModalHTML(blank(), { isEdit: false }).includes('New vault item'));
    assert.ok(vaultModalHTML(blank(), { isEdit: true }).includes('Edit vault item'));
  });

  it('offers Delete only when editing', () => {
    assert.ok(!vaultModalHTML(blank(), { isEdit: false }).includes('id="vm-delete"'));
    assert.ok(vaultModalHTML(blank(), { isEdit: true }).includes('id="vm-delete"'));
  });

  it('escapes a hostile title in the value attribute', () => {
    const html = vaultModalHTML({ ...blank(), title: '"><script>x</script>' }, {});
    assert.ok(!html.includes('<script>'), 'raw script tag must not escape the attribute');
  });

  it('pre-selects the item type and collection', () => {
    const html = vaultModalHTML({ ...blank(), type: 'pdf', collectionId: 'c2' }, {
      collections: [{ id: 'c1', title: 'One' }, { id: 'c2', title: 'Two' }],
    });
    assert.ok(/<option value="pdf" selected>/.test(html));
    assert.ok(/<option value="c2" selected>/.test(html));
  });

  it('checks the boxes for things already linked', () => {
    const html = vaultModalHTML({ ...blank(), linkedTaskIds: ['t2'] }, {
      tasks: [{ id: 't1', title: 'One' }, { id: 't2', title: 'Two' }],
    });
    assert.ok(/value="t2" checked/.test(html));
    assert.ok(!/value="t1" checked/.test(html));
  });

  it('says so when there is nothing of a kind to link', () => {
    const html = vaultModalHTML(blank(), {});
    assert.ok(html.includes('No tasks'));
    assert.ok(html.includes('No goals'));
    assert.ok(html.includes('No students'));
  });

  it('caps each picker so a large workspace cannot render thousands of checkboxes', () => {
    const many = (n, p) => Array.from({ length: n }, (_, i) => ({ id: p + i, title: p + i }));
    const html = vaultModalHTML(blank(), { tasks: many(200, 't'), goals: many(200, 'g') });
    assert.equal((html.match(/id="vm-tasks"[\s\S]*?<\/div>/)[0].match(/<input type="checkbox"/g) || []).length, 80);
    assert.equal((html.match(/id="vm-goals"[\s\S]*?<\/div>/)[0].match(/<input type="checkbox"/g) || []).length, 30);
  });

  it('describes a pending file, and offers Remove only for a stored blob', () => {
    const pending = vaultModalHTML(blank(), { pendingFile: { name: 'report.pdf', size: 2048 } });
    assert.ok(pending.includes('report.pdf'));
    assert.ok(pending.includes('2.0 KB'));
    assert.ok(!pending.includes('id="vm-file-clear"'), 'nothing stored yet, so nothing to remove');
    assert.ok(vaultModalHTML({ ...blank(), blobId: 'b1', fileName: 'a.pdf', size: 10 }, {}).includes('id="vm-file-clear"'));
  });

  it('uses the VAULT_URL_PLACEHOLDER constant in the url input placeholder', () => {
    const html = vaultModalHTML(blank(), {});
    assert.ok(html.includes(`placeholder="${VAULT_URL_PLACEHOLDER}"`));
  });

  it('closes through the delegated handler, not an inline onclick', () => {
    const html = vaultModalHTML(blank(), { isEdit: true });
    assert.ok(html.includes('data-close-modal'));
    assert.ok(!/onclick=/.test(html));
  });
});

describe('vaultLinkPickerHTML', () => {
  it('points at the vault when there is nothing to pick', () => {
    const html = vaultLinkPickerHTML([], []);
    assert.ok(html.includes('No vault items'));
    assert.ok(html.includes('data-close-modal'));
  });
  it('checks only the selected items and escapes their titles', () => {
    const items = [item({ id: 'a', title: '<b>A</b>' }), item({ id: 'b', title: 'B' })];
    const html = vaultLinkPickerHTML(['b'], items);
    assert.ok(/value="b" checked/.test(html));
    assert.ok(!/value="a" checked/.test(html));
    assert.ok(!html.includes('<b>A</b>'));
  });
});
