import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { htmlEscape, safeAttr } from '../../src/lib/helpers.js';

describe('htmlEscape / safeAttr — XSS regression (task 11)', () => {
  it('escapes < > & \" \'', () => {
    assert.equal(htmlEscape('<div>'), '&lt;div&gt;');
    assert.equal(htmlEscape('a & b'), 'a &amp; b');
    assert.equal(htmlEscape('"x"'), '&quot;x&quot;');
    assert.equal(htmlEscape("'y'"), '&#39;y&#39;');
  });

  it('neutralizes img onerror payload', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const escaped = htmlEscape(payload);
    assert.equal(escaped, '&lt;img src=x onerror=alert(1)&gt;');
    // ensure it does not contain raw <
    assert.ok(!escaped.includes('<'));
    assert.ok(!escaped.includes('>'));
  });

  it('escapes task title with script tag', () => {
    const title = 'Hello <script>alert(1)</script> world';
    const out = htmlEscape(title);
    assert.ok(out.includes('&lt;script&gt;'));
    assert.ok(!out.includes('<script>'));
  });

  it('safeAttr escapes attribute context', () => {
    const val = '"><svg onload=alert(1)>';
    const escaped = safeAttr(val);
    assert.equal(escaped, '&quot;&gt;&lt;svg onload=alert(1)&gt;');
    // attribute injection via " should be neutralized
    assert.ok(!escaped.includes('"'));
  });

  it('handles null/undefined', () => {
    assert.equal(htmlEscape(null), '');
    assert.equal(htmlEscape(undefined), '');
    assert.equal(safeAttr(null), '');
  });

  it('is idempotent for already-escaped? (double-escape check)', () => {
    const once = htmlEscape('<b>');
    const twice = htmlEscape(once);
    // double-escape should escape the & of &lt;
    assert.equal(twice, '&amp;lt;b&amp;gt;');
  });
});

describe('Lesson plan XSS escaping', () => {
  it('escapes p.status, p.date, p.duration, and p.id', () => {
    const p = {
      id: '"><script>alert(1)</script>',
      title: 'Plan Title',
      status: '<img src=x onerror=alert(2)>',
      date: '<script>alert(3)</script>',
      duration: '60<svg onload=alert(4)>',
      level: 'Advanced'
    };
    const escapedStatus = htmlEscape(p.status);
    const escapedDate = htmlEscape(p.date);
    const escapedDuration = htmlEscape(p.duration);
    const escapedId = safeAttr(p.id);

    assert.ok(!escapedStatus.includes('<img'));
    assert.ok(escapedStatus.includes('&lt;img'));

    assert.ok(!escapedDate.includes('<script>'));
    assert.ok(escapedDate.includes('&lt;script&gt;'));

    assert.ok(!escapedDuration.includes('<svg'));
    assert.ok(escapedDuration.includes('&lt;svg'));

    assert.ok(!escapedId.includes('"'));
    assert.ok(escapedId.includes('&quot;'));
  });
});
