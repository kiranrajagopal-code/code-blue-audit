/* Audit Code Blue — UI */
(function () {
  'use strict';
  var L = window.CBA;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* native plugins (present only inside the Android app) */
  var N = window.CBNative || {};
  var NATIVE = !!(N.Capacitor && N.Capacitor.isNativePlatform());
  var IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var STANDALONE = !!(navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));

  /* storage (on this device) */
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('Could not save — phone storage full?'); return false; } }
  var audits = L.sortAudits(load('cba.audits', []));
  var targets = Object.assign({}, L.DEFAULT_TARGETS, load('cba.targets', {}));
  var filter = load('cba.filter', 'All');
  var curId = null;
  function persist() { save('cba.audits', audits); }
  function cur() { return audits.filter(function (a) { return a.id === curId; })[0]; }
  function touch(a) { a.updatedAt = new Date().toISOString(); persist(); }

  var toastT = null;
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.add('hidden'); }, 2600); }

  /* ---------- HOME ---------- */
  function shown() { return audits.filter(function (a) { return filter === 'All' || a.kind === filter; }); }
  function barCls(p) { return p == null ? '' : p >= 80 ? '' : p >= 60 ? 'mid' : 'low'; }
  function ringCol(p) { return p == null ? 'none' : p >= 90 ? 'good' : p >= 75 ? 'mid' : 'low'; }
  // circular gauge: percentage arc with the value in the middle
  function ring(p, size, stroke, small) {
    var r = (size - stroke) / 2, C = 2 * Math.PI * r, off = p == null ? C : C * (1 - p / 100);
    return '<svg class="ring ' + ringCol(p) + '" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" style="width:' + size + 'px;height:' + size + 'px">' +
      '<circle class="trk" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + stroke + '"/>' +
      '<circle class="arc" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + stroke + '" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' +
      '<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle">' + (p == null ? '—' : p + (small ? '' : '%')) + '</text></svg>';
  }
  // indicator row: label + context on the left, the figure on the right; a dot marks on/off target
  function tile(k, v, unit, sub, pct) {
    var dot = pct == null ? '' : '<i class="dot ' + (pct >= 80 ? 'ok' : pct >= 60 ? 'mid' : 'low') + '"></i>';
    return '<div class="kpi"><div class="kl"><div class="k">' + dot + k + '</div><div class="s">' + sub + '</div></div>' +
      '<div class="v">' + (v == null ? '—' : v + '<small>' + unit + '</small>') + '</div></div>';
  }
  function within(x, t) { return x.n ? x.within + '% within ' + t + ' min · ' + x.n + ' audit' + (x.n === 1 ? '' : 's') : 'No data yet'; }
  function renderHome() {
    Array.prototype.forEach.call(document.querySelectorAll('#filter button'), function (b) { b.classList.toggle('sel', b.dataset.f === filter); });
    var list = shown(), k = L.kpis(list, targets);
    $('kpiCount').textContent = filter === 'All' ? 'All audits' : filter + ' only';
    var cm = k.compliance.mean;
    $('heroPct').innerHTML = cm == null ? '—' : cm + '<small>%</small>';
    $('heroBar').style.width = (cm || 0) + '%'; $('heroBar').className = cm == null ? '' : cm >= 90 ? 'ok' : cm >= 75 ? 'mid' : 'low';
    $('hCount').textContent = k.count; $('hReal').textContent = k.real; $('hMock').textContent = k.mock;
    var devs = list.reduce(function (s, a) { return s + L.compliance(a).n; }, 0);
    $('kpis').innerHTML =
      tile('Arrest → Code Blue', k.called.median, 'min', within(k.called, targets.called), k.called.within) +
      tile('Arrest → CPR', k.cpr.median, 'min', within(k.cpr, targets.cpr), k.cpr.within) +
      tile('Code Blue → team', k.team.median, 'min', within(k.team, targets.team), k.team.within) +
      tile('Deviations', list.length ? Math.round(devs / list.length * 10) / 10 : null, 'per audit', list.length ? devs + ' items marked NO in total' : 'No data yet', null) +
      tile('ROSC', k.outcome.roscPct, '%', k.outcome.ended ? k.outcome.rosc + ' ROSC · ' + k.outcome.death + ' death' : 'No ended codes', null) +
      tile('Code duration', k.duration.median, 'min', k.duration.n ? 'Median, CPR → termination' : 'No ended codes', null);
    $('phaseCard').classList.toggle('hidden', !list.length);
    $('phases').innerHTML = k.sections.map(function (s, i) {
      return '<div class="phase"><span class="pn">' + (i + 1) + '</span><span class="pl">' + esc(s.name) + '</span><span class="p' + (s.pct != null && s.pct < 80 ? ' low' : '') + '">' + (s.pct == null ? '—' : s.pct + '%') + '</span><div class="bar"><i class="' + barCls(s.pct) + '" style="width:' + (s.pct || 0) + '%"></i></div></div>';
    }).join('');
    $('topNoWrap').classList.toggle('hidden', !k.topNo.length);
    $('topNo').innerHTML = k.topNo.slice(0, 5).map(function (t) { return '<li><span class="tid">' + t.id + '</span><span class="tq">' + esc(t.q) + '</span><b>' + t.count + '×</b></li>'; }).join('');
    $('btnPdfAll').disabled = !list.length;
    $('list').innerHTML = list.length ? list.map(function (a) {
      var c = L.compliance(a);
      var st = a.status === 'closed' ? (a.outcome === 'ROSC' ? 'ROSC' : 'Death') : 'In progress';
      return '<button class="h-item" data-open="' + a.id + '"><span class="h-kind ' + (a.kind === 'Mock' ? 'mock' : 'real') + '">' + (a.kind === 'Mock' ? 'M' : 'R') + '</span>' +
        '<span class="h-mid"><span class="h-title">' + esc(a.location || 'Location not entered') + '</span><span class="h-sub">' + L.fmtDate(a.date) + ' · ' + (L.fmt12(a.times.arrest) || '—') + ' · ' + st + (c.n ? ' · <em>' + c.n + ' NO</em>' : '') + '</span></span>' +
        '<span class="h-pct">' + (c.pct == null ? '—' : c.pct + '<small>%</small>') + '</span></button>';
    }).join('') : '<div class="empty"><svg><use href="#i-list"/></svg><b>No ' + (filter === 'All' ? '' : filter.toLowerCase() + ' ') + 'audits yet</b><span>Tap New audit when a Code Blue or mock drill begins.</span></div>';
    $('iosInstall').classList.toggle('hidden', !(IOS && !STANDALONE && !NATIVE));
    renderBackup();
  }
  $('filter').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; filter = b.dataset.f; save('cba.filter', filter); renderHome(); });
  $('list').addEventListener('click', function (e) { var b = e.target.closest('[data-open]'); if (b) openAudit(b.dataset.open); });
  $('btnNew').addEventListener('click', function () {
    var a = L.newAudit(); if (filter === 'Mock') a.kind = 'Mock';
    audits.unshift(a); persist(); openAudit(a.id); toast('New audit started · arrest time set to now');
  });

  /* ---------- AUDIT ---------- */
  function show(id) { $('home').classList.toggle('hidden', id !== 'home'); $('audit').classList.toggle('hidden', id !== 'audit'); window.scrollTo(0, 0); }
  function openAudit(id) { curId = id; renderAudit(); show('audit'); }
  $('btnBack').addEventListener('click', function () { curId = null; renderHome(); show('home'); });

  function renderAudit() {
    var a = cur(); if (!a) return;
    Array.prototype.forEach.call(document.querySelectorAll('#kindSeg button'), function (b) { b.classList.toggle('sel', b.dataset.kind === a.kind); });
    $('fDate').value = a.date || ''; $('fRhythm').value = a.rhythm || ''; $('fLocation').value = a.location || '';
    $('fLeader').value = a.leader || ''; $('fObservers').value = a.observers || '';
    renderTimes(); renderChecklist(); renderScore();
  }
  function renderScore() {
    var a = cur(), c = L.compliance(a);
    $('scoreRing').innerHTML = '<b>' + (c.pct == null ? '—' : c.pct + '<small>%</small>') + '</b><span>compliance</span>';
    $('scoreSub').innerHTML = 'Mark only <b>NO</b> or <b>N/A</b>. Unmarked items are recorded as YES.' + (c.n || c.na ? ' <span class="cnt">' + c.n + ' NO · ' + c.na + ' N/A</span>' : '');
    renderHeader();
  }
  function renderHeader() {
    var a = cur(); if (!a) return;
    $('abTitle').textContent = a.location || (a.kind === 'Mock' ? 'Mock drill' : 'Real code');
    $('abSub').textContent = (a.kind === 'Mock' ? 'Mock drill' : 'Real code') + ' · ' + L.fmtDate(a.date) + (a.rhythm ? ' · ' + a.rhythm : '');
  }
  function ivBadge(v, t, from) { if (v == null) return ''; return '<span class="iv ' + (v <= t ? 'ok' : 'bad') + '">' + L.fmtMin(v) + ' ' + from + ' · target ≤' + t + '</span>'; }
  function renderTimes() {
    var a = cur(), t = a.times, iv = L.intervals(a);
    $('times').innerHTML = L.TIMES.map(function (T) {
      var v = t[T.key], right = '';
      // layout: label + hint, then the clock box with its button, then the interval badge below
      function row(head, hint, val, badge) {
        return '<div class="trow"><div class="thead"><div class="tname">' + head + '</div>' + (hint ? '<div class="thint">' + hint + '</div>' : '') + '</div>' +
          '<div class="tval">' + val + '</div>' + (badge ? '<div class="tbadge">' + badge + '</div>' : '') + '</div>';
      }
      if (T.key === 'end') {
        if (a.status !== 'closed') return row('Termination', 'ROSC or death', '<button class="tend" data-end>End Code Blue</button>', '');
        return row('Termination', '<span class="outcome ' + (a.outcome === 'ROSC' ? 'rosc' : 'death') + '">' + esc((a.outcome || '').toUpperCase()) + '</span>' + (iv.duration != null ? ' ' + iv.duration + ' min' : ''),
          '<button class="tclock" data-edit="end"><span>' + (L.fmt12(v) || 'Not set') + '</span></button><button class="tnow alt" data-end>Edit</button>', '');
      }
      return row(T.label, '',
        '<button class="tclock' + (v ? '' : ' empty') + '" data-edit="' + T.key + '"><span>' + (v ? L.fmt12(v) : 'Tap to set') + '</span></button><button class="tnow" data-now="' + T.key + '">Now</button>', right);
    }).join('');
    var ex = L.expected(a);
    $('expected').innerHTML = (ex.cycles == null && ex.doses == null) ? '' :
      '<div class="label">Expected as per protocol</div><div class="exp">' +
      '<div><b>' + (ex.cycles == null ? '—' : ex.cycles) + '</b><span>CPR cycles / pulse checks / compressor switches</span><small>' + (ex.cycles == null ? 'Needs CPR start + termination' : ex.cprMin + ' min CPR ÷ 2 min') + '</small></div>' +
      '<div><b>' + (ex.doses == null ? '—' : ex.doses) + '</b><span>doses of adrenaline 1 mg</span><small>' + (ex.doses == null ? 'Needs first adrenaline + termination' : 'Every 4 min: ' + ex.doseTimes.map(L.fmt12).join(', ')) + '</small></div></div>';
    var log = a.log || [];
    $('logWrap').classList.toggle('hidden', !log.length);
    $('log').innerHTML = log.slice().reverse().map(function (l) {
      var d = new Date(l.at);
      return '<li><b>' + esc(l.label) + '</b>: ' + (L.fmt12(l.from) || '—') + ' → ' + (L.fmt12(l.to) || 'cleared') + ' <span>(corrected ' + L.fmtDate(L.todayISO(d)) + ', ' + L.fmt12(L.nowHM(d)) + ')</span></li>';
    }).join('');
  }
  function secCount(a, s) {
    var n = s[1].filter(function (i) { return a.checks[i[0]] === 'N'; }).length, na = s[1].filter(function (i) { return a.checks[i[0]] === 'NA'; }).length;
    return (n ? n + ' NO' : '') + (n && na ? ' · ' : '') + (na ? na + ' N/A' : '') || 'all YES';
  }
  function renderChecklist() {
    var a = cur();
    $('checklist').innerHTML = L.SECTIONS.map(function (s, si) {
      var sc = secCount(a, s);
      return '<div class="sec" data-sec="' + si + '"><div class="sec-head"><span class="sec-no">' + (si + 1) + '</span><h3>' + esc(s[0]) + '</h3><small class="chip' + (/NO/.test(sc) ? ' bad' : '') + '">' + sc + '</small></div>' +
        s[1].map(function (i) {
          var v = a.checks[i[0]] || '', r = a.remarks[i[0]] || '';
          return '<div class="it' + (v === 'N' ? ' isN' : v === 'NA' ? ' isNA' : '') + '" data-item="' + i[0] + '"><div class="q"><span class="n">' + i[0] + '</span><span>' + esc(i[1]) + '</span></div>' +
            '<div class="yn">' + ['Y', 'N', 'NA'].map(function (k) { return '<button class="' + k + (v === k ? ' sel' : '') + '" data-yn="' + k + '" aria-pressed="' + (v === k) + '">' + L.ANS[k] + '</button>'; }).join('') +
            '<button class="note' + (r ? ' has' : '') + '" data-note aria-label="Add remark for ' + i[0] + '"><svg><use href="#i-note"/></svg></button></div>' +
            '<textarea rows="1" placeholder="Remarks" data-rem="' + i[0] + '" aria-label="Remarks for ' + i[0] + '"' + (v === 'N' || v === 'NA' || r ? '' : ' class="hidden"') + '>' + esc(r) + '</textarea></div>';
        }).join('') + '</div>';
    }).join('');
  }

  /* details */
  $('kindSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var a = cur(); a.kind = b.dataset.kind; touch(a); renderAudit(); });
  [['fDate', 'date'], ['fRhythm', 'rhythm']].forEach(function (p) { $(p[0]).addEventListener('change', function () { var a = cur(); a[p[1]] = this.value; touch(a); renderHeader(); }); });
  [['fLocation', 'location'], ['fLeader', 'leader'], ['fObservers', 'observers']].forEach(function (p) { $(p[0]).addEventListener('input', function () { var a = cur(); a[p[1]] = this.value; touch(a); renderHeader(); }); });

  /* times */
  $('times').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; var a = cur();
    if (b.dataset.now) {
      var k = b.dataset.now, had = a.times[k];
      L.setTime(a, k, L.nowHM()); touch(a); renderTimes();
      toast(had ? 'Time updated — previous time kept in corrections' : 'Time recorded');
    } else if (b.dataset.edit) timeModal(b.dataset.edit);
    else if (b.hasAttribute('data-end')) endModal();
  });
  function pickerHtml(val) {
    var p = L.split12(val || L.nowHM()), h = '', m = '';
    for (var i = 1; i <= 12; i++) h += '<option' + (String(i) === p.h ? ' selected' : '') + '>' + i + '</option>';
    for (var j = 0; j < 60; j++) { var mm = L.pad(j); m += '<option' + (mm === p.m ? ' selected' : '') + '>' + mm + '</option>'; }
    return '<div class="tp"><select class="input" id="tpH" aria-label="Hour">' + h + '</select><span class="colon">:</span><select class="input" id="tpM" aria-label="Minute">' + m + '</select>' +
      '<select class="input" id="tpA" aria-label="AM or PM"><option' + (p.ap === 'AM' ? ' selected' : '') + '>AM</option><option' + (p.ap === 'PM' ? ' selected' : '') + '>PM</option></select></div>';
  }
  function pickerVal() { return L.from12($('tpH').value, $('tpM').value, $('tpA').value); }
  function timeModal(key) {
    var a = cur(), T = L.TIMES.filter(function (t) { return t.key === key; })[0], old = a.times[key];
    modal('<h2>' + T.label + '</h2><p>' + (old ? 'Currently ' + L.fmt12(old) + '. The change is kept in the correction log.' : T.hint) + '</p>' + pickerHtml(old) +
      '<div class="mrow"><button class="btn" id="mNow">Now</button>' + (old && key !== 'end' ? '<button class="btn" id="mClear">Clear</button>' : '') + '</div>' +
      '<div class="mrow"><button class="btn" id="mCancel">Cancel</button><button class="btn pri" id="mOk">Save</button></div>', function () {
      $('mNow').onclick = function () { var p = L.split12(L.nowHM()); $('tpH').value = p.h; $('tpM').value = p.m; $('tpA').value = p.ap; };
      if ($('mClear')) $('mClear').onclick = function () { L.setTime(a, key, ''); touch(a); closeModal(); renderTimes(); };
      $('mCancel').onclick = closeModal;
      $('mOk').onclick = function () { var v = pickerVal(), ch = L.setTime(a, key, v); if (ch) touch(a); closeModal(); renderTimes(); if (ch && old) toast('Corrected: ' + L.fmt12(old) + ' → ' + L.fmt12(v)); };
    });
  }
  function endModal() {
    var a = cur(), outcome = a.outcome || '';
    modal('<h2>End Code Blue</h2><p>Time of termination</p>' + pickerHtml(a.times.end) +
      '<div class="mrow"><button class="btn" id="mNow">Now</button></div>' +
      '<p>Outcome</p><div class="choice"><button class="rosc' + (outcome === 'ROSC' ? ' sel' : '') + '" data-o="ROSC">ROSC</button><button class="death' + (outcome === 'Death' ? ' sel' : '') + '" data-o="Death">DEATH</button></div>' +
      '<div class="mrow"><button class="btn" id="mCancel">Cancel</button><button class="btn pri" id="mOk"' + (outcome ? '' : ' disabled') + '>Save</button></div>', function () {
      $('mNow').onclick = function () { var p = L.split12(L.nowHM()); $('tpH').value = p.h; $('tpM').value = p.m; $('tpA').value = p.ap; };
      Array.prototype.forEach.call(document.querySelectorAll('[data-o]'), function (b) {
        b.onclick = function () { outcome = b.dataset.o; Array.prototype.forEach.call(document.querySelectorAll('[data-o]'), function (x) { x.classList.toggle('sel', x === b); }); $('mOk').disabled = false; };
      });
      $('mCancel').onclick = closeModal;
      $('mOk').onclick = function () {
        L.setTime(a, 'end', pickerVal()); a.outcome = outcome; a.status = 'closed'; touch(a); closeModal(); renderTimes();
        toast('Code Blue ended · ' + outcome.toUpperCase());
        setTimeout(backupPrompt, 700);
      };
    });
  }

  /* checklist */
  $('checklist').addEventListener('click', function (e) {
    var nb = e.target.closest('[data-note]');
    if (nb) { var t = nb.closest('[data-item]').querySelector('textarea'); t.classList.toggle('hidden'); if (!t.classList.contains('hidden')) t.focus(); return; }
    var b = e.target.closest('[data-yn]'); if (!b) return;
    var a = cur(), row = b.closest('[data-item]'), id = row.dataset.item, v = b.dataset.yn;
    if (a.checks[id] === v) delete a.checks[id]; else a.checks[id] = v;
    touch(a);
    var nv = a.checks[id] || '';
    Array.prototype.forEach.call(row.querySelectorAll('[data-yn]'), function (x) { x.classList.toggle('sel', x.dataset.yn === nv); x.setAttribute('aria-pressed', x.dataset.yn === nv); });
    row.classList.toggle('isN', nv === 'N');
    var sec = row.closest('.sec'), si = +sec.dataset.sec, s = L.SECTIONS[si];
    var chip = sec.querySelector('.sec-head .chip'), sc = secCount(a, s); chip.textContent = sc; chip.classList.toggle('bad', /NO/.test(sc));
    row.classList.toggle('isNA', nv === 'NA');
    var ta = row.querySelector('textarea'); if (nv === 'N' || nv === 'NA') ta.classList.remove('hidden'); else if (!ta.value) ta.classList.add('hidden');
    renderScore();
  });
  var remT = null;
  $('checklist').addEventListener('input', function (e) {
    var t = e.target; if (!t.dataset.rem) return;
    var a = cur(); if (t.value) a.remarks[t.dataset.rem] = t.value; else delete a.remarks[t.dataset.rem];
    var nbtn = t.closest('[data-item]').querySelector('[data-note]'); if (nbtn) nbtn.classList.toggle('has', !!t.value);
    clearTimeout(remT); remT = setTimeout(function () { touch(a); }, 400);
  });

  $('btnDelete').addEventListener('click', function () {
    var a = cur();
    modal('<h2>Delete this audit?</h2><p>' + esc(a.kind) + ' · ' + esc(a.location || 'no location') + ' · ' + L.fmtDate(a.date) + '. Its times and checklist will be removed from this phone. Export a PDF first if you need a copy.</p>' +
      '<div class="mrow"><button class="btn" id="mCancel">Keep</button><button class="btn end" id="mOk">Delete</button></div>', function () {
      $('mCancel').onclick = closeModal;
      $('mOk').onclick = function () { audits = audits.filter(function (x) { return x.id !== a.id; }); persist(); closeModal(); curId = null; renderHome(); show('home'); toast('Audit deleted'); };
    });
  });

  /* targets */
  $('btnTargets').addEventListener('click', function () {
    modal('<h2>KPI targets</h2><p>Minutes. Used for the “within target” figures on screen and in the PDF. Set these to your hospital Code Blue policy.</p>' +
      '<label class="fld"><span class="label">Arrest → Code Blue initiated</span><input class="input" id="tg1" type="number" inputmode="decimal" min="0" step="0.5" value="' + targets.called + '"></label>' +
      '<label class="fld"><span class="label">Arrest → CPR initiated</span><input class="input" id="tg2" type="number" inputmode="decimal" min="0" step="0.5" value="' + targets.cpr + '"></label>' +
      '<label class="fld"><span class="label">Code Blue → team arrival</span><input class="input" id="tg3" type="number" inputmode="decimal" min="0" step="0.5" value="' + targets.team + '"></label>' +
      '<div class="mrow"><button class="btn" id="mCancel">Cancel</button><button class="btn pri" id="mOk">Save</button></div>', function () {
      $('mCancel').onclick = closeModal;
      $('mOk').onclick = function () {
        targets = { called: +$('tg1').value || 0, cpr: +$('tg2').value || 0, team: +$('tg3').value || 0 };
        save('cba.targets', targets); closeModal(); renderHome(); toast('Targets saved');
      };
    });
  });

  /* modal */
  function modal(html, bind) { $('modalBody').innerHTML = html; $('modal').classList.remove('hidden'); bind(); }
  function closeModal() { $('modal').classList.add('hidden'); $('modalBody').innerHTML = ''; }
  $('modal').addEventListener('click', function (e) { if (e.target === this) closeModal(); });

  /* ---------- export: PDF, backup, import ---------- */
  function b64(buf) {
    var bytes = new Uint8Array(buf), bin = '', chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(bin);
  }
  function shareFile(name, mime, data, isText) {
    // Android app: write to cache and open the share sheet (Save to Drive / Files, WhatsApp, Mail, Print…)
    if (NATIVE && N.Filesystem) {
      var opts = { path: name, directory: N.Directory.Cache };
      if (isText) { opts.data = data; opts.encoding = 'utf8'; } else opts.data = b64(data);
      return N.Filesystem.writeFile(opts)
        .then(function (r) { return N.Share.share({ title: name, dialogTitle: 'Save or share ' + name, files: [r.uri] }); })
        .then(function () { return true; })
        .catch(function (e) { if (!/cancel/i.test(String(e && e.message))) toast('Could not share: ' + (e && e.message || e)); return false; });
    }
    // iPhone / browser: share sheet with the file, else download
    var blob = new Blob([data], { type: mime }), file = null;
    try { file = new File([blob], name, { type: mime }); } catch (e) {}
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file], title: name }).then(function () { return true; }).catch(function () { return false; });
    var url = URL.createObjectURL(blob), aEl = document.createElement('a');
    aEl.href = url; aEl.download = name; document.body.appendChild(aEl); aEl.click(); aEl.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return Promise.resolve(true);
  }
  function busy(btn, label, fn) {
    var old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span><span>' + label + '</span>';
    setTimeout(function () {
      Promise.resolve().then(fn).catch(function (e) { toast('PDF error: ' + (e && e.message || e)); }).then(function () { btn.disabled = false; btn.innerHTML = old; });
    }, 30);
  }
  $('btnPdfAll').addEventListener('click', function () {
    var list = shown(); if (!list.length) return;
    busy(this, 'Preparing PDF…', function () {
      var doc = window.CBAPdf.all(list, targets, filter);
      return shareFile(window.CBAPdf.allName(filter), 'application/pdf', doc.output('arraybuffer'));
    });
  });
  $('btnPdfOne').addEventListener('click', function () {
    var a = cur(); if (!a) return;
    busy(this, 'Preparing PDF…', function () {
      var doc = window.CBAPdf.one(a, targets);
      return shareFile(window.CBAPdf.oneName(a), 'application/pdf', doc.output('arraybuffer'));
    });
  });
  function doBackup() {
    if (!audits.length) { toast('No audits to back up yet'); return Promise.resolve(false); }
    var now = new Date().toISOString();
    var data = JSON.stringify({ app: 'code-blue-audit', version: 1, exportedAt: now, targets: targets, audits: audits });
    return shareFile('Audit Code Blue backup ' + L.todayISO() + '.json', 'application/json', data, true).then(function (ok) {
      if (ok) { save('cba.lastBackup', now); renderBackup(); toast('Backup saved. Keep the file in your email or Drive.'); }
      return ok;
    });
  }
  $('btnBackup').addEventListener('click', doBackup);
  // "Last backup" line: red when never backed up or older than 7 days
  function renderBackup() {
    var el = $('backupStatus'); if (!el) return;
    var last = load('cba.lastBackup', null);
    var changed = audits.filter(function (a) { return !last || (a.updatedAt || '') > last; }).length;
    if (!audits.length) { el.className = 'bstat'; el.innerHTML = 'Back up regularly: email the file to yourself or save it to Drive.'; return; }
    var days = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;
    var when = last == null ? 'Never backed up' : 'Last backup ' + (days === 0 ? 'today' : days === 1 ? 'yesterday' : days + ' days ago');
    var stale = last == null || days > 7;
    el.className = 'bstat' + (stale ? ' bad' : changed ? ' warn' : ' ok');
    el.innerHTML = '<i></i><span><b>' + when + '</b>' + (changed ? ' · ' + changed + ' audit' + (changed === 1 ? '' : 's') + ' not yet backed up' : ' · all audits backed up') + '</span>';
  }
  function backupPrompt() {
    modal('<h2>Back up now?</h2><p>This audit is complete. Send the backup file to your own email or Google Drive, so the audits can be restored if this phone is lost or the app is removed.</p>' +
      '<div class="mrow"><button class="btn" id="mCancel">Later</button><button class="btn pri" id="mOk">Back up</button></div>', function () {
      $('mCancel').onclick = closeModal;
      $('mOk').onclick = function () { closeModal(); doBackup(); };
    });
  }
  $('btnImport').addEventListener('click', function () { $('importFile').value = ''; $('importFile').click(); });
  $('importFile').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var j = JSON.parse(r.result), inc = Array.isArray(j) ? j : j.audits;
        if (!Array.isArray(inc)) throw new Error('not an Audit Code Blue backup');
        var m = L.mergeAudits(audits, inc); audits = m.list; persist(); renderHome();
        toast('Imported: ' + m.added + ' new, ' + m.updated + ' updated');
      } catch (e) { toast('Could not import: ' + e.message); }
    };
    r.readAsText(f);
  });

  /* Android back button */
  if (NATIVE && N.App) N.App.addListener('backButton', function () {
    if (!$('modal').classList.contains('hidden')) closeModal();
    else if (!$('audit').classList.contains('hidden')) $('btnBack').click();
    else N.App.exitApp();
  });

  if ('serviceWorker' in navigator && location.protocol === 'https:' && !NATIVE) navigator.serviceWorker.register('sw.js').catch(function () {});
  renderHome();
})();
