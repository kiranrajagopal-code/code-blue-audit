/* Code Blue Audit — PDF reports (all audits with KPIs, or a single audit) */
(function (root) {
  'use strict';
  var OWNER = 'Dr. Kiran Rajagopal';
  var BLUE = [29, 78, 216], DARK = [30, 41, 59], LIGHT = [244, 246, 249];
  var GREEN = [21, 128, 61], RED = [185, 28, 28], GRAY = [100, 116, 139];

  // the built-in PDF font has no ≤ → – etc.; swap them for plain equivalents
  function T(s) {
    return String(s == null ? '' : s).replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/→/g, '->').replace(/[–—−]/g, '-')
      .replace(/÷/g, '/').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...').replace(/[^\x00-\xFF]/g, '');
  }
  function L() { return root.CBA; }
  function newDoc() { return new root.CBPdf.jsPDF({ unit: 'mm', format: 'a4' }); }
  function at(doc) { return root.CBPdf.autoTable; }
  var M = 14;

  function band(doc, title, sub) {
    var W = doc.internal.pageSize.getWidth();
    doc.setFillColor(BLUE[0], BLUE[1], BLUE[2]); doc.rect(0, 0, W, 22, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text(T(title), M, 14);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(T(sub), W - M, 14, { align: 'right' });
    doc.setTextColor(20);
  }
  function heading(doc, y, text) {
    if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(20); doc.text(T(text), M, y); return y + 3;
  }
  function footers(doc) {
    var pages = doc.getNumberOfPages(), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    for (var i = 1; i <= pages; i++) {
      doc.setPage(i); doc.setDrawColor(220); doc.line(M, H - 14, W - M, H - 14);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120);
      doc.text(T('Code Blue Audit · Developed by ' + OWNER + ' · Generated ' + stamp()), M, H - 9);
      doc.text('Page ' + i + ' of ' + pages, W - M, H - 9, { align: 'right' });
    }
  }
  function stamp() { var d = new Date(); return L().fmtDate(L().todayISO(d)) + ', ' + L().fmt12(L().nowHM(d)); }
  function iv(v, t) { if (v == null) return '-'; return T(L().fmtMin(v)) + (t == null ? '' : (v <= t ? '  (within target)' : '  (target <= ' + t + ' min)')); }

  /* one audit, starting at y on the current page */
  function auditPages(doc, a, targets, y) {
    var C = L(), autoTable = at(doc), t = a.times || {}, x = C.intervals(a), c = C.compliance(a);
    autoTable(doc, {
      startY: y, theme: 'grid', margin: { left: M, right: M },
      styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: LIGHT, cellWidth: 34 }, 1: { cellWidth: 57 }, 2: { fontStyle: 'bold', fillColor: LIGHT, cellWidth: 34 } },
      body: [
        ['Type', a.kind === 'Mock' ? 'MOCK DRILL' : 'REAL CODE', 'Date', C.fmtDate(a.date)],
        ['Location / bed', T(a.location || '-'), 'Initial rhythm', a.rhythm || '-'],
        ['Team leader', T(a.leader || '-'), 'Observer(s)', T(a.observers || '-')],
        ['Outcome', a.status === 'closed' ? (a.outcome || '-').toUpperCase() : 'In progress', 'Compliance', (c.pct == null ? '-' : c.pct + '%') + '  (' + c.y + ' yes, ' + c.n + ' no, ' + c.na + ' N/A, ' + c.blank + ' blank)']
      ]
    });
    y = heading(doc, doc.lastAutoTable.finalY + 8, 'Times');
    autoTable(doc, {
      startY: y, theme: 'grid', margin: { left: M, right: M },
      head: [['Event', 'Clock time', 'Interval']], headStyles: { fillColor: DARK },
      styles: { fontSize: 9, cellPadding: 2 }, columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 32 } },
      body: [
        ['Time of arrest', C.fmt12(t.arrest) || '-', ''],
        ['Code Blue initiated', C.fmt12(t.called) || '-', 'Arrest -> Code Blue: ' + iv(x.called, targets.called)],
        ['CPR initiated', C.fmt12(t.cpr) || '-', 'Arrest -> CPR: ' + iv(x.cpr, targets.cpr)],
        ['Code Blue team arrival', C.fmt12(t.team) || '-', 'Code Blue -> team: ' + iv(x.team, targets.team)],
        ['Termination of Code Blue', C.fmt12(t.end) || '-', 'Duration from CPR start: ' + iv(x.duration, null)]
      ],
      didParseCell: function (d) {
        if (d.section === 'body' && d.column.index === 2) {
          var s = String(d.cell.raw);
          if (/within target/.test(s)) d.cell.styles.textColor = GREEN; else if (/target <=/.test(s)) d.cell.styles.textColor = RED;
        }
      }
    });
    if (a.log && a.log.length) {
      y = heading(doc, doc.lastAutoTable.finalY + 8, 'Time corrections');
      autoTable(doc, {
        startY: y, theme: 'striped', margin: { left: M, right: M }, headStyles: { fillColor: DARK }, styles: { fontSize: 9, cellPadding: 1.8 },
        head: [['Time', 'Changed from', 'Changed to', 'Corrected on']],
        body: a.log.map(function (l) { var d = new Date(l.at); return [T(l.label), C.fmt12(l.from) || '-', C.fmt12(l.to) || 'cleared', C.fmtDate(C.todayISO(d)) + ', ' + C.fmt12(C.nowHM(d))]; })
      });
    }
    y = heading(doc, doc.lastAutoTable.finalY + 8, 'Audit checklist');
    var body = [];
    C.SECTIONS.forEach(function (s, si) {
      body.push([{ content: (si + 1) + '. ' + T(s[0]).toUpperCase(), colSpan: 4, styles: { fillColor: [226, 232, 240], fontStyle: 'bold', textColor: 20 } }]);
      s[1].forEach(function (i) {
        var v = a.checks && a.checks[i[0]];
        body.push([i[0], T(i[1]), v ? C.ANS[v] : '', T((a.remarks && a.remarks[i[0]]) || '')]);
      });
    });
    autoTable(doc, {
      startY: y, theme: 'grid', margin: { left: M, right: M, bottom: 20 },
      head: [['#', 'Check', 'Done?', 'Remarks']], headStyles: { fillColor: DARK },
      styles: { fontSize: 8.5, cellPadding: 1.6, valign: 'middle' },
      columnStyles: { 0: { cellWidth: 11 }, 1: { cellWidth: 92 }, 2: { cellWidth: 16, halign: 'center', fontStyle: 'bold' } },
      body: body,
      didParseCell: function (d) {
        if (d.section !== 'body' || d.column.index !== 2) return;
        var v = d.cell.raw;
        if (v === 'YES') d.cell.styles.textColor = GREEN; else if (v === 'NO') { d.cell.styles.textColor = 255; d.cell.styles.fillColor = RED; } else if (v === 'N/A') d.cell.styles.textColor = GRAY;
      }
    });
    return doc.lastAutoTable.finalY;
  }

  function one(a, targets) {
    var doc = newDoc();
    band(doc, 'CODE BLUE AUDIT', (a.kind === 'Mock' ? 'Mock drill' : 'Real code') + ' · ' + L().fmtDate(a.date) + ' · ' + (a.location || ''));
    var y = auditPages(doc, a, targets, 28);
    signoff(doc, y);
    footers(doc); return doc;
  }
  function signoff(doc, y) {
    y += 14; if (y > doc.internal.pageSize.getHeight() - 34) { doc.addPage(); y = 24; }
    var W = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(20);
    doc.text('Audited by: ______________________________', M, y); doc.text('Signature: _______________', W - M - 62, y);
    doc.text('Quality team: ____________________________', M, y + 10); doc.text('Date: _______________', W - M - 62, y + 10);
  }

  function all(list, targets, filter) {
    var C = L(), autoTable = at(), doc = newDoc(), k = C.kpis(list, targets);
    var dates = list.map(function (a) { return a.date; }).filter(Boolean).sort();
    var range = dates.length ? C.fmtDate(dates[0]) + ' to ' + C.fmtDate(dates[dates.length - 1]) : '';
    band(doc, 'CODE BLUE AUDIT REPORT', (filter === 'All' ? 'Real + mock' : filter + ' only') + ' · ' + range);
    var y = heading(doc, 32, 'Key indicators (' + k.count + ' audits: ' + k.real + ' real, ' + k.mock + ' mock)');
    var med = function (v) { return v == null ? '-' : v + ' min'; };
    var pc = function (v) { return v == null ? '-' : v + '%'; };
    autoTable(doc, {
      startY: y, theme: 'grid', margin: { left: M, right: M }, headStyles: { fillColor: DARK }, styles: { fontSize: 9.5, cellPadding: 2.2 },
      head: [['Indicator', 'Result', 'Within target', 'Target', 'n']],
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 62 } },
      body: [
        ['Arrest -> Code Blue initiated (median)', med(k.called.median), pc(k.called.within), '<= ' + targets.called + ' min', k.called.n],
        ['Arrest -> CPR initiated (median)', med(k.cpr.median), pc(k.cpr.within), '<= ' + targets.cpr + ' min', k.cpr.n],
        ['Code Blue -> team arrival (median)', med(k.team.median), pc(k.team.within), '<= ' + targets.team + ' min', k.team.n],
        ['Checklist compliance (mean, YES / (YES+NO))', pc(k.compliance.mean), '', '', k.compliance.n],
        ['ROSC rate (ended codes)', pc(k.outcome.roscPct), '', '', k.outcome.ended],
        ['ROSC / death', k.outcome.rosc + ' / ' + k.outcome.death, '', '', k.outcome.ended],
        ['Code duration, CPR -> termination (median)', med(k.duration.median), '', '', k.duration.n]
      ]
    });
    y = heading(doc, doc.lastAutoTable.finalY + 8, 'Compliance by phase');
    autoTable(doc, {
      startY: y, theme: 'striped', margin: { left: M, right: M }, headStyles: { fillColor: DARK }, styles: { fontSize: 9.5, cellPadding: 2 },
      head: [['Phase', 'YES', 'Answered (YES+NO)', 'Compliance']],
      body: k.sections.map(function (s, i) { return [(i + 1) + '. ' + T(s.name), s.yes, s.answered, s.pct == null ? '-' : s.pct + '%']; }),
      didParseCell: function (d) {
        if (d.section === 'body' && d.column.index === 3) { var p = parseInt(d.cell.raw, 10); if (!isNaN(p)) d.cell.styles.textColor = p >= 80 ? GREEN : p >= 60 ? [161, 98, 7] : RED; d.cell.styles.fontStyle = 'bold'; }
      }
    });
    if (k.topNo.length) {
      y = heading(doc, doc.lastAutoTable.finalY + 8, 'Items most often marked NO');
      autoTable(doc, {
        startY: y, theme: 'striped', margin: { left: M, right: M }, headStyles: { fillColor: RED }, styles: { fontSize: 9, cellPadding: 1.8 },
        head: [['#', 'Check', 'Times NO']], columnStyles: { 0: { cellWidth: 12 }, 2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' } },
        body: k.topNo.slice(0, 10).map(function (t) { return [t.id, T(t.q), t.count]; })
      });
    }
    y = heading(doc, doc.lastAutoTable.finalY + 8, 'All audits');
    autoTable(doc, {
      startY: y, theme: 'grid', margin: { left: M, right: M, bottom: 20 }, headStyles: { fillColor: DARK, fontSize: 7.5 }, styles: { fontSize: 7.5, cellPadding: 1.4 },
      head: [['Date', 'Type', 'Location', 'Rhythm', 'Arrest', 'Code Blue', 'CPR', 'Team', 'End', 'Outcome', 'Compl.']],
      body: list.map(function (a) {
        var t = a.times || {}, c = C.compliance(a);
        return [C.fmtDate(a.date), a.kind, T(a.location || '-'), a.rhythm || '-', C.fmt12(t.arrest) || '-', C.fmt12(t.called) || '-', C.fmt12(t.cpr) || '-', C.fmt12(t.team) || '-', C.fmt12(t.end) || '-',
          a.status === 'closed' ? (a.outcome || '-') : 'Open', c.pct == null ? '-' : c.pct + '%'];
      })
    });
    list.forEach(function (a, i) {
      doc.addPage();
      band(doc, 'AUDIT ' + (i + 1) + ' OF ' + list.length, (a.kind === 'Mock' ? 'Mock drill' : 'Real code') + ' · ' + C.fmtDate(a.date) + ' · ' + (a.location || ''));
      auditPages(doc, a, targets, 28);
    });
    footers(doc); return doc;
  }

  function oneName(a) { return 'CodeBlueAudit_' + (a.kind || '') + '_' + (a.date || '') + '_' + ((a.times && a.times.arrest) || '').replace(':', '') + '.pdf'; }
  function allName(filter) { return 'CodeBlueAudit_Report_' + (filter || 'All') + '_' + L().todayISO() + '.pdf'; }

  root.CBAPdf = { one: one, all: all, oneName: oneName, allName: allName, T: T };
})(this);
