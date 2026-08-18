// Glotemp Spin -- the brass instrument dial on the homepage.
//
// The user spins a weighted dial. It lands on one city and one mode and
// returns a single sentence built from live data: the city's band, its
// real local day and hour, and the winning mode. Not a card. One
// sentence.
//
// The feel is deliberately mechanical rather than slot-machine: the
// rotation eases out over ~2.6s on a heavy cubic curve, the needle
// settles with a small counter-rotation, and detents are drawn on the
// bezel so the eye can read the deceleration. Everything is SVG/CSS
// driven by data -- no images.
(function () {
  const VARIANTS = [
    { id: 'anywhere', label: 'Take me somewhere', modes: null },
    { id: 'feed', label: 'Feed me', modes: ['eat', 'drink'] },
    { id: 'moving', label: 'Get me moving', modes: ['move'] },
    { id: 'surprise', label: 'Surprise me', modes: null, chaotic: true },
  ];

  const MODE_VERB = {
    eat: 'the kitchens are on',
    drink: 'the bars are filling',
    watch: 'the houses are lit',
    move: 'the air is worth it',
    make: 'the workshops are open',
  };
  const MODE_LABEL = { eat: 'Eat', drink: 'Drink', watch: 'Watch', move: 'Move', make: 'Make' };

  // Inline brass line icons for the Flight/Room/Table affiliate row --
  // no boxes, just the mark above the label, matching the dial's stroke
  // style (fill: none; stroke: currentColor, set in CSS).
  const AFF_ICONS = {
    flight: '<span class="spin-aff-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></span>',
    room: '<span class="spin-aff-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 17v-5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/><path d="M13 13v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5"/><path d="M3 17h18"/><path d="M3 17v2M21 17v2"/></svg></span>',
    table: '<span class="spin-aff-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 2v6a2 2 0 0 0 4 0V2"/><path d="M9 8v14"/><path d="M17 2c-1.5 0-3 1.5-3 5s1.5 5 3 5v9"/></svg></span>',
  };

  let pool = [];          // [{ city, mode, reading, curve, modelled }]
  let poolLoading = true; // true until loadPool() resolves, guards a click landing before there's anything to spin
  let spinning = false;
  let rotation = 0;       // accumulated degrees, never reset (keeps motion one-way)
  let variant = VARIANTS[0];
  let revealToken = 0;    // see finish(): discards a photo fetch that resolves after a newer spin has landed

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function reduceMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ---------- the dial face ----------
  // Brass bezel, ivory face, engraved detents, a needle, and a hub.
  function dialSVG() {
    const CX = 110, CY = 110, R = 92;
    let detents = '';
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0;
      const a = (i / 60) * 360 - 90;
      const rad = a * Math.PI / 180;
      const r1 = R - (major ? 12 : 7), r2 = R - 2;
      detents += `<line x1="${(CX + r1 * Math.cos(rad)).toFixed(1)}" y1="${(CY + r1 * Math.sin(rad)).toFixed(1)}"
        x2="${(CX + r2 * Math.cos(rad)).toFixed(1)}" y2="${(CY + r2 * Math.sin(rad)).toFixed(1)}"
        stroke="${major ? 'var(--brass)' : 'var(--brass-dim)'}" stroke-width="${major ? 1.6 : 0.9}" stroke-linecap="round"/>`;
    }
    return `<svg viewBox="0 0 220 220" class="spin-dial-svg" role="img" aria-label="Spin dial">
      <defs>
        <radialGradient id="spin-face" cx="38%" cy="30%" r="78%">
          <stop offset="0%" stop-color="#F7EBDA"/>
          <stop offset="62%" stop-color="#F0E0C8"/>
          <stop offset="100%" stop-color="#D9C4A6"/>
        </radialGradient>
        <linearGradient id="spin-bezel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#D9B37A"/>
          <stop offset="50%" stop-color="#B08D57"/>
          <stop offset="100%" stop-color="#7A6038"/>
        </linearGradient>
      </defs>
      <circle cx="${CX}" cy="${CY}" r="${R + 12}" fill="url(#spin-bezel)"/>
      <circle cx="${CX}" cy="${CY}" r="${R + 5}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="2"/>
      <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#spin-face)"/>
      <g class="spin-rotor" id="spin-rotor">
        ${detents}
        <g class="spin-needle" id="spin-needle">
          <polygon points="${CX},${CY - R + 16} ${CX - 5},${CY + 12} ${CX + 5},${CY + 12}" fill="#3A2E22"/>
          <polygon points="${CX},${CY + R - 28} ${CX - 3},${CY + 12} ${CX + 3},${CY + 12}" fill="#8A7A63"/>
        </g>
      </g>
      <circle cx="${CX}" cy="${CY}" r="9" fill="#3A2E22"/>
      <circle cx="${CX}" cy="${CY}" r="4" fill="#B08D57"/>
    </svg>`;
  }

  function shellHTML() {
    return `
      <div class="spin-inner">
        <p class="eyebrow">One turn, one answer</p>
        <h2 class="spin-title">Spin the instrument</h2>
        <div class="spin-variants" role="group" aria-label="Spin variant">
          ${VARIANTS.map((v, i) => `<button type="button" class="spin-variant" data-variant="${v.id}" aria-pressed="${i === 0}">${esc(v.label)}</button>`).join('')}
        </div>
        <div class="spin-stage">
          <div class="spin-dial" id="spin-dial">${dialSVG()}</div>
          <button type="button" class="spin-go" id="spin-go">Spin</button>
        </div>
        <p class="spin-sentence" id="spin-sentence" role="status" aria-live="polite">Give it a turn.</p>
        <div class="spin-photo" id="spin-photo" hidden></div>
        <div class="spin-affiliates" id="spin-affiliates" hidden>
          <a class="spin-aff" id="spin-aff-flight" target="_blank" rel="noopener noreferrer">${AFF_ICONS.flight}<span class="spin-aff-kind">Flight</span><span class="spin-aff-label"></span></a>
          <a class="spin-aff" id="spin-aff-room" target="_blank" rel="noopener noreferrer">${AFF_ICONS.room}<span class="spin-aff-kind">Room</span><span class="spin-aff-label"></span></a>
          <a class="spin-aff" id="spin-aff-table" target="_blank" rel="noopener noreferrer">${AFF_ICONS.table}<span class="spin-aff-kind">Table</span><span class="spin-aff-label"></span></a>
        </div>
        <p class="spin-prov" id="spin-prov"></p>
      </div>`;
  }

  // ---------- data ----------
  // The live "tonight" readings table (Supabase) can be empty, still
  // materializing, or unreachable -- and the spin has to work regardless,
  // since it is a homepage centerpiece, not an optional widget. If the
  // live rows come back empty, fall back to a pool built straight from
  // CITIES_DATA's own mood reading (always present client-side), across
  // all five modes. It loses the per-hour curve, so scoring in pick()
  // just weighs less on "right now" and more on the city's own reading --
  // still a real, honestly-labelled ("modelled") result, never a dead
  // click.
  async function loadPool() {
    const cities = new Map((window.CITIES_DATA || []).filter(c => c.available !== false).map(c => [c.slug, c]));
    const rows = window.GlotempTonight ? await GlotempTonight.fetchTopTonight(400) : null;
    if (rows && rows.length) {
      const live = rows
        .map(r => ({ city: cities.get(r.city_slug), mode: r.mode, reading: Number(r.reading),
                     curve: r.curve, modelled: !!r.modelled, seat_capacity: r.seat_capacity }))
        .filter(x => x.city && Number.isFinite(x.reading) && x.reading > 0);
      if (live.length) return live;
    }
    return Array.from(cities.values()).flatMap(city =>
      Object.keys(MODE_VERB).map(mode => ({
        city, mode, reading: typeof city.mood === 'number' ? city.mood : 5,
        curve: null, modelled: true, seat_capacity: null,
      }))
    );
  }

  // Weighted pick: reading drives weight, and for a given mode the
  // curve value at that city's CURRENT local hour matters more than the
  // daily headline -- "tonight" means now, not on average.
  function pick(candidates) {
    if (!candidates.length) return null;
    const scored = candidates.map(c => {
      const hour = GlotempTonight.localHour(c.city.timezone);
      const idx = Math.round(Math.max(0, Math.min(23, hour)));
      const nowVal = Array.isArray(c.curve) ? Number(c.curve[idx]) || 0 : 0;
      const base = c.reading * 0.4 + nowVal * 1.6;
      const jitter = variant.chaotic ? (0.4 + Math.random() * 1.6) : 1;
      return { c, w: Math.max(0.05, base * jitter) };
    });
    const total = scored.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (const x of scored) { r -= x.w; if (r <= 0) return x.c; }
    return scored[scored.length - 1].c;
  }

  // ---------- surprise-only: one real photo of the landing city ----------
  // Nothing here runs for anywhere/feed/moving -- see finish() below,
  // where this is only ever called inside the variant.id === 'surprise'
  // branch. The dial, the sentence, and the other three variants have no
  // dependency on any of this.
  //
  // Same free, keyless Wikimedia family as city-landmark-photos.js's
  // Wikipedia REST calls, one step further into Commons' own action API
  // (as city-of-day-photos.js already does for its background rotation).
  // This asks for something more specific than "a photo of the city",
  // though: search text biased toward the quieter corners -- gardens,
  // historic districts, temples and shrines, old town streets,
  // sanctuaries, courtyards -- rather than the tallest building or the
  // widest avenue, since a generic skyline shot is the opposite of what
  // "Surprise me" is for. Falls back to the plain Wikipedia thumbnail
  // (GlotempLandmarkPhotos) if nothing themed turns up, and to nothing
  // at all -- the sentence alone, exactly as it renders for the other
  // three variants -- if that fails too. Never a broken image, never a
  // placeholder: every URL returned here is a real Commons or Wikipedia
  // file, or there is no photo this time.
  const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
  const SURPRISE_MIN_DIMENSION = 400;
  const SURPRISE_THUMB_WIDTH = 900;
  const SURPRISE_THEMES = ['garden', '"historic district"', 'temple', 'shrine', '"old town"', 'sanctuary', 'courtyard'];
  const SURPRISE_BAD_TITLE = /logo|coat[\s_]of[\s_]arms|seal[\s_]of|flag[\s_]of|\bmap\b|diagram|chart|icon|emblem|locator/i;
  const surprisePhotoCache = new Map();

  function looksLikeThemedPhoto(page) {
    const info = page && page.imageinfo && page.imageinfo[0];
    if (!info) return false;
    const mime = String(info.mime || '').toLowerCase();
    if (mime !== 'image/jpeg' && mime !== 'image/png') return false;
    if ((info.width || 0) < SURPRISE_MIN_DIMENSION && (info.height || 0) < SURPRISE_MIN_DIMENSION) return false;
    if (SURPRISE_BAD_TITLE.test(String(page.title || '').replace(/^File:/i, ''))) return false;
    return !!(info.thumburl || info.url);
  }

  async function fetchThemedCommonsPhoto(cityName) {
    try {
      const params = new URLSearchParams({
        action: 'query',
        generator: 'search',
        gsrsearch: `"${cityName}" (${SURPRISE_THEMES.join(' OR ')})`,
        gsrnamespace: '6',
        gsrlimit: '20',
        prop: 'imageinfo',
        iiprop: 'url|size|mime',
        iiurlwidth: String(SURPRISE_THUMB_WIDTH),
        format: 'json',
        origin: '*',
      });
      const resp = await fetch(`${COMMONS_API}?${params}`);
      if (!resp.ok) return null;
      const data = await resp.json();
      const pages = (data && data.query && data.query.pages) || {};
      for (const key of Object.keys(pages)) {
        const page = pages[key];
        if (!looksLikeThemedPhoto(page)) continue;
        const info = page.imageinfo[0];
        return info.thumburl || info.url;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function fetchSurprisePhoto(city) {
    if (surprisePhotoCache.has(city.slug)) return surprisePhotoCache.get(city.slug);
    const promise = (async () => {
      const themed = await fetchThemedCommonsPhoto(city.name);
      if (themed) return themed;
      if (window.GlotempLandmarkPhotos) return (await window.GlotempLandmarkPhotos.getPhotoUrl(city.slug)) || null;
      return null;
    })();
    surprisePhotoCache.set(city.slug, promise);
    return promise;
  }

  // ---------- the sentence ----------
  function buildSentence(choice) {
    const { city, mode } = choice;
    const band = GlotempCore.moodToBand(city.mood).band;
    const day = GlotempTonight.localDayName(city.timezone);
    const hour = GlotempTonight.localHour(city.timezone);
    const partOfDay = hour < 5 ? 'the small hours' : hour < 12 ? 'the morning'
      : hour < 17 ? 'the afternoon' : hour < 21 ? 'the evening' : 'the night';
    const bandPhrase = {
      charged: 'It is charged', warm: 'It is warm', equilibrium: 'It is level',
      restrained: 'It is restrained', low: 'It is quiet',
    }[band] || 'It is level';
    return `Go to ${city.name}. ${bandPhrase}, it is ${day} in ${partOfDay}, and ${MODE_VERB[mode] || 'the city is open'}.`;
  }

  function setAffiliates(city) {
    const wrap = document.getElementById('spin-affiliates');
    const q = encodeURIComponent(city.name);
    const flight = document.getElementById('spin-aff-flight');
    const room = document.getElementById('spin-aff-room');
    const table = document.getElementById('spin-aff-table');
    flight.href = `https://www.skyscanner.net/transport/flights-to/${q}/`;
    flight.querySelector('.spin-aff-label').textContent = `Fly to ${city.name}`;
    room.href = `https://www.booking.com/searchresults.html?ss=${q}`;
    room.querySelector('.spin-aff-label').textContent = `Stay in ${city.name}`;
    table.href = `https://www.opentable.com/s?term=${q}`;
    table.querySelector('.spin-aff-label').textContent = `Book a table in ${city.name}`;
    wrap.hidden = false;
  }

  // ---------- the spin ----------
  function spin() {
    if (spinning || poolLoading) return;
    const sentenceEl = document.getElementById('spin-sentence');
    const provEl = document.getElementById('spin-prov');

    let candidates = pool;
    if (variant.modes) candidates = pool.filter(c => variant.modes.indexOf(c.mode) !== -1);
    if (!candidates.length) {
      // No invented destination -- and no announcement of absence either.
      sentenceEl.textContent = pool.length ? 'Try another variant.' : '';
      document.getElementById('spin-affiliates').hidden = true;
      provEl.textContent = '';
      return;
    }

    const choice = pick(candidates);
    if (!choice) return;

    // Captured now, not re-read in finish(): variant buttons aren't
    // disabled during the ~3s animation, so a click on another one
    // mid-spin must not change whether the photo appears for a spin
    // that was already committed as 'surprise' (or wasn't).
    const isSurprise = variant.id === 'surprise';

    const rotor = document.getElementById('spin-rotor');
    const go = document.getElementById('spin-go');
    spinning = true;
    go.disabled = true;
    sentenceEl.classList.add('is-settling');

    if (reduceMotion()) {
      finish(choice, isSurprise);
      return;
    }

    // Weighted, one-way rotation: 3-4 full turns plus a landing offset.
    const turns = 3 + Math.floor(Math.random() * 2);
    const landing = Math.random() * 360;
    rotation += turns * 360 + landing;
    rotor.style.transition = 'transform 2600ms cubic-bezier(0.16, 0.84, 0.24, 1)';
    rotor.style.transform = `rotate(${rotation}deg)`;

    // Mechanical settle: a small counter-rotation as it comes to rest.
    setTimeout(() => {
      rotor.style.transition = 'transform 420ms cubic-bezier(0.34, 1.4, 0.64, 1)';
      rotor.style.transform = `rotate(${rotation - 3.2}deg)`;
    }, 2600);
    setTimeout(() => finish(choice, isSurprise), 3040);
  }

  // Surprise-only, and fire-and-forget: the network round trip never
  // holds up re-enabling the Spin button or anything else in finish()
  // below. revealToken guards against a slow fetch from an earlier spin
  // landing after a newer one has already replaced the sentence on
  // screen -- without it, a stale photo could briefly overwrite the
  // current result.
  async function revealSurprisePhoto(city, token) {
    const photoEl = document.getElementById('spin-photo');
    const url = await fetchSurprisePhoto(city);
    if (!url || token !== revealToken || !photoEl) return;
    const img = new Image();
    img.onload = () => {
      if (token !== revealToken || !photoEl.isConnected) return;
      photoEl.innerHTML = `<img class="spin-photo-img" src="${esc(url)}" alt="">`;
      photoEl.hidden = false;
    };
    img.onerror = () => {}; // broken URL: photoEl stays hidden, sentence stands alone
    img.src = url;
  }

  function finish(choice, isSurprise) {
    const sentenceEl = document.getElementById('spin-sentence');
    const provEl = document.getElementById('spin-prov');
    const photoEl = document.getElementById('spin-photo');
    revealToken++;
    const token = revealToken;
    // Reset every reveal, not just surprise ones -- otherwise a photo
    // from a previous "Surprise me" spin would still be showing after
    // switching to anywhere/feed/moving and spinning again.
    photoEl.hidden = true;
    photoEl.innerHTML = '';
    sentenceEl.textContent = buildSentence(choice);
    sentenceEl.classList.remove('is-settling');
    setAffiliates(choice.city);
    const bits = [`${MODE_LABEL[choice.mode]} ${choice.reading.toFixed(1)}/10`];
    if (choice.seat_capacity != null) bits.push(`${choice.seat_capacity.toLocaleString()} scheduled seat capacity`);
    provEl.innerHTML = esc(bits.join(' · ')) + (choice.modelled ? ' · <span class="tonight-modelled">modelled</span>' : '');
    document.getElementById('spin-go').disabled = false;
    spinning = false;
    if (isSurprise) revealSurprisePhoto(choice.city, token);
  }

  async function mount() {
    const host = document.getElementById('spin-section');
    if (!host) return;
    host.innerHTML = shellHTML();

    host.querySelectorAll('.spin-variant').forEach(btn => {
      btn.addEventListener('click', () => {
        host.querySelectorAll('.spin-variant').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        variant = VARIANTS.find(v => v.id === btn.getAttribute('data-variant')) || VARIANTS[0];
      });
    });
    const goBtn = document.getElementById('spin-go');
    const dialBtn = document.getElementById('spin-dial');
    goBtn.addEventListener('click', spin);
    dialBtn.addEventListener('click', spin);

    // The pool load is a network round trip -- a click landing in that
    // gap used to hit an empty pool and do nothing, silently. Hold the
    // control disabled and say so until there's something to spin.
    goBtn.disabled = true;
    goBtn.textContent = 'Loading…';
    pool = await loadPool();
    poolLoading = false;
    goBtn.disabled = false;
    goBtn.textContent = 'Spin';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
