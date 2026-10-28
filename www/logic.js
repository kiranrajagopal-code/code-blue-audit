/* Audit Code Blue — checklist, time maths and KPIs (no UI).
 * Works in the browser (window.CBA) and in Node (module.exports) for tests.
 * Times are stored as 24-hour "HH:MM" strings on the audit date; intervals wrap past midnight. */
(function (root) {
  'use strict';

  var SECTIONS = [
    ['Recognition and activation', [
      ['1.1', 'Unresponsiveness checked, help shouted for'],
      ['1.2', 'Pulse + breathing checked together, ≤10 s'],
      ['1.3', 'CPR started immediately by first responder'],
      ['1.4', 'Code blue announced within 1 min of collapse'],
      ['1.5', 'Exact location announced (block, floor, ward, bed)'],
      ['1.6', 'Announcement repeated 3 times (not more than 3) and heard in all areas'],
      ['1.7', 'Bed flattened, pillow removed, backboard placed'],
      ['1.8', 'Code status / DNR checked']]],
    ['Team response and leadership', [
      ['2.1', 'Code team arrives within hospital target time'],
      ['2.2', 'Crash cart brought to bedside on time'],
      ['2.3', 'Defibrillator brought to bedside on time'],
      ['2.4', 'All designated members arrive (doctor, anaesthesia/airway, nurses, attendant)'],
      ['2.5', 'One team leader clearly identified and announced'],
      ['2.6', 'Leader stays hands-off, watches the whole scene and gives periodic summary'],
      ['2.7', 'Roles assigned: compressor, airway, defib, drugs, recorder, timekeeper'],
      ['2.8', 'Closed-loop communication (order → repeat → done)'],
      ['2.9', 'Crowd controlled; extra staff sent out'],
      ['2.10', 'Timekeeper prompts compressor switch and next adrenaline dose due'],
      ['2.11', 'Primary consultant / ICU informed']]],
    ['CPR quality', [
      ['3.1', 'Rate 100–120/min'],
      ['3.2', 'Depth 5–6 cm'],
      ['3.3', 'Full chest recoil'],
      ['3.4', 'Correct hand position, arms straight'],
      ['3.5', 'Compressor changed every 2 min (at rhythm check)'],
      ['3.6', 'Next compressor ready before swap'],
      ['3.7', 'Pauses ≤10 s (rhythm check, intubation, swap)'],
      ['3.8', 'Chest compression fraction >80%'],
      ['3.9', '30:2 without advanced airway; continuous with airway'],
      ['3.10', 'Compressor counts compressions aloud and rescuer counts breaths aloud'],
      ['3.11', 'Step/stool available for compressor']]],
    ['Defibrillation', [
      ['4.1', 'Pads/monitor attached as soon as defib arrives'],
      ['4.2', 'Pads placed correctly (sternal–apical / AP), on dry skin'],
      ['4.3', 'Rhythm correctly identified'],
      ['4.4', 'First shock ≤2 min for shockable rhythm'],
      ['4.5', 'Charging during ongoing compressions'],
      ['4.6', 'Pre-shock pause ≤5–10 s'],
      ['4.7', 'Safety call: "I clear, you clear, all clear"'],
      ['4.8', 'Correct energy (biphasic as per manufacturer, usually 200 J)'],
      ['4.9', 'CPR resumed immediately after shock (no pulse check)'],
      ['4.10', 'Shock not given for non-shockable rhythm'],
      ['4.11', 'Staff operate defib without hesitation (Mock)']]],
    ['Airway and ventilation', [
      ['5.1', 'BVM connected to oxygen at 15 L/min with reservoir'],
      ['5.2', 'Good mask seal, airway opened (head tilt/jaw thrust, OPA)'],
      ['5.3', '2 breaths per 30 compressions, each ~1 s, visible chest rise'],
      ['5.4', 'With advanced airway: 1 breath every 6 s (10/min)'],
      ['5.5', 'Suction ready and working'],
      ['5.6', 'Intubation without stopping CPR, or pause ≤10 s'],
      ['5.7', 'Tube position confirmed with waveform ETCO2'],
      ['5.8', 'ETCO2 tracked during CPR (aim >10–20 mmHg)'],
      ['5.9', 'Tube secured; depth noted']]],
    ['Vascular access and drugs', [
      ['6.1', 'Existing IV line checked for patency and used'],
      ['6.2', 'First adrenaline ≤5 min for asystole/PEA'],
      ['6.3', 'Adrenaline in shockable rhythm after 2nd shock'],
      ['6.4', 'Adrenaline 1 mg repeated every 4 min'],
      ['6.5', 'Amiodarone 300 mg after 3rd shock'],
      ['6.6', 'Each drug followed by 20 mL flush + limb raised'],
      ['6.7', 'Verbal order repeated back before giving'],
      ['6.8', 'Pre-filled / labelled syringes; drug + dose called out when given'],
      ['6.9', 'Specific drugs given when indicated (calcium, bicarbonate, magnesium, thrombolytic)']]],
    ['Reversible causes, ROSC and stopping', [
      ['7.1', 'Hs and Ts verbally reviewed by leader'],
      ['7.2', 'ABG / electrolytes / glucose sent early'],
      ['7.3', 'Specific cause treated (e.g. potassium, needle decompression, fluids, thrombolysis)'],
      ['7.4', 'ROSC recognised (pulse, rising ETCO2, BP)'],
      ['7.5', 'Post-ROSC: SpO2 92–98%, avoid hyperoxia'],
      ['7.6', 'Post-ROSC: MAP ≥65 / SBP ≥90; vasopressor started'],
      ['7.7', '12-lead ECG within 10 min of ROSC; STEMI → cath lab call'],
      ['7.8', 'Ventilation targets PaCO2 35–45; glucose checked'],
      ['7.9', 'Temperature control / avoid fever planned'],
      ['7.10', 'Safe transfer to ICU (monitor, O2, drugs, airway kit, doctor)'],
      ['7.11', 'Termination decided by leader with team input, time declared']]],
    ['Equipment and crash cart', [
      ['8.1', 'Daily crash cart checklist signed (last 24 h)'],
      ['8.2', 'Defibrillator charged, on mains, pads in date, paper present'],
      ['8.3', 'Laryngoscope works (bulb/battery), blades of all sizes'],
      ['8.4', 'ETTs, stylet, bougie, SGA, OPA/NPA available'],
      ['8.5', 'Suction working with catheter + Yankauer'],
      ['8.6', 'Oxygen cylinder full / wall O2 working'],
      ['8.7', 'Emergency drugs present, in date, as per list'],
      ['8.8', 'IV kit, cannulas, syringes, flushes available'],
      ['8.9', 'Backboard and step stool available'],
      ['8.10', 'Code blue phone / PA system working (Mock)']]],
    ['Documentation, family and debrief', [
      ['9.1', 'Dedicated recorder from the start'],
      ['9.2', 'Times recorded: collapse, call, team arrival, CPR start, each shock, each drug, airway, ROSC/death'],
      ['9.3', 'Single clock used'],
      ['9.4', 'Code blue form completed and signed by leader'],
      ['9.5', 'Family informed by senior doctor; offered presence if appropriate'],
      ['9.6', 'Death declared and documented correctly; next steps explained'],
      ['9.7', 'Immediate hot debrief (≤10 min): what went well, what to improve'],
      ['9.8', 'Defib data downloaded / printed and attached (where available)'],
      ['9.9', 'Gaps entered in quality register; corrective action with owner and date']]]
  ];

  var ITEMS = [];
  SECTIONS.forEach(function (s, si) { s[1].forEach(function (it) { ITEMS.push({ id: it[0], q: it[1], sec: si }); }); });

  var RHYTHMS = ['ASYSTOLE', 'PEA', 'VT', 'VF'];
  var TIMES = [
    { key: 'arrest', label: 'Time of arrest', hint: 'Collapse / first recognition' },
    { key: 'called', label: 'Code Blue initiated', hint: 'Announcement made' },
    { key: 'cpr', label: 'CPR initiated', hint: 'First compression' },
    { key: 'team', label: 'Code Blue team arrival', hint: 'Team at bedside' },
    { key: 'end', label: 'Termination of Code Blue', hint: 'ROSC or death declared' }
  ];
  var DEFAULT_TARGETS = { called: 1, cpr: 1, team: 3 };
  var ANS = { Y: 'YES', N: 'NO', NA: 'N/A' };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toMin(t) { if (!t) return null; var p = String(t).split(':'); return (+p[0]) * 60 + (+p[1]); }
  // minutes from a to b; wraps across midnight (a code never runs 12 h)
  function diff(a, b) {
    var x = toMin(a), y = toMin(b); if (x == null || y == null) return null;
    var d = y - x; if (d < -720) d += 1440; else if (d > 720) d -= 1440; return d;
  }
  function fmt12(t) {
    if (!t) return '';
    var p = String(t).split(':'), h = +p[0], ap = h >= 12 ? 'PM' : 'AM'; h = h % 12; if (h === 0) h = 12;
    return h + ':' + p[1] + ' ' + ap;
  }
  function from12(h, m, ap) { h = (+h) % 12; if (ap === 'PM') h += 12; return pad(h) + ':' + pad(+m); }
  function split12(t) {
    var p = String(t).split(':'), h = +p[0], ap = h >= 12 ? 'PM' : 'AM'; h = h % 12; if (h === 0) h = 12;
    return { h: String(h), m: p[1], ap: ap };
  }
  function nowHM(d) { d = d || new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function todayISO(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmtDate(iso) {
    if (!iso) return '';
    var p = iso.split('-'); return p[2] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+p[1] - 1] + ' ' + p[0];
  }
  function fmtMin(m) { return m == null ? '—' : (m < 0 ? '−' : '') + Math.abs(m) + ' min'; }

  function compliance(a) {
    var y = 0, n = 0, na = 0, c = (a && a.checks) || {};
    ITEMS.forEach(function (it) { var v = c[it.id]; if (v === 'Y') y++; else if (v === 'N') n++; else if (v === 'NA') na++; });
    return { y: y, n: n, na: na, blank: ITEMS.length - y - n - na, pct: y + n ? Math.round(y / (y + n) * 100) : null };
  }
  function intervals(a) {
    var t = (a && a.times) || {};
    return {
      called: diff(t.arrest, t.called),
      cpr: diff(t.arrest, t.cpr),
      team: diff(t.called, t.team),
      duration: diff(t.cpr || t.arrest, t.end)
    };
  }
  function median(arr) {
    if (!arr.length) return null;
    var s = arr.slice().sort(function (x, y) { return x - y; }), h = s.length >> 1;
    return s.length % 2 ? s[h] : Math.round((s[h - 1] + s[h]) / 2 * 10) / 10;
  }
  function pctWithin(arr, t) { return arr.length ? Math.round(arr.filter(function (v) { return v <= t; }).length / arr.length * 100) : null; }

  function kpis(list, targets) {
    targets = targets || DEFAULT_TARGETS;
    var iv = list.map(intervals);
    var pick = function (k) { return iv.map(function (x) { return x[k]; }).filter(function (v) { return v != null; }); };
    var called = pick('called'), cpr = pick('cpr'), team = pick('team'), dur = list.filter(function (a) { return a.status === 'closed'; }).map(function (a) { return intervals(a).duration; }).filter(function (v) { return v != null; });
    var comps = list.map(function (a) { return compliance(a).pct; }).filter(function (v) { return v != null; });
    var ended = list.filter(function (a) { return a.status === 'closed' && a.outcome; });
    var rosc = ended.filter(function (a) { return a.outcome === 'ROSC'; }).length;
    var secY = SECTIONS.map(function () { return 0; }), secT = SECTIONS.map(function () { return 0; }), no = {};
    list.forEach(function (a) {
      ITEMS.forEach(function (it) {
        var v = a.checks && a.checks[it.id];
        if (v === 'Y' || v === 'N') { secT[it.sec]++; if (v === 'Y') secY[it.sec]++; else no[it.id] = (no[it.id] || 0) + 1; }
      });
    });
    var topNo = Object.keys(no).map(function (id) { return { id: id, count: no[id], q: ITEMS.filter(function (i) { return i.id === id; })[0].q }; })
      .sort(function (x, y) { return y.count - x.count || ITEMS.findIndex(function (i) { return i.id === x.id; }) - ITEMS.findIndex(function (i) { return i.id === y.id; }); });
    return {
      count: list.length,
      real: list.filter(function (a) { return a.kind === 'Real'; }).length,
      mock: list.filter(function (a) { return a.kind === 'Mock'; }).length,
      called: { median: median(called), n: called.length, within: pctWithin(called, targets.called) },
      cpr: { median: median(cpr), n: cpr.length, within: pctWithin(cpr, targets.cpr) },
      team: { median: median(team), n: team.length, within: pctWithin(team, targets.team) },
      duration: { median: median(dur), n: dur.length },
      compliance: { mean: comps.length ? Math.round(comps.reduce(function (s, v) { return s + v; }, 0) / comps.length) : null, n: comps.length },
      outcome: { ended: ended.length, rosc: rosc, death: ended.length - rosc, roscPct: ended.length ? Math.round(rosc / ended.length * 100) : null },
      sections: SECTIONS.map(function (s, i) { return { name: s[0], yes: secY[i], answered: secT[i], pct: secT[i] ? Math.round(secY[i] / secT[i] * 100) : null }; }),
      topNo: topNo
    };
  }

  function newAudit(now) {
    now = now || new Date();
    return {
      id: 'a' + now.getTime().toString(36) + Math.random().toString(36).slice(2, 6),
      kind: 'Real', date: todayISO(now), location: '', rhythm: '', leader: '', observers: '',
      times: { arrest: nowHM(now) }, outcome: '', status: 'open',
      checks: {}, remarks: {}, log: [],
      createdAt: now.toISOString(), updatedAt: now.toISOString()
    };
  }
  // set a time; a change to an already-entered time is kept in the correction log
  function setTime(a, key, val, at) {
    a.times = a.times || {};
    var old = a.times[key] || '';
    if (old === (val || '')) return false;
    if (old) {
      a.log = a.log || [];
      a.log.push({ key: key, label: TIMES.filter(function (t) { return t.key === key; })[0].label, from: old, to: val || '', at: (at || new Date()).toISOString() });
    }
    if (val) a.times[key] = val; else delete a.times[key];
    return true;
  }
  function sortAudits(list) {
    return list.slice().sort(function (x, y) {
      var a = (y.date || '') + ' ' + ((y.times && y.times.arrest) || ''), b = (x.date || '') + ' ' + ((x.times && x.times.arrest) || '');
      return a < b ? -1 : a > b ? 1 : (y.createdAt || '').localeCompare(x.createdAt || '');
    });
  }
  // merge a backup into the current list: same audit id → the more recently edited copy wins
  function mergeAudits(cur, incoming) {
    var byId = {}; cur.forEach(function (a) { byId[a.id] = a; });
    var added = 0, updated = 0;
    incoming.forEach(function (a) {
      if (!a || !a.id || !a.times) return;
      var c = byId[a.id];
      if (!c) { byId[a.id] = a; added++; } else if ((a.updatedAt || '') > (c.updatedAt || '')) { byId[a.id] = a; updated++; }
    });
    return { list: sortAudits(Object.keys(byId).map(function (k) { return byId[k]; })), added: added, updated: updated };
  }

  var api = {
    SECTIONS: SECTIONS, ITEMS: ITEMS, RHYTHMS: RHYTHMS, TIMES: TIMES, DEFAULT_TARGETS: DEFAULT_TARGETS, ANS: ANS,
    pad: pad, diff: diff, fmt12: fmt12, from12: from12, split12: split12, nowHM: nowHM, todayISO: todayISO,
    fmtDate: fmtDate, fmtMin: fmtMin, compliance: compliance, intervals: intervals, median: median, kpis: kpis,
    newAudit: newAudit, setTime: setTime, sortAudits: sortAudits, mergeAudits: mergeAudits
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CBA = api;
})(this);
