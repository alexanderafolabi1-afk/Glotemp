/* Glotemp Admin: sparklines, trends and small shapes.
 *
 * Admin-scoped. Nothing here is loaded by, or reachable from, the public
 * site. No dependency beyond the DOM.
 *
 * Inline SVG, drawn from real series. There is no chart library and no
 * image file: see CLAUDE.md, and the same approach the site already takes
 * for the spin dial and the city landmarks.
 */
(function () {
  'use strict';

  // Matches --adm-brass-text in admin-ui.css. Sparklines are decoration
  // rather than text, but keeping one accent means the figure and its trend
  // read as one object.
  var BRASS = '#D4AC71';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // A sparkline over `values`. Returns '' for anything unplottable, so a
  // missing series simply shows nothing rather than a flat line pretending
  // to be data.
  function spark(values, opts) {
    var v = (values || []).map(Number).filter(function (n) { return Number.isFinite(n); });
    if (v.length < 2) return '';
    var o = opts || {};
    var w = o.width || 64;
    var h = o.height || 18;
    var colour = o.colour || BRASS;

    var min = Math.min.apply(null, v);
    var max = Math.max.apply(null, v);
    var span = max - min || 1;
    var step = (w - 2) / (v.length - 1);

    var pts = v.map(function (n, i) {
      var x = 1 + i * step;
      var y = h - 1 - ((n - min) / span) * (h - 2);
      return x.toFixed(1) + ',' + y.toFixed(1);
    });

    var last = pts[pts.length - 1].split(',');
    return '' +
      '<svg class="adm-spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" ' +
           'aria-hidden="true" focusable="false">' +
        // The fill is what makes a 64px line legible at a glance; the
        // stroke alone reads as noise at this size.
        '<polygon points="1,' + h + ' ' + pts.join(' ') + ' ' + (w - 1) + ',' + h + '" ' +
          'fill="' + colour + '" opacity="0.13"/>' +
        '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + colour + '" ' +
          'stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="1.7" fill="' + colour + '"/>' +
      '</svg>';
  }

  // Period-on-period change. Compares the back half of a series with the
  // front half rather than last point against first, which is far less
  // jumpy on daily counts.
  function delta(values) {
    var v = (values || []).map(Number).filter(function (n) { return Number.isFinite(n); });
    if (v.length < 4) return '';
    var half = Math.floor(v.length / 2);
    var older = v.slice(0, half).reduce(function (a, b) { return a + b; }, 0);
    var newer = v.slice(half).reduce(function (a, b) { return a + b; }, 0);
    if (older === 0) return newer > 0 ? '<span class="adm-delta is-up">new</span>' : '';
    var pct = Math.round(((newer - older) / older) * 100);
    var cls = pct > 1 ? 'is-up' : pct < -1 ? 'is-down' : 'is-flat';
    var mark = pct > 1 ? '↑' : pct < -1 ? '↓' : '→';
    return '<span class="adm-delta ' + cls + '">' + mark + ' ' + Math.abs(pct) + '%</span>';
  }

  // One figure, with its trend beside it.
  function stat(value, label, opts) {
    var o = opts || {};
    var series = o.series || null;
    var trend = '';
    if (series && series.length > 1) {
      var s = spark(series, { colour: o.colour });
      var d = o.hideDelta ? '' : delta(series);
      if (s || d) trend = '<span class="adm-stat-trend">' + s + d + '</span>';
    }
    return '<div class="adm-stat' + (o.key ? ' is-key' : '') + '">' +
      '<span class="adm-stat-value">' + esc(value) + '</span>' +
      '<span class="adm-stat-label">' + esc(label) + '</span>' +
      trend +
    '</div>';
  }

  // A ranked list: label, count, and a bar whose width is the share of the
  // largest value in the list.
  function ranked(rows, opts) {
    var o = opts || {};
    var list = (rows || []).slice(0, o.limit || 8);
    if (!list.length) return '<p class="adm-copy">' + esc(o.empty || 'Nothing yet.') + '</p>';
    var top = list.reduce(function (m, r) { return Math.max(m, Number(r.count) || 0); }, 0) || 1;
    return list.map(function (r) {
      var pct = Math.round(((Number(r.count) || 0) / top) * 100);
      return '<div class="adm-row has-bar" style="--bar:' + pct + '%">' +
        '<span class="adm-row-city">' + esc(r.label) + '</span>' +
        '<span class="adm-row-count">' + esc(Number(r.count || 0).toLocaleString()) + '</span>' +
        (r.note ? '<span class="adm-row-when">' + esc(r.note) + '</span>' : '') +
      '</div>';
    }).join('');
  }

  window.GlotempAdminCharts = {
    spark: spark,
    delta: delta,
    stat: stat,
    ranked: ranked,
    esc: esc,
  };
})();
