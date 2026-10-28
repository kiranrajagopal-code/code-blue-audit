// Run with: node test/logic.test.js
const L = require('../www/logic.js');
const assert = require('assert');
let passed = 0;
function t(name, fn) { try { fn(); passed++; console.log('ok  ', name); } catch (e) { console.error('FAIL', name, '\n', e.message); process.exitCode = 1; } }

t('checklist has all 89 items with unique ids', () => {
  assert.strictEqual(L.ITEMS.length, 89);
  assert.strictEqual(new Set(L.ITEMS.map(i => i.id)).size, 89);
});
t('12-hour conversions', () => {
  assert.strictEqual(L.fmt12('00:05'), '12:05 AM');
  assert.strictEqual(L.fmt12('12:00'), '12:00 PM');
  assert.strictEqual(L.fmt12('22:01'), '10:01 PM');
  assert.strictEqual(L.from12('12', '00', 'AM'), '00:00');
  assert.strictEqual(L.from12('10', '01', 'AM'), '10:01');
  assert.strictEqual(L.from12('1', '30', 'PM'), '13:30');
});
t('intervals, including across midnight', () => {
  assert.strictEqual(L.diff('10:00', '10:01'), 1);
  assert.strictEqual(L.diff('23:58', '00:03'), 5);
  const a = { times: { arrest: '10:00', called: '10:01', cpr: '10:00', team: '10:04', end: '10:30' } };
  assert.deepStrictEqual(L.intervals(a), { called: 1, cpr: 0, team: 3, duration: 30 });
});
t('correcting a time keeps the old value in the log', () => {
  const a = L.newAudit(new Date(2026, 9, 28, 10, 0));
  assert.strictEqual(a.times.arrest, '10:00');
  L.setTime(a, 'called', '10:02');
  assert.strictEqual(a.log.length, 0);
  L.setTime(a, 'called', '10:01');
  assert.strictEqual(a.times.called, '10:01');
  assert.strictEqual(a.log.length, 1);
  assert.strictEqual(a.log[0].from, '10:02');
  assert.strictEqual(L.setTime(a, 'called', '10:01'), false);
});
t('compliance excludes N/A and blanks', () => {
  const c = L.compliance({ checks: { '1.1': 'Y', '1.2': 'Y', '1.3': 'N', '1.4': 'NA' } });
  assert.deepStrictEqual([c.y, c.n, c.na, c.blank, c.pct], [2, 1, 1, 85, 67]);
  assert.strictEqual(L.compliance({ checks: { '1.1': 'NA' } }).pct, null);
});
t('KPIs across audits', () => {
  const mk = (kind, times, outcome, checks) => ({ kind, times, outcome, status: outcome ? 'closed' : 'open', checks });
  const list = [
    mk('Real', { arrest: '10:00', called: '10:01', cpr: '10:00', team: '10:03', end: '10:20' }, 'ROSC', { '1.1': 'Y', '1.3': 'N' }),
    mk('Mock', { arrest: '11:00', called: '11:03', cpr: '11:02', team: '11:08', end: '11:15' }, 'Death', { '1.1': 'Y', '1.3': 'N', '2.1': 'NA' }),
    mk('Real', { arrest: '12:00', called: '12:00' }, '', { '1.1': 'Y' })
  ];
  const k = L.kpis(list, { called: 1, cpr: 1, team: 3 });
  assert.strictEqual(k.count, 3); assert.strictEqual(k.real, 2); assert.strictEqual(k.mock, 1);
  assert.strictEqual(k.called.median, 1); assert.strictEqual(k.called.within, 67);
  assert.strictEqual(k.cpr.median, 1); assert.strictEqual(k.cpr.within, 50);
  assert.strictEqual(k.team.median, 3.5); assert.strictEqual(k.team.within, 50);
  assert.strictEqual(k.outcome.roscPct, 50);
  assert.strictEqual(k.duration.median, 16.5);
  assert.strictEqual(k.compliance.mean, Math.round((50 + 50 + 100) / 3));
  assert.strictEqual(k.topNo[0].id, '1.3'); assert.strictEqual(k.topNo[0].count, 2);
  assert.strictEqual(k.sections[0].pct, 60);
});
t('backup merge: newer copy wins, new ones added', () => {
  const a = { id: 'x', times: {}, updatedAt: '2026-10-01', location: 'old' };
  const m = L.mergeAudits([a], [{ id: 'x', times: {}, updatedAt: '2026-10-02', location: 'new' }, { id: 'y', times: {}, updatedAt: '2026-10-01' }]);
  assert.strictEqual(m.added, 1); assert.strictEqual(m.updated, 1);
  assert.strictEqual(m.list.find(z => z.id === 'x').location, 'new');
});
console.log(passed + ' passed');
