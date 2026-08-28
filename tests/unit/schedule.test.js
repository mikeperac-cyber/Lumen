import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { timeToMin, minToTime, generatePeriods } from '../../src/lib/schedule.js';

describe('schedule.timeToMin / minToTime', () => {
  it('round-trips', () => {
    assert.equal(timeToMin('08:30'), 510);
    assert.equal(minToTime(510), '08:30');
    assert.equal(minToTime(24 * 60), '00:00');
  });
});

describe('schedule.generatePeriods', () => {
  it('returns null when end <= start', () => {
    assert.equal(generatePeriods('10:00', '10:00', 60), null);
    assert.equal(generatePeriods('12:00', '09:00', 60), null);
  });
  it('returns null for out-of-range intervals', () => {
    assert.equal(generatePeriods('08:00', '17:00', 4), null);
    assert.equal(generatePeriods('08:00', '17:00', 241), null);
  });
  it('generates back-to-back blocks with sequential ids', () => {
    const p = generatePeriods('08:00', '10:00', 60);
    assert.equal(p.length, 2);
    assert.deepEqual(p[0], { id: 'p1', label: 'Block 1', start: '08:00', end: '09:00', time: '08:00 – 09:00' });
    assert.equal(p[1].id, 'p2');
  });
  it('drops a partial trailing block', () => {
    assert.equal(generatePeriods('08:00', '09:30', 60).length, 1);
  });
  it('skips blocks that start inside a break window', () => {
    const p = generatePeriods('08:00', '13:00', 60, [{ start: '12:00', end: '13:00', label: 'Lunch' }]);
    assert.equal(p.some((b) => b.start === '12:00'), false);
    assert.equal(p.length, 4);
  });
});
