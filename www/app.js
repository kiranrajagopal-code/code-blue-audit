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
  function tile(k, v, unit, sub, pct) {
    return '<div class="kpi"><div class="k">' + k + '</div><div class="v">' + (v == null ? '—' : v + '<small>' + unit + '</small>') + '</div>' +
      (pct != null ? '<div class="bar"><i class="' + barCls(pct) + '" style="width:' + pct + '%"></i></div>' : '') + '<div class="s">' + sub + '</div></div>';
  }
  function within(x, t) { return x.n ? '<b>' + x.within + '%</b> within ' + t + ' min · n=' + x.n : 'No data yet'; }
  function renderHome() {
    Array.prototype.forEach.call(document.querySelectorAll('#filter button'), function (b) { b.classList.toggle('sel', b.dataset.f === filter); });
    var list = shown(), k = L.kpis(list, targets);
    $('kpiCount').textContent = '· ' + k.count + (filter === 'All' ? ' (' + k.real + ' real, ' + k.mock + ' mock)' : ' ' + filter.toLowerCase());
    $('kpis').innerHTML =
      tile('Arrest → Code Blue', k.called.median, 'min', within(k.called, targets.called), k.called.within) +
      tile('Arrest → CPR', k.cpr.median, 'min', within(k.cpr, targets.cpr), k.cpr.within) +
      tile('Code Blue → team', k.team.median, 'min', within(k.team, targets.team), k.team.within) +
      tile('Checklist compliance', k.compliance.mean, '%', k.compliance.n ? 'Mean of ' + k.compliance.n + ' · YES ÷ (YES+NO)' : 'No data yet', k.compliance.mean) +
      tile('ROSC', k.outcome.roscPct, '%', k.outcome.ended ? '<b>' + k.outcome.rosc + '</b> ROSC · <b>' + k.outcome.death + '</b> death' : 'No ended codes', k.outcome.roscPct) +
      tile('Code duration', k.duration.median, 'min', k.duration.n ? 'Median, CPR → termination' : 'No ended codes', null);
    $('phaseCard').classList.toggle('hidden', !list.length);
    $('phases').innerHTML = k.sections.map(function (s, i) {
      return '<div class="phase"><span>' + (i + 1) + '. ' + esc(s.name) + '</span><div class="bar" style="margin:0"><i class="' + barCls(s.pct) + '" style="width:' + (s.pct || 0) + '%"></i></div><span class="p">' + (s.pct == null ? '—' : s.pct + '%') + '</span></div>';
    }).join('');
    $('topNoWrap').classList.toggle('hidden', !k.topNo.length);
    $('topNo').innerHTML = k.topNo.slice(0, 5).map(function (t) { return '<li>' + t.id + ' ' + esc(t.q) + ' · <b>' + t.count + '×</b></li>'; }).join('');
    $('btnPdfAll').disabled = !list.length;
    $('list').innerHTML = list.length ? list.map(function (a) {
      var c = L.compliance(a);
      var st = a.status === 'closed' ? '<span class="pill ' + (a.outcome === 'ROSC' ? 'rosc' : 'death') + '">' + esc((a.outcome || 'ENDED').toUpperCase()) + '</span>' : '<span class="pill open">IN PROGRESS</span>';
      return '<button class="h-item" data-open="' + a.id + '"><span class="pill ' + (a.kind === 'Mock' ? 'mock' : 'real') + '">' + a.kind.toUpperCase() + '</span>' +
        '<span><span class="h-title">' + esc(a.location || 'Location not entered') + '</span><br><span class="h-sub">' + L.fmtDate(a.date) + ' · arrest ' + (L.fmt12(a.times.arrest) || '—') + (a.rhythm ? ' · ' + a.rhythm : '') + '</span></span>' +
        '<span class="h-right"><span class="h-pct">' + (c.pct == null ? '—' : c.pct + '%') + '</span>' + st + '</span></button>';
    }).join('') : '<div class="muted">No ' + (filter === 'All' ? '' : filter.toLowerCase() + ' ') + 'audits yet. Tap NEW AUDIT when a Code Blue or mock drill begins.</div>';
    $('iosInstall').classList.toggle('hidden', !(IOS && !STANDALONE && !NATIVE));
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
    var c = L.compliance(cur());
    $('scorePct').textContent = c.pct == null ? '—' : c.pct + '%';
    $('scoreSub').textContent = '· mark only NO or N/A; unmarked = YES · ' + c.n + ' no · ' + c.na + ' N/A';
  }
  function ivBadge(v, t, from) { if (v == null) return ''; return '<span class="iv ' + (v <= t ? 'ok' : 'bad') + '">' + L.fmtMin(v) + ' ' + from + ' · target ≤' + t + '</span>'; }
  function renderTimes() {
    var a = cur(), t = a.times, iv = L.intervals(a);
    $('times').innerHTML = L.TIMES.map(function (T) {
      var v = t[T.key], right = '';
      if (T.key === 'called') right = ivBadge(iv.called, targets.called, 'after arrest');
      if (T.key === 'cpr') right = ivBadge(iv.cpr, targets.cpr, 'after arrest');
      if (T.key === 'team') right = ivBadge(iv.team, targets.team, 'after Code Blue');
      if (T.key === 'adr' && iv.firstAdr != null) right = '<span class="iv">' + L.fmtMin(iv.firstAdr) + ' after arrest</span>';
      if (T.key === 'end') {
        if (a.status !== 'closed') return '<div class="trow"><div><div class="tname">' + T.label + '</div><div class="thint">Records the time and asks: ROSC or death?</div></div><div></div>' +
          '<div class="tval"><button class="btn end wide" data-end style="margin:0">END CODE BLUE</button></div></div>';
        right = '<span class="outcome ' + (a.outcome === 'ROSC' ? 'rosc' : 'death') + '">' + esc((a.outcome || '').toUpperCase()) + '</span>';
        return '<div class="trow"><div><div class="tname">' + T.label + '</div><div class="thint">' + (iv.duration != null ? 'Duration ' + L.fmtMin(iv.duration) + ' from CPR start' : T.hint) + '</div></div><div>' + right + '</div>' +
          '<div class="tval"><button class="tclock" data-edit="end">' + (L.fmt12(v) || 'Not set') + '</button><button class="btn" data-end>Change outcome</button></div></div>';
      }
      return '<div class="trow"><div><div class="tname">' + T.label + '</div><div class="thint">' + T.hint + '</div></div><div>' + right + '</div>' +
        '<div class="tval"><button class="tclock' + (v ? '' : ' empty') + '" data-edit="' + T.key + '">' + (v ? L.fmt12(v) : 'Not set — tap to enter') + '</button><button class="tnow" data-now="' + T.key + '">NOW</button></div></div>';
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
      return '<div class="sec" data-sec="' + si + '"><h3>' + (si + 1) + '. ' + esc(s[0]) + '<small>' + secCount(a, s) + '</small></h3>' +
        s[1].map(function (i) {
          var v = a.checks[i[0]] || '', r = a.remarks[i[0]] || '';
          return '<div class="it' + (v === 'N' ? ' isN' : '') + '" data-item="' + i[0] + '"><div class="q"><span class="n">' + i[0] + '</span><span>' + esc(i[1]) + '</span></div>' +
            '<div class="yn">' + ['Y', 'N', 'NA'].map(function (k) { return '<button class="' + k + (v === k ? ' sel' : '') + '" data-yn="' + k + '" aria-pressed="' + (v === k) + '">' + L.ANS[k] + '</button>'; }).join('') + '</div>' +
            '<textarea rows="1" placeholder="Remarks" data-rem="' + i[0] + '" aria-label="Remarks for ' + i[0] + '">' + esc(r) + '</textarea></div>';
        }).join('') + '</div>';
    }).join('');
  }

  /* details */
  $('kindSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var a = cur(); a.kind = b.dataset.kind; touch(a); renderAudit(); });
  [['fDate', 'date'], ['fRhythm', 'rhythm']].forEach(function (p) { $(p[0]).addEventListener('change', function () { var a = cur(); a[p[1]] = this.value; touch(a); }); });
  [['fLocation', 'location'], ['fLeader', 'leader'], ['fObservers', 'observers']].forEach(function (p) { $(p[0]).addEventListener('input', function () { var a = cur(); a[p[1]] = this.value; touch(a); }); });

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
      };
    });
  }

  /* checklist */
  $('checklist').addEventListener('click', function (e) {
    var b = e.target.closest('[data-yn]'); if (!b) return;
    var a = cur(), row = b.closest('[data-item]'), id = row.dataset.item, v = b.dataset.yn;
    if (a.checks[id] === v) delete a.checks[id]; else a.checks[id] = v;
    touch(a);
    var nv = a.checks[id] || '';
    Array.prototype.forEach.call(row.querySelectorAll('[data-yn]'), function (x) { x.classList.toggle('sel', x.dataset.yn === nv); x.setAttribute('aria-pressed', x.dataset.yn === nv); });
    row.classList.toggle('isN', nv === 'N');
    var sec = row.closest('.sec'), si = +sec.dataset.sec, s = L.SECTIONS[si];
    sec.querySelector('h3 small').textContent = secCount(a, s);
    renderScore();
  });
  var remT = null;
  $('checklist').addEventListener('input', function (e) {
    var t = e.target; if (!t.dataset.rem) return;
    var a = cur(); if (t.value) a.remarks[t.dataset.rem] = t.value; else delete a.remarks[t.dataset.rem];
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
        .catch(function (e) { if (!/cancel/i.test(String(e && e.message))) toast('Could not share: ' + (e && e.message || e)); });
    }
    // iPhone / browser: share sheet with the file, else download
    var blob = new Blob([data], { type: mime }), file = null;
    try { file = new File([blob], name, { type: mime }); } catch (e) {}
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file], title: name }).catch(function () {});
    var url = URL.createObjectURL(blob), aEl = document.createElement('a');
    aEl.href = url; aEl.download = name; document.body.appendChild(aEl); aEl.click(); aEl.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return Promise.resolve();
  }
  function busy(btn, label, fn) {
    var old = btn.textContent; btn.disabled = true; btn.textContent = label;
    setTimeout(function () {
      Promise.resolve().then(fn).catch(function (e) { toast('PDF error: ' + (e && e.message || e)); }).then(function () { btn.disabled = false; btn.textContent = old; });
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
  $('btnBackup').addEventListener('click', function () {
    if (!audits.length) { toast('No audits to back up yet'); return; }
    var data = JSON.stringify({ app: 'code-blue-audit', version: 1, exportedAt: new Date().toISOString(), targets: targets, audits: audits });
    shareFile('Audit Code Blue backup ' + L.todayISO() + '.json', 'application/json', data, true);
  });
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
