// Weekly movers: biggest seven-day change, from stored history only.
// A city without enough history is omitted, never shown as flat.
(function () {
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

  async function mount(){
    const host=document.getElementById('movers-list');
    if(!host) return;
    const list=(window.CITIES_DATA||[]).filter(c=>c.available!==false);
    // Sample the ranked head of the list -- 150 sequential history calls
    // would be unkind to the API and to the page.
    const sample=list.slice().sort((a,b)=>(a.rank||999)-(b.rank||999)).slice(0,40);
    const results=await Promise.all(sample.map(async c=>{
      const s=await GlotempFeatures.historyFor(c.slug,7);
      if(!s||s.length<2) return null;
      return {city:c, series:s, delta:s[s.length-1].value-s[0].value};
    }));
    const movers=results.filter(Boolean).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,20);

    if(!movers.length){
      host.innerHTML=`<p class="empty-recruit"><strong>No city has enough stored history yet to measure a week.</strong><br>
        <span class="empty-cta">Check back once the collectors have run.</span></p>`;
      return;
    }
    host.innerHTML=movers.map((m,i)=>{
      const b=GlotempCore.moodToBand(m.city.mood);
      const up=m.delta>=0;
      return `<a class="mover-row" href="/cities/${esc(m.city.slug)}.html" style="--mv-band:${b.color};">
        <span class="mover-rank">${i+1}</span>
        <span class="mover-city">${esc(m.city.name)}</span>
        <span class="mover-country">${esc(m.city.country)}</span>
        <span class="mover-spark">${GlotempFeatures.sparklineSVG(m.series,b.color)}</span>
        <span class="mover-delta">${up?'▲':'▼'} ${Math.abs(m.delta).toFixed(2)}</span>
      </a>`;
    }).join('');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount);
  else mount();
})();
