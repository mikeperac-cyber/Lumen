import { describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import {
  htmlEscape,
  esc,
  safeAttr,
  attr,
  isoDate,
  todayISO,
  shiftDays,
  clamp,
  debounce,
  fileSizeStr,
  fmtShort,
  fmtFull,
  fmtWhen,
  fmtDur,
  timeAgo,
  fmtM
} from '../../src/lib/helpers.js';

describe('htmlEscape and esc', () => {
  it('escapes &, <, >, ", and single quotes', () => {
    assert.equal(htmlEscape('<div class="a" data-x=\'b\'>&</div>'), '&lt;div class=&quot;a&quot; data-x=&#39;b&#39;&gt;&amp;&lt;/div&gt;');
    assert.equal(esc('<>&"\''), '&lt;&gt;&amp;&quot;&#39;');
  });

  it('handles null and undefined', () => {
    assert.equal(htmlEscape(null), '');
    assert.equal(htmlEscape(undefined), '');
    assert.equal(esc(null), '');
    assert.equal(esc(undefined), '');
  });

  it('handles numbers and booleans', () => {
    assert.equal(htmlEscape(123), '123');
    assert.equal(htmlEscape(0), '0');
    assert.equal(htmlEscape(false), 'false');
  });
});

describe('safeAttr and attr', () => {
  it('safeAttr escapes attribute values', () => {
    assert.equal(safeAttr('foo"bar'), 'foo&quot;bar');
    assert.equal(safeAttr(null), '');
  });

  it('attr builds name="escapedValue" attribute string', () => {
    assert.equal(attr('data-id', 'test"123'), ' data-id="test&quot;123"');
    assert.equal(attr('title', '<hello>'), ' title="&lt;hello&gt;"');
  });
});

describe('isoDate and todayISO and shiftDays', () => {
  it('formats Date as YYYY-MM-DD', () => {
    const d = new Date(2026, 7, 29); // Aug 29, 2026
    assert.equal(isoDate(d), '2026-08-29');
  });

  it('defaults to current date for isoDate and matches todayISO', () => {
    assert.equal(typeof todayISO(), 'string');
    assert.equal(todayISO().length, 10);
    assert.equal(isoDate(), todayISO());
  });

  it('shifts days correctly', () => {
    const base = new Date(2026, 0, 15);
    const shifted = shiftDays(5, base);
    assert.equal(shifted.getDate(), 20);
    const shiftedBack = shiftDays(-5, base);
    assert.equal(shiftedBack.getDate(), 10);
    const shiftedDefault = shiftDays(1);
    assert.ok(shiftedDefault instanceof Date);
  });
});

describe('clamp', () => {
  it('clamps values between lo and hi', () => {
    assert.equal(clamp(5, 0, 10), 5);
    assert.equal(clamp(-5, 0, 10), 0);
    assert.equal(clamp(15, 0, 10), 10);
    assert.equal(clamp(0, 0, 0), 0);
  });
});

describe('debounce', () => {
  it('debounces calls', async () => {
    let callCount = 0;
    let lastArg = null;
    const fn = debounce((arg) => {
      callCount++;
      lastArg = arg;
    }, 50);

    fn('a');
    fn('b');
    fn('c');
    assert.equal(callCount, 0);

    await new Promise((r) => setTimeout(r, 100));
    assert.equal(callCount, 1);
    assert.equal(lastArg, 'c');
  });
});

describe('fileSizeStr', () => {
  it('reports bytes below 1 KiB', () => {
    assert.equal(fileSizeStr(0), '0 B');
    assert.equal(fileSizeStr(1023), '1023 B');
  });
  it('switches to KB at 1 KiB, to one decimal', () => {
    assert.equal(fileSizeStr(1024), '1.0 KB');
    assert.equal(fileSizeStr(1536), '1.5 KB');
  });
  it('switches to MB at 1 MiB', () => {
    assert.equal(fileSizeStr(1024 * 1024), '1.0 MB');
    assert.equal(fileSizeStr(10 * 1024 * 1024), '10.0 MB');
  });
});

describe('fmtDur', () => {
  it('shows seconds only below a minute', () => {
    assert.equal(fmtDur(0), '0s');
    assert.equal(fmtDur(59), '59s');
  });
  it('shows minutes and seconds at or above a minute', () => {
    assert.equal(fmtDur(60), '1m 0s');
    assert.equal(fmtDur(3671), '61m 11s');
  });
});

describe('timeAgo', () => {
  const ago = (ms) => timeAgo(Date.now() - ms);
  it('collapses the last minute to "just now"', () => {
    assert.equal(ago(0), 'just now');
    assert.equal(ago(59_000), 'just now');
  });
  it('steps up through minutes, hours and days', () => {
    assert.equal(ago(60_000), '1m ago');
    assert.equal(ago(60 * 60_000), '1h ago');
    assert.equal(ago(25 * 60 * 60_000), '1d ago');
  });
  it('never reports a negative age for a future timestamp', () => {
    assert.equal(timeAgo(Date.now() + 10_000), 'just now');
  });
});

describe('fmtShort and fmtFull', () => {
  it('returns empty for a missing date', () => {
    assert.equal(fmtShort(''), '');
    assert.equal(fmtShort(null), '');
    assert.equal(fmtFull(''), '');
    assert.equal(fmtFull(null), '');
  });
  it('reads the ISO date as LOCAL midnight, not UTC', () => {
    const expectedShort = new Date(2026, 0, 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    assert.equal(fmtShort('2026-01-01'), expectedShort);

    const expectedFull = new Date(2026, 0, 1).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    assert.equal(fmtFull('2026-01-01'), expectedFull);
  });
});

describe('fmtWhen', () => {
  it('formats timestamp as localized short date and time', () => {
    const ts = new Date(2026, 7, 29, 14, 30).getTime();
    const expected = new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    assert.equal(fmtWhen(ts), expected);
  });
});

describe('fmtM', () => {
  it('leads with the currency symbol', () => {
    assert.equal(fmtM(100, 'USD'), '$100');
    assert.equal(fmtM(100, 'TRY'), '₺100');
  });
  it('defaults to USD when no currency is given', () => {
    assert.equal(fmtM(50), '$50');
  });
  it('formats with thousands separators and up to two decimal places', () => {
    assert.equal(fmtM(12345.5, 'USD'), '$12,345.5');
  });
  it('treats a missing amount as zero rather than NaN', () => {
    assert.equal(fmtM(undefined, 'USD'), '$0');
  });
});

