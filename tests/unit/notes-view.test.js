import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { noteItemHTML, noteEditorHTML } from '../../src/notes/view.js';

const note = (over = {}) => ({
  id: 'n1', title: 'My note', content: 'Some content', pinned: false, tags: [],
  student: '', audioId: null, updatedAt: Date.UTC(2026, 7, 29, 12), ...over,
});

describe('noteItemHTML', () => {
  it('escapes a hostile title', () => {
    const html = noteItemHTML(note({ title: '<img src=x onerror=1>' }), {});
    assert.ok(!html.includes('<img src=x'));
  });

  it('falls back to "Voice memo" or "Untitled" when the title is empty', () => {
    assert.ok(noteItemHTML(note({ title: '', audioId: 'a1' }), {}).includes('Voice memo'));
    assert.ok(noteItemHTML(note({ title: '', audioId: null }), {}).includes('Untitled'));
  });

  it('marks the currently selected note', () => {
    assert.ok(/class="note-item active"/.test(noteItemHTML(note(), { selectedId: 'n1' })));
    assert.ok(!/class="note-item active"/.test(noteItemHTML(note(), { selectedId: 'other' })));
  });

  it('strips markdown punctuation from the snippet and escapes it', () => {
    const html = noteItemHTML(note({ content: '# Heading <script>x</script> *bold*' }), {});
    assert.ok(!html.includes('# Heading'));
    assert.ok(!html.includes('<script>'));
  });

  it('shows a pin icon and a distinct pinned class only when pinned', () => {
    assert.ok(noteItemHTML(note({ pinned: true }), {}).includes('pin-btn on'));
    assert.ok(!noteItemHTML(note({ pinned: false }), {}).includes('pin-btn on'));
  });

  it('shows at most three tags, rendered through the injected tagSpan', () => {
    const html = noteItemHTML(note({ tags: ['a', 'b', 'c', 'd'] }), { tagSpan: (t) => `<i>${t}</i>` });
    assert.equal((html.match(/<i>/g) || []).length, 3);
  });
});

describe('noteEditorHTML', () => {
  it('escapes a hostile title and content', () => {
    const html = noteEditorHTML(note({ title: '"><script>a</script>', content: '<img src=x onerror=1>' }), {});
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<img src=x'));
  });

  it('shows the raw textarea by default, and rendered markdown in preview mode', () => {
    const editing = noteEditorHTML(note({ content: 'hello' }), { preview: false });
    assert.ok(editing.includes('note-textarea'));
    const previewed = noteEditorHTML(note({ content: 'hello' }), { preview: true, renderMd: () => '<p>rendered</p>' });
    assert.ok(previewed.includes('<p>rendered</p>'));
    assert.ok(!previewed.includes('note-textarea'));
  });

  it('pre-selects the linked student and escapes a hostile student name', () => {
    const html = noteEditorHTML(note({ student: 'Ada' }), {
      students: [{ name: '<b>Bad</b>' }, { name: 'Ada' }],
    });
    assert.ok(/<option value="Ada" selected>/.test(html));
    assert.ok(!html.includes('<b>Bad</b>'));
  });

  it('shows the voice-memo indicator only when an audioId is attached', () => {
    assert.ok(noteEditorHTML(note({ audioId: 'a1' }), {}).includes('Voice memo attached'));
    assert.ok(!noteEditorHTML(note({ audioId: null }), {}).includes('Voice memo attached'));
  });
});
