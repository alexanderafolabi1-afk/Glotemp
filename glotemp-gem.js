// Hidden gem: a weighted die that lands on a city and opens its long read.
// One city carries City of the Week; the die always works regardless.
(function () {
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function reduceMotion(){return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;}

  // City of the Week is deterministic per ISO week, so everyone sees the
  // same one all week and it changes on its own.
  function isoWeek(d){
    const t=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));
    t.setUTCDate(t.getUTCDate()+4-(t.getUTCDay()||7));
    return Math.ceil(((t-Date.UTC(t.getUTCFullYear(),0,1))/86400000+1)/7);
  }
  function cityOfWeek(list){
    const n=new Date();
    const seed=GlotempFeatures.hash(`${n.getUTCFullYear()}-W${isoWeek(n)}`);
    return list[seed%list.length];
  }

  function dieSVG(){
    const pip=(cx,cy)=>`<circle cx="${cx}" cy="${cy}" r="9" fill="#2A2118"/>`;
    return `<svg viewBox="0 0 180 180" role="img" aria-label="Hidden gem die">
      <g class="gem-cube" id="gem-cube">
        <rect x="22" y="22" width="136" height="136" rx="18"
          fill="#F0E0C8" stroke="#B08D57" stroke-width="2"/>
        ${pip(58,58)}${pip(122,58)}${pip(90,90)}${pip(58,122)}${pip(122,122)}
      </g>
    </svg>`;
  }

  let rolling=false, spin=0;

  function mount(){
    const dieEl=document.getElementById('gem-die');
    if(!dieEl) return;
    dieEl.innerHTML=dieSVG();
    const list=(window.CITIES_DATA||[]).filter(c=>c.available!==false);
    if(!list.length) return;

    const cow=cityOfWeek(list);
    const weekEl=document.getElementById('gem-week');
    if(weekEl && cow) weekEl.textContent=`City of the week — ${cow.name}`;

    const go=document.getElementById('gem-go');
    const roll=document.getElementById('gem-roll');
    const open=document.getElementById('gem-open');

    function land(){
      // City of the Week gets a modest edge; every other city stays
      // reachable, so the button is never a fixed answer.
      const weighted=list.map(c=>({c,w:(cow&&c.slug===cow.slug)?6:1}));
      const total=weighted.reduce((s,x)=>s+x.w,0);
      let r=Math.random()*total, hit=weighted[weighted.length-1].c;
      for(const x of weighted){ r-=x.w; if(r<=0){ hit=x.c; break; } }
      const b=GlotempCore.moodToBand(hit.mood);
      roll.textContent=`${hit.name}. ${hit.country}, reading ${hit.mood.toFixed(1)} and ${b.band}.`;
      open.href=`/cities/${hit.slug}.html`;
      open.textContent=`Open the long read on ${hit.name} →`;
      open.hidden=false;
      go.disabled=false; rolling=false;
    }

    function doRoll(){
      if(rolling) return;
      rolling=true; go.disabled=true; open.hidden=true;
      roll.textContent='Rolling…';
      if(reduceMotion()){ land(); return; }
      const cube=document.getElementById('gem-cube');
      spin+=720+Math.floor(Math.random()*360);
      cube.style.transition='transform 1500ms cubic-bezier(0.16,0.84,0.24,1)';
      cube.style.transform=`rotate(${spin}deg)`;
      setTimeout(land,1560);
    }
    go.addEventListener('click',doRoll);
    dieEl.addEventListener('click',doRoll);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount);
  else mount();
})();
