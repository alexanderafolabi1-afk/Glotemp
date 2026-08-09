// Daily Pulse -> city showcase rotator. Default city is Helsinki.
// One line about a city, rotating slowly; pauses on a hidden tab.
(function () {
  const DEFAULT_SLUG = 'helsinki';
  const ROTATE_MS = 9000;
  let idx = 0, order = [], timer = null;

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

  function paint(){
    const city = order[idx % order.length];
    if(!city) return;
    const nameEl=document.getElementById('showcase-city');
    const lineEl=document.getElementById('showcase-line');
    const openEl=document.getElementById('showcase-open');
    const l=line(city);
    if (typeof GlotempLandmarks !== 'undefined') {
      nameEl.innerHTML = GlotempLandmarks.cityIconHTML(city.slug, { size: 22, className: 'city-landmark-icon' }) + `<span>${esc(city.name)}</span>`;
    } else {
      nameEl.textContent = city.name;
    }
    nameEl.style.color=l.color;
    lineEl.textContent=l.text;
    openEl.href=`/cities/${city.slug}.html`;
    openEl.textContent=`Open ${city.name} →`;
  }

  function mount(){
    if(!document.getElementById('showcase')) return;
    const all=(window.CITIES_DATA||[]).filter(c=>c.available!==false);
    if(!all.length) return;
    const first=all.find(c=>c.slug===DEFAULT_SLUG);
    const rest=all.filter(c=>c.slug!==DEFAULT_SLUG).sort(()=>Math.random()-0.5);
    order=first?[first,...rest]:rest;
    paint();
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timer=setInterval(()=>{ if(document.hidden) return; idx++; paint(); }, ROTATE_MS);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount);
  else mount();
})();
