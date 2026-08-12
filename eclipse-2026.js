// Glotemp Eclipse: a one-day-only treatment for the August 12, 2026 total
// solar eclipse (path of totality: Arctic, Greenland, Iceland, northern
// Spain, NE Portugal; partial visible across Europe, N/W Africa, much of
// North America, the Atlantic and Arctic). Pure CSS/SVG, nothing written
// to /assets/ -- the crescent is a mask cut out of an inline SVG sun disc,
// so it reads correctly against whatever is behind it.
//
// Self-expiring by construction: every timestamp below is anchored to the
// single real date of the event. Once "now" moves past it, CONTACTS.p4
// puts progress() permanently out of [0,1] and render() leaves the mount
// points empty -- no flag to come back and remove, no future date it
// silently starts mis-firing for.
//
// Source: NASA eclipse predictions / timeanddate.com, both cited when
// this was built. Global partial begins 15:34 UTC, greatest eclipse
// 17:47:06 UTC, global partial ends 19:57 UTC. Totality itself is only
// visible from the narrow path above -- the copy here says "at points
// along its path", never implies totality everywhere.
(function () {
  const CONTACTS = {
    p1: Date.parse('2026-08-12T15:34:00Z'),
    totalityStart: Date.parse('2026-08-12T16:58:00Z'),
    max: Date.parse('2026-08-12T17:47:06Z'),
    totalityEnd: Date.parse('2026-08-12T18:34:00Z'),
    p4: Date.parse('2026-08-12T19:57:00Z'),
  };

  function fmtDelta(ms) {
    const mins = Math.round(Math.abs(ms) / 60000);
    if (mins < 1) return 'less than a minute';
    if (mins < 60) return mins + (mins === 1 ? ' minute' : ' minutes');
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return hrs + (hrs === 1 ? ' hour' : ' hours') + (rem ? ' ' + rem + 'm' : '');
  }

  // Tent-shaped coverage curve: 0 at both contacts, 1 at greatest eclipse.
  // Not a physically exact limb-touch model -- this is one illustration
  // shared by every visitor regardless of where they are, not a per-location
  // render, and the copy says so.
  function coverage(now) {
    if (now <= CONTACTS.p1 || now >= CONTACTS.p4) return 0;
    if (now <= CONTACTS.max) {
      return (now - CONTACTS.p1) / (CONTACTS.max - CONTACTS.p1);
    }
    return 1 - (now - CONTACTS.max) / (CONTACTS.p4 - CONTACTS.max);
  }

  function phaseCopy(now) {
    if (now < CONTACTS.p1) {
      return {
        eyebrow: 'Today',
        line: 'A total solar eclipse crosses the Arctic, Greenland, Iceland and northern Spain later today — peak 17:47 UTC, in ' + fmtDelta(CONTACTS.p1 - now) + '.',
      };
    }
    if (now < CONTACTS.totalityStart) {
      return {
        eyebrow: 'Happening now',
        line: 'The Moon has begun crossing the Sun. Totality reaches the path over Greenland and Iceland in ' + fmtDelta(CONTACTS.totalityStart - now) + '.',
      };
    }
    if (now <= CONTACTS.totalityEnd) {
      return {
        eyebrow: 'Totality',
        line: 'Right now, along a narrow band from the Arctic through Greenland, Iceland and northern Spain, the sky has gone dark at midday.',
      };
    }
    if (now < CONTACTS.p4) {
      return {
        eyebrow: 'Fading out',
        line: 'The eclipse is past its peak, still visible as a partial cover for the next ' + fmtDelta(CONTACTS.p4 - now) + '.',
      };
    }
    return null;
  }

  function buildMarkSVG(cov) {
    // Moon disc offset from full separation (cov=0) to centred (cov=1),
    // radius ~1.04x the sun so the mask edge reads as a clean crescent.
    const sunR = 34;
    const moonR = sunR * 1.04;
    const maxOffset = sunR * 2.3;
    const dx = maxOffset * (1 - cov);
    // The corona is a genuine ring (transparent core, bright band near the
    // rim, transparent again past it) via its own gradient stops -- a
    // solid disc filled with the sun's own bright-centre gradient would
    // just recreate an unclipsed-looking sun on top of the masked crescent,
    // which is exactly what a first pass at this got wrong.
    const coronaOpacity = 0.3 + cov * 0.55;
    return (
      '<svg viewBox="0 0 200 200" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">' +
        '<defs>' +
          '<radialGradient id="eclipseSunGrad" cx="45%" cy="42%" r="60%">' +
            '<stop offset="0%" stop-color="#FDEBC8"/>' +
            '<stop offset="55%" stop-color="#F0B85A"/>' +
            '<stop offset="100%" stop-color="#B08D57"/>' +
          '</radialGradient>' +
          '<radialGradient id="eclipseCoronaGrad" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0%" stop-color="#F0E0C8" stop-opacity="0"/>' +
            '<stop offset="62%" stop-color="#F0E0C8" stop-opacity="0"/>' +
            '<stop offset="82%" stop-color="#FDEBC8" stop-opacity="0.95"/>' +
            '<stop offset="100%" stop-color="#F0B85A" stop-opacity="0"/>' +
          '</radialGradient>' +
          '<mask id="eclipseCrescent">' +
            '<rect x="0" y="0" width="200" height="200" fill="black"/>' +
            '<circle cx="100" cy="90" r="' + sunR + '" fill="white"/>' +
            '<circle cx="' + (100 + dx) + '" cy="90" r="' + moonR + '" fill="black"/>' +
          '</mask>' +
        '</defs>' +
        '<circle class="eclipse-corona" cx="100" cy="90" r="' + (sunR * 1.55) + '" fill="url(#eclipseCoronaGrad)" opacity="' + coronaOpacity.toFixed(2) + '"/>' +
        '<g class="eclipse-rays" style="transform-origin: 100px 90px;">' +
          Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30);
            const r1 = sunR + 6, r2 = sunR + 14 + (i % 3) * 4;
            return '<line x1="0" y1="-' + r1 + '" x2="0" y2="-' + r2 + '" ' +
              'transform="translate(100,90) rotate(' + angle + ')" ' +
              'stroke="#F0E0C8" stroke-width="1.4" stroke-linecap="round" opacity="' + (0.18 + cov * 0.32).toFixed(2) + '"/>';
          }).join('') +
        '</g>' +
        '<circle cx="100" cy="90" r="' + sunR + '" fill="url(#eclipseSunGrad)" mask="url(#eclipseCrescent)"/>' +
      '</svg>'
    );
  }

  function render() {
    const noteEl = document.getElementById('eclipse-note');
    const markEl = document.getElementById('eclipse-mark');
    if (!noteEl && !markEl) return;

    const now = Date.now();
    const copy = phaseCopy(now);

    if (!copy) {
      if (noteEl) { noteEl.hidden = true; noteEl.innerHTML = ''; }
      if (markEl) { markEl.hidden = true; markEl.innerHTML = ''; }
      return;
    }

    if (noteEl) {
      noteEl.hidden = false;
      noteEl.innerHTML =
        '<span class="eclipse-note-eyebrow">☀︎ Solar eclipse — ' + copy.eyebrow + '</span>' +
        '<span class="eclipse-note-line">' + copy.line + '</span>';
    }
    if (markEl) {
      markEl.hidden = false;
      markEl.innerHTML = buildMarkSVG(coverage(now));
    }
  }

  render();
  setInterval(render, 30000);
})();
