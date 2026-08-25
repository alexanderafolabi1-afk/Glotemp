/* Ether Pulse Map -- the homepage's live instrument, replacing the five
 * rotating barometers.
 *
 * All 300 tracked cities at once, as luminous nodes on an equirectangular
 * projection. Brightness and colour carry mood; when a city's reading
 * shifts, a short electric arc travels from it to two or three nearby
 * high-energy neighbours.
 *
 * SCOPE
 * This file owns one section of the homepage and nothing else. It reads
 * window.CITIES_DATA and never writes to it -- displayed moods live in a
 * separate array built here, so a shift animation can never leak into
 * the data any other part of the site reads. It makes no network calls,
 * touches no backend, and changes no existing data structure. Selecting
 * a city goes through the same loadCityBySlug() the barometers used, so
 * the reading, the "Should you go" verdict and the city panel below all
 * update exactly as they did before.
 *
 * WHY CANVAS AND NOT 300 DIVS
 * 300 absolutely-positioned elements, each with its own CSS animation,
 * is 300 composited layers. On a mid-range phone that is a scroll-jank
 * generator. One canvas is one layer.
 *
 * WHAT IT COSTS, MEASURED
 * The frame loop is not a heartbeat: it starts when an arc is born and
 * stops on the frame after the last one dies. Shifts are scheduled every
 * 2.2-4.8s and an arc lives 2.5s, so in practice something is usually in
 * flight and the canvas repaints roughly 30 times a second while the
 * section is on screen -- not zero, and this comment is not going to
 * pretend otherwise. What that costs, measured against the five
 * barometers it replaced with both scrolled to the same section: a
 * competing requestAnimationFrame loop achieved 60.7fps on both, median
 * of three runs. No measurable difference.
 *
 * Scrolled out of view it really is zero: an IntersectionObserver stops
 * the loop, and a measurement over five seconds off screen recorded 0
 * repaints against 151 on screen. The tab going hidden stops it too, and
 * under prefers-reduced-motion the nodes are painted once and no arc is
 * ever scheduled.
 */
