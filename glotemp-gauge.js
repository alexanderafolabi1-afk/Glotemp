// Glotemp gauge: one small reusable 0-10 analog dial, used on the city
// page header and the homepage showcase card so both surfaces read the
// same mood score with the same instrument. Pure SVG + a CSS custom
// property driving the needle's rotation -- no canvas, no animation
// library, nothing new to load.
(function () {
  const CX = 50, CY = 58, R_FACE = 44, R_TICK_IN = 34, R_TICK_OUT = 41, NEEDLE_LEN = 34;
  const SWEEP_DEG = 240; // 0 at lower-left, 10 at lower-right, through top at 5
  const MAJOR = [0, 2.5, 5, 7.5, 10];
  const LABELED = [0, 5, 10];

  // angle 0 = straight up, positive = clockwise -- matches how a CSS
  // rotate() on the needle group behaves, so ticks (drawn once, in
  // absolute position) and the needle (rotated live) share one system.
  function angleFor(value) {
    return -SWEEP_DEG / 2 + (Math.max(0, Math.min(10, value)) / 10) * SWEEP_DEG;
  }
  function polar(cx, cy, r, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
  }

  function ticksSVG() {
    let out = '';
    for (const v of MAJOR) {
      const a = angleFor(v);
      const p1 = polar(CX, CY, R_TICK_IN, a);
      const p2 = polar(CX, CY, R_TICK_OUT, a);
      const major = LABELED.includes(v);
      out += `<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke="var(--brass-dim)" stroke-width="${major ? 1.6 : 1}" stroke-linecap="round" />`;
      if (major) {
        const lp = polar(CX, CY, R_TICK_OUT + 8, a);
        out += `<text x="${lp.x.toFixed(2)}" y="${lp.y.toFixed(2)}" class="gt-gauge-label" text-anchor="middle" dominant-baseline="middle">${v}</text>`;
      }
    }
    return out;
  }

  // Returns a complete SVG string, sized by the caller's own CSS
  // (viewBox scales) with the needle already at `value`'s position, no
  // separate setValue() call needed for first paint.
  function renderSVG(value, opts) {
    opts = opts || {};
    const v = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
    const deg = angleFor(v);
    const id = opts.id ? ` id="${opts.id}"` : '';
    const label = opts.ariaLabel || `Reading ${v.toFixed(1)} out of 10`;
    return `<svg${id} class="gt-gauge" viewBox="0 0 100 88" role="img" aria-label="${label.replace(/"/g, '&quot;')}" data-gauge-value="${v}">
      <circle cx="${CX}" cy="${CY}" r="${R_FACE}" class="gt-gauge-face" />
      <circle cx="${CX}" cy="${CY}" r="${R_FACE}" class="gt-gauge-ring" />
      <g class="gt-gauge-ticks">${ticksSVG()}</g>
      <g class="gt-gauge-needle" style="transform-origin: ${CX}px ${CY}px; --gauge-deg: ${deg.toFixed(2)}deg;">
        <line x1="${CX}" y1="${CY}" x2="${CX}" y2="${(CY - NEEDLE_LEN).toFixed(2)}" />
      </g>
      <circle cx="${CX}" cy="${CY}" r="3.2" class="gt-gauge-pivot" />
    </svg>`;
  }

  // Animates an already-rendered gauge (from renderSVG, found by id or a
  // direct element ref) to a new value -- used when the homepage
  // showcase rotates to a new city without a full re-render.
  function setValue(svgOrId, value) {
    const svg = typeof svgOrId === 'string' ? document.getElementById(svgOrId) : svgOrId;
    if (!svg) return;
    const needle = svg.querySelector('.gt-gauge-needle');
    if (!needle) return;
    const v = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
    needle.style.setProperty('--gauge-deg', `${angleFor(v).toFixed(2)}deg`);
    svg.setAttribute('data-gauge-value', v);
  }

  window.GlotempGauge = { renderSVG, setValue };
})();
