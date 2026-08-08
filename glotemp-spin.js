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

  let pool = [];          // [{ city, mode, reading, curve, modelled }]
  let spinning = false;
  let rotation = 0;       // accumulated degrees, never reset (keeps motion one-way)
  let variant = VARIANTS[0];

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
        <div class="spin-affiliates" id="spin-affiliates" hidden>
          <a class="spin-aff" id="spin-aff-flight" target="_blank" rel="noopener noreferrer"><span class="spin-aff-kind">Flight</span><span class="spin-aff-label"></span></a>
          <a class="spin-aff" id="spin-aff-room" target="_blank" rel="noopener noreferrer"><span class="spin-aff-kind">Room</span><span class="spin-aff-label"></span></a>
          <a class="spin-aff" id="spin-aff-table" target="_blank" rel="noopener noreferrer"><span class="spin-aff-kind">Table</span><span class="spin-aff-label"></span></a>
        </div>
        <p class="spin-prov" id="spin-prov"></p>
      </div>`;
  }

  // ---------- data ----------
  async function loadPool() {
    const cities = new Map((window.CITIES_DATA || []).filter(c => c.available !== false).map(c => [c.slug, c]));
    const rows = window.GlotempTonight ? await GlotempTonight.fetchTopTonight(400) : null;
    if (!rows || !rows.length) return [];
    return rows
      .map(r => ({ city: cities.get(r.city_slug), mode: r.mode, reading: Number(r.reading),
                   curve: r.curve, modelled: !!r.modelled, seat_capacity: r.seat_capacity }))
      .filter(x => x.city);
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
    if (spinning) return;
    const sentenceEl = document.getElementById('spin-sentence');
    const provEl = document.getElementById('spin-prov');

    let candidates = pool;
    if (variant.modes) candidates = pool.filter(c => variant.modes.indexOf(c.mode) !== -1);
    if (!candidates.length) {
      // Honest empty state -- no invented destination.
      sentenceEl.textContent = pool.length
        ? 'Nothing is published for that mode yet. Try another variant.'
        : 'Tonight has not published yet. Nothing is shown rather than something invented.';
      document.getElementById('spin-affiliates').hidden = true;
      provEl.textContent = '';
      return;
    }

    const choice = pick(candidates);
    if (!choice) return;

    const rotor = document.getElementById('spin-rotor');
    const go = document.getElementById('spin-go');
    spinning = true;
    go.disabled = true;
    sentenceEl.classList.add('is-settling');

    if (reduceMotion()) {
      finish(choice);
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
    setTimeout(() => finish(choice), 3040);
  }

  function finish(choice) {
    const sentenceEl = document.getElementById('spin-sentence');
    const provEl = document.getElementById('spin-prov');
    sentenceEl.textContent = buildSentence(choice);
    sentenceEl.classList.remove('is-settling');
    setAffiliates(choice.city);
    const bits = [`${MODE_LABEL[choice.mode]} ${choice.reading.toFixed(1)}/10`];
    if (choice.seat_capacity != null) bits.push(`${choice.seat_capacity.toLocaleString()} scheduled seat capacity`);
    provEl.innerHTML = esc(bits.join(' · ')) + (choice.modelled ? ' · <span class="tonight-modelled">modelled</span>' : '');
    document.getElementById('spin-go').disabled = false;
    spinning = false;
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
    document.getElementById('spin-go').addEventListener('click', spin);
    document.getElementById('spin-dial').addEventListener('click', spin);

    pool = await loadPool();
    if (!pool.length) {
      document.getElementById('spin-sentence').textContent =
        'Tonight has not published yet. Nothing is shown rather than something invented.';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