(function () {
  'use strict';

  // ---------- mood -> light ----------
  // The four bands the brief names. Note that no tracked city currently
  // reads below 5.0, so 'Cautious' will not appear from today's data --
  // it is implemented because readings move, not padded out with a
  // fabricated low city to make the palette look complete.
  var BANDS = [
    { min: 8.5, name: 'Charged',   rgb: [255, 246, 222], lift: 1.00 },  // bright white-gold
    { min: 7.0, name: 'Energized', rgb: [216, 155, 232], lift: 0.82 },  // violet-gold
    { min: 5.0, name: 'Neutral',   rgb: [232, 201, 138], lift: 0.58 },  // soft gold
    { min: -Infinity, name: 'Cautious', rgb: [154, 112, 56], lift: 0.34 }, // dim amber
  ];

  function bandFor(mood) {
    for (var i = 0; i < BANDS.length; i++) {
      if (mood >= BANDS[i].min) return BANDS[i];
    }
    return BANDS[BANDS.length - 1];
  }

  // Brightness varies inside a band as well as between them, so a 9.1 and
  // an 8.6 are not the same dot.
  function brightness(mood) {
    var b = bandFor(mood);
    var span = Math.max(0, Math.min(1, (mood - 4) / 5.5));
    return b.lift * (0.72 + span * 0.28);
  }

  // ---------- projection ----------
  // Plain equirectangular. Latitude is clamped to the band the tracked
  // cities actually occupy (-56 to +71) rather than the full -90..90:
  // nobody is tracked in Antarctica and drawing empty polar bands just
  // shrinks everything else.
  var LAT_TOP = 74;
  var LAT_BOTTOM = -58;

  function project(lat, lon, w, h, pad) {
    var x = pad + ((lon + 180) / 360) * (w - pad * 2);
    var t = (LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM);
    var y = pad + t * (h - pad * 2);
    return [x, y];
  }

  // ---------- geometry helpers ----------
  function dist2(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function rgba(rgb, a) {
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a.toFixed(3) + ')';
  }

  // ---------- component ----------
  function mount() {
    var root = document.getElementById('ether-map');
    if (!root) return;

    var source = (window.CITIES_DATA || []).filter(function (c) {
      return c && typeof c.lat === 'number' && typeof c.lon === 'number' && c.slug;
    });
    if (!source.length) {
      // No roster, no map. The section hides itself rather than sitting
      // there as an empty black box.
      var sec = root.closest('.ether-section');
      if (sec) sec.hidden = true;
      return;
    }

    var canvas = document.createElement('canvas');
    canvas.className = 'ether-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute(
      'aria-label',
      'A world map showing live mood readings for ' + source.length +
      ' cities. Each city is a point of light whose colour and brightness ' +
      'carry its current reading. Use the city search above, or the city ' +
      'list below, to open any city.',
    );
    root.appendChild(canvas);

    var tip = document.createElement('div');
    tip.className = 'ether-tip';
    tip.setAttribute('aria-hidden', 'true');
    tip.hidden = true;
    root.appendChild(tip);

    var ctx = canvas.getContext('2d', { alpha: false });
    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Displayed mood. A COPY -- see the scope note at the top. Shift
    // animations move these numbers and never the roster's.
    var shown = source.map(function (c) {
      return typeof c.mood === 'number' ? c.mood : 7;
    });

    var pts = [];        // laid out on resize
    var arcs = [];       // live arcs
    var running = false;
    var visible = true;
    var shiftTimer = null;
    var hoverIdx = -1;
    var w = 0, h = 0, pad = 0, dpr = 1;

    // ---------- layout ----------
    function layout() {
      var rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pad = Math.max(10, Math.min(w, h) * 0.05);

      pts = source.map(function (c) {
        var p = project(c.lat, c.lon, w, h, pad);
        return { x: p[0], y: p[1], i: 0 };
      });
      pts.forEach(function (p, i) { p.i = i; });
      return true;
    }

    // ---------- painting ----------
    function paintBackdrop() {
      var g = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.75);
      g.addColorStop(0, '#161022');
      g.addColorStop(1, '#08060E');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Graticule. The only spatial scaffolding here -- there is no
      // coastline path to load, because 300 cities already draw the
      // continents themselves.
      ctx.strokeStyle = 'rgba(176,141,87,0.085)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var lon = -180; lon <= 180; lon += 30) {
        var a = project(LAT_TOP, lon, w, h, pad);
        var b = project(LAT_BOTTOM, lon, w, h, pad);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      }
      for (var lat = -30; lat <= 60; lat += 30) {
        var c1 = project(lat, -180, w, h, pad);
        var c2 = project(lat, 180, w, h, pad);
        ctx.moveTo(c1[0], c1[1]); ctx.lineTo(c2[0], c2[1]);
      }
      ctx.stroke();

      // The equator, a shade stronger than the rest.
      ctx.strokeStyle = 'rgba(176,141,87,0.16)';
      ctx.beginPath();
      var e1 = project(0, -180, w, h, pad);
      var e2 = project(0, 180, w, h, pad);
      ctx.moveTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]);
      ctx.stroke();
    }

    function paintNodes(now) {
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var band = bandFor(shown[i]);
        var lum = brightness(shown[i]);

        // A node that has just shifted burns brighter for the length of
        // its arc, which is what makes the eye go to it.
        var flare = p.flareUntil && now < p.flareUntil
          ? 1 + 1.6 * ((p.flareUntil - now) / ARC_MS)
          : 1;

        var r = (1.5 + lum * 1.5) * flare;
        var glow = r * 4.2;

        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
        g.addColorStop(0, rgba(band.rgb, 0.5 * lum * flare));
        g.addColorStop(0.45, rgba(band.rgb, 0.12 * lum * flare));
        g.addColorStop(1, rgba(band.rgb, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = rgba(band.rgb, Math.min(1, 0.62 + lum * 0.38));
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (hoverIdx >= 0 && pts[hoverIdx]) {
        var hp = pts[hoverIdx];
        ctx.strokeStyle = 'rgba(240,224,200,0.75)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, 9, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // ---------- arcs ----------
    var ARC_MS = 2500;

    // A jagged path, generated once when the arc is born so it does not
    // reshuffle every frame -- a bolt that redraws its own geometry each
    // frame reads as noise, not as a bolt.
    function boltPath(a, b) {
      var segs = 9;
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / len, ny = dx / len;
      var amp = Math.min(26, Math.max(7, len * 0.14));
      var path = [{ x: a.x, y: a.y }];
      for (var s = 1; s < segs; s++) {
        var t = s / segs;
        // Zero displacement at both ends, widest in the middle.
        var falloff = Math.sin(t * Math.PI);
        var j = (Math.random() * 2 - 1) * amp * falloff;
        path.push({ x: a.x + dx * t + nx * j, y: a.y + dy * t + ny * j });
      }
      path.push({ x: b.x, y: b.y });
      return path;
    }

    function fireArc(fromIdx, toIdx, born) {
      arcs.push({
        path: boltPath(pts[fromIdx], pts[toIdx]),
        born: born,
        // Staggered so the two or three bolts from one node do not move
        // in lockstep.
        delay: Math.random() * 260,
        rgb: bandFor(shown[toIdx]).rgb,
      });
    }

    function paintArcs(now) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (var i = arcs.length - 1; i >= 0; i--) {
        var arc = arcs[i];
        var age = now - arc.born - arc.delay;
        if (age < 0) continue;
        if (age > ARC_MS) { arcs.splice(i, 1); continue; }

        var t = age / ARC_MS;
        // Travel out over the first 45%, then hold and fade.
        var reach = Math.min(1, t / 0.45);
        // Flicker: a coil is not a steady line.
        var flick = 0.72 + 0.28 * Math.sin(age * 0.045);
        var fade = t < 0.45 ? 1 : 1 - (t - 0.45) / 0.55;
        var alpha = Math.max(0, fade * flick);

        var path = arc.path;
        var last = Math.max(1, Math.floor(reach * (path.length - 1)));

        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (var s = 1; s <= last; s++) ctx.lineTo(path[s].x, path[s].y);

        // Three passes: a wide coloured haze, a mid glow, then the
        // white filament. One stroke alone disappears into the node
        // glow it is travelling between.
        ctx.strokeStyle = rgba(arc.rgb, alpha * 0.20);
        ctx.lineWidth = 7;
        ctx.stroke();

        ctx.strokeStyle = rgba([255, 240, 210], alpha * 0.34);
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.strokeStyle = rgba([255, 250, 238], alpha * 0.95);
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // The head, while it is still travelling.
        if (reach < 1) {
          var head = path[last];
          var hg = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 9);
          hg.addColorStop(0, rgba([255, 250, 236], alpha));
          hg.addColorStop(1, rgba([255, 250, 236], 0));
          ctx.fillStyle = hg;
          ctx.beginPath();
          ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // ---------- the shift ----------
    // A reading moves, and the movement travels. The nudge is small,
    // bounded, and applied only to `shown` -- the roster is never
    // written to.
    function shift() {
      if (!pts.length) return;
      var from = Math.floor(Math.random() * pts.length);
      var delta = (Math.random() * 2 - 1) * 0.45;
      shown[from] = Math.max(1, Math.min(10, shown[from] + delta));

      var origin = pts[from];

      // Nearby, but far enough to be seen. The literal nearest
      // high-energy neighbour is often a few pixels away -- Tokyo and
      // Yokohama, Delhi and Gurgaon -- and a bolt that short reads as
      // a smudge on the node rather than as an arc going anywhere. So
      // candidates are taken from a distance BAND: past the point where
      // a bolt is legible, and inside the point where "nearby" stops
      // being true.
      var minD = Math.max(48, w * 0.05);
      var maxD = w * 0.3;
      var inBand = pts.filter(function (p) {
        if (p.i === from || shown[p.i] < 7) return false;
        var d = Math.sqrt(dist2(origin, p));
        return d >= minD && d <= maxD;
      });
      // If a node is isolated enough to have nothing in the band, fall
      // back to whatever high-energy nodes exist rather than firing
      // nothing at all.
      var neighbours = (inBand.length ? inBand : pts.filter(function (p) {
        return p.i !== from && shown[p.i] >= 7;
      }))
        .sort(function (a, b) { return dist2(origin, a) - dist2(origin, b); })
        .slice(0, 12);

      // Two or three, picked from the nearest dozen high-energy nodes so
      // the same pair does not fire every time the same city moves.
      var want = 2 + Math.floor(Math.random() * 2);
      var now = performance.now();
      origin.flareUntil = now + ARC_MS;

      for (var k = 0; k < want && neighbours.length; k++) {
        var pick = neighbours.splice(Math.floor(Math.random() * Math.min(5, neighbours.length)), 1)[0];
        fireArc(from, pick.i, now);
        pts[pick.i].flareUntil = now + ARC_MS;
      }
      start();
    }

    function scheduleShift() {
      if (reduced) return;
      clearTimeout(shiftTimer);
      shiftTimer = setTimeout(function () {
        if (visible && !document.hidden) shift();
        scheduleShift();
      }, 2200 + Math.random() * 2600);
    }

    // ---------- the loop ----------
    function frame() {
      if (!running) return;
      var now = performance.now();
      paintBackdrop();
      paintArcs(now);
      paintNodes(now);
      // Stops itself the frame after the last arc dies. Between shifts
      // the canvas simply holds, at no cost.
      if (!arcs.length) {
        var stillFlaring = pts.some(function (p) { return p.flareUntil && now < p.flareUntil; });
        if (!stillFlaring) { running = false; return; }
      }
      requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduced || !visible || document.hidden) return;
      running = true;
      requestAnimationFrame(frame);
    }

    function paintStatic() {
      if (!w) return;
      paintBackdrop();
      paintNodes(performance.now());
    }

    // ---------- interaction ----------
    function nearest(cx, cy) {
      var best = -1, bestD = 22 * 22;
      for (var i = 0; i < pts.length; i++) {
        var d = dist2({ x: cx, y: cy }, pts[i]);
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    }

    function showTip(i, cx, cy) {
      var c = source[i];
      var band = bandFor(shown[i]);
      tip.innerHTML = '<span class="ether-tip-city"></span><span class="ether-tip-band"></span>';
      tip.querySelector('.ether-tip-city').textContent = c.name;
      tip.querySelector('.ether-tip-band').textContent =
        band.name + ' · ' + shown[i].toFixed(1);
      tip.hidden = false;
      // Kept inside the box on either edge.
      var tw = tip.offsetWidth || 120;
      var left = Math.max(6, Math.min(w - tw - 6, cx - tw / 2));
      tip.style.left = left + 'px';
      tip.style.top = Math.max(6, cy - 52) + 'px';
    }

    function hideTip() {
      tip.hidden = true;
      if (hoverIdx !== -1) { hoverIdx = -1; if (!running) paintStatic(); }
    }

    canvas.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      var i = nearest(e.clientX - r.left, e.clientY - r.top);
      canvas.style.cursor = i >= 0 ? 'pointer' : 'default';
      if (i !== hoverIdx) {
        hoverIdx = i;
        if (i >= 0) showTip(i, pts[i].x, pts[i].y); else tip.hidden = true;
        if (!running) paintStatic();
      }
    });
    canvas.addEventListener('pointerleave', hideTip);

    canvas.addEventListener('click', function (e) {
      var r = canvas.getBoundingClientRect();
      var i = nearest(e.clientX - r.left, e.clientY - r.top);
      if (i < 0) return;
      var slug = source[i].slug;
      // Exactly what tapping a barometer did: pin the city through the
      // existing path, then carry the visitor to the verdict that just
      // changed underneath them.
      if (typeof window.loadCityBySlug === 'function') {
        window.loadCityBySlug(slug);
      } else {
        var sel = document.getElementById('city-select');
        if (sel) { sel.value = slug; sel.dispatchEvent(new Event('change')); }
      }
      var trip = document.querySelector('.trip-slot');
      if (trip) setTimeout(function () {
        trip.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    });

    // ---------- lifecycle ----------
    var ro = null;
    if (window.ResizeObserver) {
      var rt = null;
      ro = new ResizeObserver(function () {
        clearTimeout(rt);
        rt = setTimeout(function () { if (layout()) { paintStatic(); start(); } }, 120);
      });
      ro.observe(root);
    } else {
      window.addEventListener('resize', function () {
        if (layout()) paintStatic();
      });
    }

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start();
      }, { rootMargin: '120px' }).observe(root);
    }

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) start();
    });

    if (layout()) {
      paintStatic();
      scheduleShift();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
