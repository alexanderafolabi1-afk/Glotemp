// Glotemp Ambient Compass: a large, faint old-compass/clock face fixed
// in the homepage hero background -- the atmospheric "object behind the
// headline" the rotating wash was missing, styled after the same
// brass/ivory instrument language as the Spin dial. The hands show the
// real current time and never stop moving: a CSS animation is synced
// once at mount via a negative animation-delay (the fraction of the
// current hour/12-hour period already elapsed), so after that there is
// no per-second JS ticking -- the browser's own animation timeline
// keeps it moving for free.
(function () {
  function reduceMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function compassSVG() {
    const CX = 200, CY = 200, R = 178;
    let ticks = '';
    for (let i = 0; i < 32; i++) {
      const major = i % 8 === 0;
      const minor = i % 4 === 0;
      const a = (i / 32) * 360 - 90;
      const rad = a * Math.PI / 180;
      const len = major ? 22 : minor ? 14 : 8;
      const r1 = R - len, r2 = R;
      ticks += `<line x1="${(CX + r1 * Math.cos(rad)).toFixed(1)}" y1="${(CY + r1 * Math.sin(rad)).toFixed(1)}"
        x2="${(CX + r2 * Math.cos(rad)).toFixed(1)}" y2="${(CY + r2 * Math.sin(rad)).toFixed(1)}"
        stroke="rgba(240,224,200,${major ? 0.34 : minor ? 0.22 : 0.14})" stroke-width="${major ? 2 : 1}" stroke-linecap="round"/>`;
    }
    const dirs = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
    const labels = dirs.map(([label, deg]) => {
      const rad = (deg - 90) * Math.PI / 180;
      const r = R - 42;
      return `<text x="${(CX + r * Math.cos(rad)).toFixed(1)}" y="${(CY + r * Math.sin(rad)).toFixed(1)}"
        fill="rgba(240,224,200,0.3)" font-size="15" text-anchor="middle" dominant-baseline="middle" letter-spacing="2">${label}</text>`;
    }).join('');

    return `<svg viewBox="0 0 400 400" class="ambient-compass-svg" role="img" aria-hidden="true" focusable="false">
      <circle cx="${CX}" cy="${CY}" r="${R + 8}" fill="none" stroke="rgba(216,179,122,0.24)" stroke-width="1.5"/>
      <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="rgba(216,179,122,0.16)" stroke-width="1"/>
      ${ticks}
      ${labels}
      <g class="ambient-compass-hand" id="ambient-compass-hour">
        <line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - R * 0.5}" stroke="rgba(240,224,200,0.38)" stroke-width="3" stroke-linecap="round"/>
      </g>
      <g class="ambient-compass-hand" id="ambient-compass-minute">
        <line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - R * 0.78}" stroke="rgba(240,224,200,0.3)" stroke-width="2" stroke-linecap="round"/>
      </g>
      <circle cx="${CX}" cy="${CY}" r="5" fill="rgba(240,224,200,0.42)"/>
    </svg>`;
  }

  function mount() {
    // Homepage only -- this is a hero-level atmospheric element, not a
    // sitewide fixture like the ambient wash.
    if (!document.querySelector('.homepage-intro')) return;
    if (document.querySelector('.ambient-compass')) return;

    const wrap = document.createElement('div');
    wrap.className = 'ambient-compass';
    wrap.innerHTML = compassSVG();
    document.body.insertBefore(wrap, document.body.firstChild);

    const hourEl = document.getElementById('ambient-compass-hour');
    const minuteEl = document.getElementById('ambient-compass-minute');
    if (!hourEl || !minuteEl) return;

    const now = new Date();
    const secIntoHour = now.getMinutes() * 60 + now.getSeconds();
    const secIntoTwelveHours = (now.getHours() % 12) * 3600 + secIntoHour;

    if (reduceMotion()) {
      hourEl.style.transform = `rotate(${(secIntoTwelveHours / 43200) * 360}deg)`;
      minuteEl.style.transform = `rotate(${(secIntoHour / 3600) * 360}deg)`;
      return;
    }

    minuteEl.style.animation = 'ambient-clock-spin 3600s linear infinite';
    minuteEl.style.animationDelay = `-${secIntoHour}s`;
    hourEl.style.animation = 'ambient-clock-spin 43200s linear infinite';
    hourEl.style.animationDelay = `-${secIntoTwelveHours}s`;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
