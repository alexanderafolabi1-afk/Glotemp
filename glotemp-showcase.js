// Daily Pulse -> city showcase rotator. Default city is Helsinki.
// One line about a city, rotating slowly; pauses on a hidden tab.
//
// Upgraded to the homepage-radio-card reference layout: a real photo
// (same cached Wikipedia thumbnail city-header-photo.js already uses,
// via GlotempWiki.getCityImageUrl -- no second image source), the same
// 0-10 gauge the city header uses (glotemp-gauge.js), and the existing
// live radio engine (GlotempRadio.fetchTopStation, the same resolver
// glotemp-home-frequency.js already calls) hooked to a small toggle
// scoped to this card's own <audio> -- no new streaming library, no new
// station database, no second player fighting the city-page picker or
// Home Frequency's own player for the same audio.
//
// THE DRAW. This card no longer rotates on a timer -- the visitor turns
// it. One city on screen, the next one unknown until it lands: swipe up
// (or J) to draw again, swipe right (or K) to follow, swipe left (or L)
// to skip, tap the still (or Enter) to open the city.
//
// Nothing about the next city is rendered before it is drawn -- no
// stacked card behind, no incoming band or score -- because a previewed
// next card is a spoiler, and the uncertainty is the whole mechanic.
//
// The wheel above (glotemp-hero-instrument.js) is the same loop: its
// existing flick/tap already calls GlotempCore.setPinnedCity, and this
// card listens for the glotemp:city-pinned that fires from it. One
// pinned city, two surfaces, no second source of truth.
//
// Deliberately absent: coins, expiring streaks, scores for the visitor,
// and any "it's a match" moment. The reward is the next city.
(function () {
  const DEFAULT_SLUG = 'helsinki';
  // Past this many pixels a drag counts as the gesture rather than a
  // stray finger movement; the dominant axis wins, so a diagonal is
  // resolved rather than firing two actions.
  const SWIPE_PX = 56;
  let idx = 0, order = [];
  // Skipped this session only. Not persisted, because a skip is "not
  // this one, now" -- not a permanent judgement to be remembered and
  // certainly not a score to be kept.
  const skipped = new Set();
  let reduceMotion = false;
  let busy = false;
  // Set when a pointer sequence travelled far enough to count as a
  // swipe, so the click that browsers fire afterwards does not also open
  // the city. Cleared by the first click that follows.
  let swallowNextClick = false;

  // Bumped on every paint() / radio toggle so a slow-resolving photo or
  // station fetch from a city we've already rotated away from can't land
  // late and overwrite what's now showing -- same guard pattern
  // city-radio.js's own `resolving` flag uses for the same race.
  let photoGen = 0;
  let radioGen = 0;
  let radioOn = false;

  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

  function line(city){
    const b = GlotempCore.moodToBand(city.mood);
    let when = '';
    try {
      const h = Number(new Intl.DateTimeFormat('en-US',{timeZone:city.timezone,hour12:false,hour:'numeric'})
        .formatToParts(new Date()).find(p=>p.type==='hour').value)%24;
      when = h<5?'in the small hours':h<12?'this morning':h<17?'this afternoon':h<21?'this evening':'tonight';
    } catch(e){ when = 'right now'; }
    const phrase = { charged:'is charged', warm:'is warm', equilibrium:'is level',
                     restrained:'is restrained', low:'is quiet' }[b.band] || 'is level';
    return { text:`${city.country}. It ${phrase} ${when}, reading ${city.mood.toFixed(1)}.`, color:b.color };
  }

  function localTime(city) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: city.timezone, weekday: 'short', hour: 'numeric', minute: '2-digit',
        hour12: false, timeZoneName: 'short',
      }).formatToParts(new Date());
      const get = (t) => (parts.find((p) => p.type === t) || {}).value || '';
      return `${get('weekday')} ${get('hour')}:${get('minute')} ${get('timeZoneName')}`.trim();
    } catch (e) {
      return '';
    }
  }

  function renderPhotoCredit(wrap, photo) {
    const existing = wrap.querySelector('.showcase-photo-credit');
    if (existing) existing.remove();
    if (!photo || !photo.creator) return;
    const a = document.createElement('a');
    a.className = 'showcase-photo-credit';
    a.href = photo.sourceUrl || '#';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = `Photo: ${photo.creator}${photo.licence ? ` (${photo.licence})` : ''}`;
    wrap.appendChild(a);
  }

  // Same priority chain as the city header (see city-header-photo.js):
  // /city-media/'s pre-fetched, licence-checked photos first (same-origin,
  // no third-party network dependency), then the 24 hand-verified
  // landmarks, then the two-tier Wikipedia lookup. One shared image
  // strategy, not a second one invented for this card.
  function paintPhoto(city) {
    const wrap = document.getElementById('showcase-photo');
    const img = document.getElementById('showcase-photo-img');
    if (!wrap || !img) return;
    wrap.classList.remove('is-loaded');
    const myGen = ++photoGen;

    function apply(url, credit) {
      if (!url || myGen !== photoGen) return; // no photo, or we've since rotated on
      img.addEventListener('load', () => { if (myGen === photoGen) wrap.classList.add('is-loaded'); }, { once: true });
      img.src = url;
      renderPhotoCredit(wrap, credit);
    }

    const mediaPromise = (typeof GlotempCityMedia !== 'undefined' && GlotempCityMedia.getPhoto)
      ? GlotempCityMedia.getPhoto(city.slug)
      : Promise.resolve(null);

    mediaPromise.then((photo) => {
      if (myGen !== photoGen) return;
      if (photo && photo.url) return apply(photo.url, photo);

      const landmarkPromise = (typeof GlotempLandmarkPhotos !== 'undefined' && GlotempLandmarkPhotos.hasPhoto(city.slug))
        ? GlotempLandmarkPhotos.getPhotoUrl(city.slug)
        : Promise.resolve(null);
      return landmarkPromise.then((landmarkUrl) => {
        if (myGen !== photoGen) return;
        if (landmarkUrl) return apply(landmarkUrl, null);
        if (typeof GlotempWiki === 'undefined' || !GlotempWiki.getCityImageUrl) return;
        return GlotempWiki.getCityImageUrl(city.name, city.country).then((url) => apply(url, null));
      });
    }).catch(() => {});
  }

  function paintGauge(city) {
    const mount = document.getElementById('showcase-gauge-mount');
    if (!mount || typeof GlotempGauge === 'undefined') return;
    mount.innerHTML = GlotempGauge.renderSVG(city.mood, { ariaLabel: `${city.name} reading ${city.mood.toFixed(1)} out of 10` });
  }

  // Stops any current playback and, if the listener has radio switched
  // on, resolves and plays the given city's top station -- the same
  // "clean stop/start, silence rather than keep the old city playing"
  // behaviour whether this runs from a click or from the rotation timer.
  function syncRadio(city) {
    const audio = document.getElementById('showcase-radio-audio');
    const label = document.getElementById('showcase-radio-label');
    const btn = document.getElementById('showcase-radio-toggle');
    if (!audio || !label || !btn) return;

    audio.pause();
    audio.removeAttribute('src');
    audio.load();

    if (!radioOn) {
      label.textContent = 'Tune in';
      btn.setAttribute('aria-pressed', 'false');
      btn.classList.remove('is-live');
      return;
    }
    if (typeof GlotempRadio === 'undefined' || city.lat == null || city.lon == null) {
      label.textContent = 'No live signal';
      btn.classList.remove('is-live');
      return;
    }
    const myGen = ++radioGen;
    label.textContent = 'Tuning in…';
    btn.setAttribute('aria-pressed', 'true');
    GlotempRadio.fetchTopStation(city.lat, city.lon, city.country, city.slug).then(async (result) => {
      if (myGen !== radioGen) return; // rotated (or toggled off) before this resolved
      if (!result || !result.station) {
        label.textContent = 'No live signal';
        btn.classList.remove('is-live');
        return;
      }
      const station = result.station;
      try {
        let url = station.url;
        if (!station.curated) {
          const resp = await fetch(`https://de1.api.radio-browser.info/json/url/${encodeURIComponent(station.stationuuid)}`);
          const resolved = resp.ok ? await resp.json() : null;
          url = (resolved && resolved.url) || station.url_resolved || station.url;
        }
        if (myGen !== radioGen) return;
        if (!url) throw new Error('no stream url');
        audio.src = url;
        await audio.play();
        if (myGen !== radioGen) { audio.pause(); return; }
        label.textContent = `On air — ${station.name || 'Local station'}`;
        btn.classList.add('is-live');
      } catch (e) {
        if (myGen !== radioGen) return;
        label.textContent = 'No live signal';
        btn.classList.remove('is-live');
      }
    }).catch(() => {
      if (myGen !== radioGen) return;
      label.textContent = 'No live signal';
      btn.classList.remove('is-live');
    });
  }

  // A room / a flight / a table, shown ONLY when this city's band is warm
  // or charged. The other three bands hide the row entirely rather than
  // grey it out: on a level, restrained or quiet reading there is nothing
  // here worth acting on, and offering it anyway is the kind of always-on
  // upsell this card is meant not to be. Same destinations glotemp-spin.js
  // already uses -- no new affiliate, no new partner.
  const ACT_BANDS = { warm: true, charged: true };
  function paintActions(city) {
    const row = document.getElementById('showcase-actions');
    if (!row) return;
    const band = GlotempCore.moodToBand(city.mood).band;
    if (!ACT_BANDS[band]) { row.hidden = true; return; }
    const q = encodeURIComponent(`${city.name} ${city.country}`);
    const set = (id, href, label) => {
      const a = document.getElementById(id);
      if (!a) return;
      a.href = href;
      const l = a.querySelector('.showcase-act-label');
      if (l) l.textContent = label;
    };
    set('showcase-act-room', `https://www.booking.com/searchresults.html?ss=${q}`, `Stay in ${city.name}`);
    set('showcase-act-flight', `https://www.skyscanner.net/transport/flights-to/${q}/`, `Fly to ${city.name}`);
    set('showcase-act-table', `https://www.opentable.com/s?term=${q}`, `Book a table in ${city.name}`);
    row.hidden = false;
  }

  function paint(){
    const city = order[idx % order.length];
    if(!city) return;
    const nameEl=document.getElementById('showcase-city');
    const lineEl=document.getElementById('showcase-line');
    const openEl=document.getElementById('showcase-open');
    const bandWordEl=document.getElementById('showcase-band-word');
    const scoreEl=document.getElementById('showcase-score');
    const timeEl=document.getElementById('showcase-time');
    const l=line(city);
    if (typeof GlotempLandmarks !== 'undefined') {
      nameEl.innerHTML = GlotempLandmarks.cityIconHTML(city.slug, { size: 22, className: 'city-landmark-icon' }) + `<span>${esc(city.name)}</span>`;
      if (typeof GlotempLandmarkPhotos !== 'undefined') GlotempLandmarkPhotos.upgrade(nameEl, city.slug, 22);
    } else {
      nameEl.textContent = city.name;
    }
    nameEl.style.color=l.color;
    lineEl.textContent=l.text;
    openEl.href=`/cities/${city.slug}.html`;
    openEl.textContent=`Open ${city.name} →`;

    if (bandWordEl && scoreEl) {
      const band = GlotempCore.moodToBand(city.mood);
      bandWordEl.textContent = band.band;
      bandWordEl.style.color = band.color;
      scoreEl.textContent = `${city.mood.toFixed(1)}/10`;
      scoreEl.style.color = band.color;
    }
    if (timeEl) timeEl.textContent = localTime(city);

    paintPhoto(city);
    paintGauge(city);
    paintActions(city);
    // Radio follows the city, through the card's ONE <audio> element and
    // the existing resolver. syncRadio stops whatever was playing first,
    // and only tunes the new city if the listener had it switched on --
    // so muted stays muted across every draw, and a city with no station
    // lands on "No live signal" in silence rather than leaving the
    // previous city's stream running under a new city's name.
    syncRadio(city);
    paintFollowState(city);
  }

  function wireRadioToggle() {
    const btn = document.getElementById('showcase-radio-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      radioOn = !radioOn;
      const city = order[idx % order.length];
      if (city) syncRadio(city);
    });
  }

  // ---------- the draw ----------

  function currentCity() { return order.length ? order[idx % order.length] : null; }

  // Advances to the next city the visitor has not skipped. The card is
  // never told what is coming: this runs after the outgoing card has
  // already left, so nothing about the next city can be read early.
  function advance() {
    if (!order.length) return null;
    for (let step = 1; step <= order.length; step++) {
      const cand = order[(idx + step) % order.length];
      if (cand && !skipped.has(cand.slug)) { idx = (idx + step) % order.length; return cand; }
    }
    // Every city skipped: the deck is spent, so start it over rather than
    // leave the card stuck on one city with nowhere to go.
    skipped.clear();
    idx = (idx + 1) % order.length;
    return order[idx];
  }

  // One place that moves the card on, whatever triggered it. Pins the new
  // city through GlotempCore so the wheel above lands on the same city --
  // the event it fires comes back to onPinned() below, which sees the
  // slug already showing and does nothing, so there is no loop.
  function draw(direction) {
    if (busy || !order.length) return;
    const card = document.getElementById('showcase');
    const next = advance();
    if (!next) return;
    const finish = () => {
      paint();
      if (window.GlotempCore) GlotempCore.setPinnedCity(next.slug);
      if (card) { card.classList.remove('is-leaving-up', 'is-leaving-left', 'is-leaving-right'); }
      busy = false;
    };
    if (reduceMotion || !card) { finish(); return; }
    busy = true;
    card.classList.add(direction === 'left' ? 'is-leaving-left'
      : direction === 'right' ? 'is-leaving-right' : 'is-leaving-up');
    // transitionend is not guaranteed (a backgrounded tab never fires
    // it), so the timeout is the real contract and the listener is only
    // there to feel immediate.
    let done = false;
    const once = () => { if (done) return; done = true; finish(); };
    card.addEventListener('transitionend', once, { once: true });
    setTimeout(once, 320);
  }

  function announce(msg) {
    const el = document.getElementById('showcase-draw-status');
    if (el) el.textContent = msg;
  }

  // Bumped like photoGen/radioGen, for the same reason: a follow lookup
  // for a city we have already drawn past must not paint its answer.
  let followGen = 0;
  async function paintFollowState(city) {
    const btn = document.getElementById('showcase-pin');
    if (!btn) return;
    btn.setAttribute('aria-pressed', 'false');
    btn.classList.remove('is-pinned');
    if (!window.GlotempCheckin || !GlotempCheckin.isFollowingCity) return;
    const gen = ++followGen;
    try {
      const following = await GlotempCheckin.isFollowingCity(city.slug);
      if (gen !== followGen) return; // drawn on since this was asked
      btn.setAttribute('aria-pressed', following ? 'true' : 'false');
      btn.classList.toggle('is-pinned', !!following);
    } catch (e) { /* leave it unpinned; the follow itself still works */ }
  }

  // Pin === the site's existing follow. This does not write its own row:
  // it calls the same city_watchers follow the "Follow this city" button
  // on every city page uses, through the same sign-in gate.
  async function pin() {
    const city = currentCity();
    if (!city || !window.GlotempCheckin || !GlotempCheckin.followCity) return;
    const btn = document.getElementById('showcase-pin');
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
    const res = await GlotempCheckin.followCity(city.slug, city.name);
    if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
    if (res && res.ok) {
      announce(res.following ? `Following ${city.name}.` : `No longer following ${city.name}.`);
      if (btn) {
        btn.setAttribute('aria-pressed', res.following ? 'true' : 'false');
        btn.classList.toggle('is-pinned', !!res.following);
      }
      // A pin is a keep, not a dismissal -- the card stays on the city
      // just pinned, and the visitor draws again when they want to.
    }
  }

  function skip() {
    const city = currentCity();
    if (city) skipped.add(city.slug);
    draw('left');
  }

  function openCity() {
    const city = currentCity();
    if (city) window.location.href = `/cities/${city.slug}.html`;
  }

  function wireGestures() {
    const card = document.getElementById('showcase');
    if (!card) return;

    // The still opens the city. Anything already interactive inside the
    // card (radio toggle, the three action links, the open link, the
    // draw buttons) keeps its own behaviour.
    const still = document.getElementById('showcase-photo');
    if (still) {
      still.setAttribute('role', 'button');
      still.setAttribute('tabindex', '0');
      still.removeAttribute('aria-hidden');
      still.setAttribute('aria-label', 'Open this city');
      still.addEventListener('click', () => {
        // The still fills the card, so every swipe that starts over it
        // ends with a click here too. A gesture that travelled is not a
        // tap: swallow the click once rather than navigating away
        // mid-swipe.
        if (swallowNextClick) { swallowNextClick = false; return; }
        openCity();
      });
    }

    document.getElementById('showcase-next')?.addEventListener('click', () => draw('up'));
    document.getElementById('showcase-pin')?.addEventListener('click', pin);
    document.getElementById('showcase-skip')?.addEventListener('click', skip);

    // Keys work regardless of motion preference, and never while the
    // visitor is typing into the hero search or any other field.
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.matches('input, textarea, select') || t.isContentEditable)) return;
      if (!card.getBoundingClientRect().height) return;
      const k = e.key.toLowerCase();
      if (k === 'j') { e.preventDefault(); draw('up'); }
      else if (k === 'k') { e.preventDefault(); pin(); }
      else if (k === 'l') { e.preventDefault(); skip(); }
      // Enter is handled on the still itself below, so it only opens the
      // city when the still actually has focus -- never while the
      // visitor is tabbing through the rest of the page.
    });
    if (still) {
      still.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCity(); }
      });
    }

    // Under prefers-reduced-motion the buttons ARE the interface: no drag
    // tracking, no card transform, nothing that moves under the finger.
    if (reduceMotion) return;

    let startX = 0, startY = 0, id = null, dragging = false, downOnStill = false;
    // Belt and braces with the CSS above: Firefox honours neither
    // -webkit-user-drag nor user-drag, so the native image drag has to be
    // refused here too or the swipe dies as pointercancel.
    card.addEventListener('dragstart', (e) => e.preventDefault());
    card.addEventListener('pointerdown', (e) => {
      if (e.target.closest('a, button, input, select, textarea')) return;
      id = e.pointerId; startX = e.clientX; startY = e.clientY; dragging = true;
      downOnStill = !!(still && still.contains(e.target));
      card.classList.add('is-dragging');
      // Keeps the whole gesture on this element even when the finger
      // leaves it, so a fast flick off the card's edge still resolves.
      try { card.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
    });
    card.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== id) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      // Follows the finger, but only the card that is already on screen.
      // Nothing behind it is revealed, because there is nothing behind it.
      card.style.transform = `translate(${dx * 0.35}px, ${Math.min(0, dy) * 0.35}px)`;
    });
    function end(e) {
      if (!dragging || e.pointerId !== id) return;
      dragging = false; id = null;
      card.classList.remove('is-dragging');
      card.style.transform = '';
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) < SWIPE_PX && Math.abs(dy) < SWIPE_PX) {
        // A tap. It has to be resolved here rather than left to the
        // still's own click handler: setPointerCapture above retargets
        // the click that follows onto the card, so that handler would
        // never see it. Measured -- the click arrived with target
        // #showcase, not the photo.
        if (downOnStill) openCity();
        return;
      }
      swallowNextClick = true;
      if (Math.abs(dy) > Math.abs(dx)) { if (dy < 0) draw('up'); return; }
      if (dx > 0) pin(); else skip();
    }
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', () => {
      dragging = false; id = null;
      card.classList.remove('is-dragging');
      card.style.transform = '';
    });
  }

  // The wheel's own flick/tap already pins a city. Land on it here rather
  // than running a second rotation of our own.
  function onPinned(e) {
    const slug = e.detail && e.detail.slug;
    if (!slug || !order.length) return;
    const cur = currentCity();
    if (cur && cur.slug === slug) return;
    const at = order.findIndex((c) => c.slug === slug);
    if (at === -1) return;
    idx = at;
    paint();
  }

  function mount(){
    if(!document.getElementById('showcase')) return;
    const all=(window.CITIES_DATA||[]).filter(c=>c.available!==false);
    if(!all.length) return;
    reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const card = document.getElementById('showcase');
    if (card) card.classList.toggle('reduced-motion', reduceMotion);
    // The city already pinned (the wheel, a previous visit, the mood
    // picker) opens the deck, so the two surfaces agree on first paint.
    const pinnedSlug = window.GlotempCore ? GlotempCore.getPinnedCity() : null;
    const firstSlug = (pinnedSlug && all.some(c=>c.slug===pinnedSlug)) ? pinnedSlug : DEFAULT_SLUG;
    const first=all.find(c=>c.slug===firstSlug);
    const rest=all.filter(c=>c.slug!==firstSlug).sort(()=>Math.random()-0.5);
    order=first?[first,...rest]:rest;
    wireRadioToggle();
    wireGestures();
    paint();
    document.addEventListener('glotemp:city-pinned', onPinned);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount);
  else mount();
})();
