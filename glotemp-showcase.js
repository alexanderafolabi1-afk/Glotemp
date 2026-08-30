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
(function () {
  const DEFAULT_SLUG = 'helsinki';
  const ROTATE_MS = 9000;
  let idx = 0, order = [], timer = null;

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
    syncRadio(city);
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

  function mount(){
    if(!document.getElementById('showcase')) return;
    const all=(window.CITIES_DATA||[]).filter(c=>c.available!==false);
    if(!all.length) return;
    const first=all.find(c=>c.slug===DEFAULT_SLUG);
    const rest=all.filter(c=>c.slug!==DEFAULT_SLUG).sort(()=>Math.random()-0.5);
    order=first?[first,...rest]:rest;
    wireRadioToggle();
    paint();
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer=setInterval(()=>{ if(document.hidden) return; idx++; paint(); }, ROTATE_MS);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount);
  else mount();
})();
