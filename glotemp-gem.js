// Hidden gem: a weighted die that lands on a lost or mythical city and
// tells you about it here, on this page.
//
// WHAT CHANGED AND WHAT DID NOT
// The roll interaction is untouched: same die, same button, same 1500ms
// cubic-bezier spin, same "Rolling…" then reveal, same weekly favourite
// with a modest edge. What changed is the pool it draws from and what
// appears afterwards. These entries are not tracked cities and have no
// /cities/ page, so the reveal renders inline instead of linking out to
// a page that does not exist.
//
// TWO CATEGORIES, AND THE RULE ABOUT THEM
// Every result is labelled 'Ancient city' or 'Legend' and the label is
// drawn from the entry's own category field, never inferred. A legend
// additionally renders its status line -- the sentence saying it has
// never been found -- and its beats are already written as what the
// story says. Three separate things say "this is a story", so no single
// failure can leave Atlantis reading as geography.
//
// IMAGES
// Ancient entries take the lead image from their own Wikipedia article,
// which is a photograph of a real place. Deliberately not
// city-spotlight.js's themed Commons search: its themes are "garden",
// "old town", "historic district" and the like, tuned for cities people
// currently live in, and running them against a ruin returns the wrong
// pictures or none. The fact tiers below are that file's, unchanged.
//
// Legends do not. An article about a myth can carry any illustration,
// including modern fantasy art, and presenting that as documentary is
// exactly what this page must not do. A legend shows an image only if
// lost-cities-data.js names a specific historical work for it, only if
// the article that comes back is the one we asked for, and only with
// the caption naming what the work is. Otherwise: text, and no picture.
// Nothing here is ever generated or stood in for.
(function () {
  'use strict';

  var WIKI_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function reduceMotion(){return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;}

  // The weekly favourite is deterministic per ISO week, so everyone sees
  // the same one all week and it turns over on its own.
  function isoWeek(d){
    var t=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));
    t.setUTCDate(t.getUTCDate()+4-(t.getUTCDay()||7));
    return Math.ceil(((t-Date.UTC(t.getUTCFullYear(),0,1))/86400000+1)/7);
  }
  function siteOfWeek(list){
    var n=new Date();
    var seed=GlotempFeatures.hash(n.getUTCFullYear()+'-W'+isoWeek(n));
    return list[seed%list.length];
  }

  function dieSVG(){
    var pip=function(cx,cy){return '<circle cx="'+cx+'" cy="'+cy+'" r="9" fill="#2A2118"/>';};
    return '<svg viewBox="0 0 180 180" role="img" aria-label="Hidden gem die">'+
      '<g class="gem-cube" id="gem-cube">'+
        '<rect x="22" y="22" width="136" height="136" rx="18" '+
          'fill="#F0E0C8" stroke="#B08D57" stroke-width="2"/>'+
        pip(58,58)+pip(122,58)+pip(90,90)+pip(58,122)+pip(122,122)+
      '</g>'+
    '</svg>';
  }

  // ---------- Wikipedia ----------
  // Same source and same shape city-wiki.js already uses: the keyless,
  // CORS-enabled REST summary endpoint, fetched in the visitor's own
  // browser, never proxied and never stored.
  var summaryCache = Object.create(null);
  function summary(title){
    if (summaryCache[title]) return summaryCache[title];
    summaryCache[title] = fetch(WIKI_SUMMARY + encodeURIComponent(title), {
      headers: { Accept: 'application/json' },
    }).then(function (resp) {
      if (!resp.ok) return null;
      return resp.json();
    }).then(function (data) {
      if (!data || data.type === 'disambiguation') return null;
      return data;
    }).catch(function () { return null; });
    return summaryCache[title];
  }

  function pageURL(data){
    return (data && data.content_urls && data.content_urls.desktop &&
            data.content_urls.desktop.page) || null;
  }

  // Did we get the article we asked for? Redirects are fine -- Wikipedia
  // normalises titles -- but a summary for something else entirely is
  // not, and for a legend that is the difference between a named
  // historical map and an unlabelled picture of nothing in particular.
  function sameArticle(data, wanted){
    if (!data) return false;
    var got = (data.titles && (data.titles.normalized || data.titles.canonical)) || data.title || '';
    var norm = function (s) { return String(s).toLowerCase().replace(/[\s_]+/g, ' ').trim(); };
    return norm(got) === norm(wanted);
  }

  // ---------- reveal ----------

  function labelHTML(entry){
    var isLegend = entry.category === 'legend';
    return '<span class="gem-tag ' + (isLegend ? 'is-legend' : 'is-ancient') + '">' +
      (isLegend ? 'Legend' : 'Ancient city') + '</span>';
  }

  function figureHTML(entry, art, artData){
    // art/artData are the resolved image source. Either can be absent,
    // and absent means no figure at all rather than a placeholder.
    if (!art) return '';
    var credit = entry.category === 'legend'
      ? esc(entry.artwork.caption)
      : 'Photograph of ' + esc(entry.name) + ', via Wikimedia Commons.';
    var href = pageURL(artData);
    var img = '<img class="gem-photo" src="' + esc(art) + '" alt="' + esc(entry.name) + '" ' +
              'loading="lazy" decoding="async">';
    return '<figure class="gem-figure">' +
      (href ? '<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + img + '</a>' : img) +
      '<figcaption class="gem-caption">' + credit + '</figcaption>' +
    '</figure>';
  }

  // Real sentence-ending punctuation followed by whitespace, not a hard
  // character truncation that would cut a sentence off mid-word. Same
  // splitter city-spotlight.js uses.
  function splitSentences(text, max) {
    var parts = String(text || '').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
    return parts.slice(0, max);
  }

  // The same two tiers city-spotlight.js uses, in the same order and
  // with the same honesty rule: the curated file first, and where it has
  // nothing, real Wikipedia extract sentences -- never text invented
  // here to pad a thin entry out.
  function factsFor(entry, wikiData){
    var curated = (entry.beats || []).filter(function (b) {
      return typeof b === 'string' && b.trim();
    }).slice(0, 4);
    if (curated.length) return curated;
    var extract = wikiData && wikiData.extract;
    if (!extract) return [];
    return splitSentences(extract, 4);
  }

  function beatsHTML(entry, wikiData){
    var facts = factsFor(entry, wikiData);
    if (!facts.length) return '';
    return '<ul class="gem-beats">' + facts.map(function (b) {
      return '<li>' + esc(b) + '</li>';
    }).join('') + '</ul>';
  }

  function revealHTML(entry, art, artData, wikiData){
    var isLegend = entry.category === 'legend';
    var source = pageURL(wikiData);
    return '' +
      '<article class="gem-card ' + (isLegend ? 'is-legend' : 'is-ancient') + '">' +
        '<header class="gem-card-head">' +
          labelHTML(entry) +
          '<h2 class="gem-name">' + esc(entry.name) + '</h2>' +
          '<p class="gem-meta">' + esc(entry.where) + ' &middot; ' + esc(entry.era) + '</p>' +
        '</header>' +
        figureHTML(entry, art, artData) +
        // The status line is the load-bearing sentence for a legend and
        // is printed before anything else you could mistake for fact.
        (isLegend
          ? '<p class="gem-status"><span class="gem-status-mark">Not a real place.</span> ' +
              esc(entry.status) + '</p>' +
            '<p class="gem-origin">Told in: ' + esc(entry.origin) + '</p>'
          : '') +
        beatsHTML(entry, wikiData) +
        (source
          ? '<p class="gem-source"><a href="' + esc(source) + '" target="_blank" rel="noopener noreferrer">' +
              'Read more on Wikipedia &rarr;</a></p>'
          : '') +
      '</article>';
  }

  var rolling=false, spin=0;

  function mount(){
    var dieEl=document.getElementById('gem-die');
    if(!dieEl) return;
    dieEl.innerHTML=dieSVG();
    var list=(window.LOST_CITIES||[]);
    if(!list.length) return;

    var cow=siteOfWeek(list);
    var weekEl=document.getElementById('gem-week');
    if(weekEl && cow) weekEl.textContent='This week’s site - '+cow.name;

    var go=document.getElementById('gem-go');
    var roll=document.getElementById('gem-roll');
    var out=document.getElementById('gem-reveal');

    function pick(){
      // Same weighting as before: the weekly one gets a modest edge and
      // everything else stays reachable, so the button is never a fixed
      // answer.
      var weighted=list.map(function(c){return {c:c,w:(cow&&c.slug===cow.slug)?6:1};});
      var total=weighted.reduce(function(s,x){return s+x.w;},0);
      var r=Math.random()*total, hit=weighted[weighted.length-1].c;
      for(var i=0;i<weighted.length;i++){ r-=weighted[i].w; if(r<=0){ hit=weighted[i].c; break; } }
      return hit;
    }

    function land(){
      var hit=pick();

      // The one-line reveal keeps the old pattern: a sentence in the
      // same slot, saying what you landed on, before the detail loads.
      roll.textContent = hit.category === 'legend'
        ? hit.name + '. A legend, ' + hit.where.charAt(0).toLowerCase() + hit.where.slice(1) + '.'
        : hit.name + '. ' + hit.where + ', ' + hit.era.charAt(0).toLowerCase() + hit.era.slice(1) + '.';

      out.hidden = false;
      out.innerHTML = '<p class="gem-loading">Loading&hellip;</p>';

      // An ancient site takes its own article's lead image. A legend
      // takes only the named historical work, if it has one at all.
      var wantArt = hit.category === 'legend'
        ? (hit.artwork ? hit.artwork.title : null)
        : hit.wikiTitle;

      Promise.all([
        summary(hit.wikiTitle),
        wantArt ? summary(wantArt) : Promise.resolve(null),
      ]).then(function (res) {
        var wikiData = res[0];
        var artData = res[1];
        var art = null;

        if (artData && artData.thumbnail && artData.thumbnail.source) {
          // For a legend, only if this really is the work we named.
          if (hit.category !== 'legend' || sameArticle(artData, wantArt)) {
            art = artData.thumbnail.source;
          }
        }

        out.innerHTML = revealHTML(hit, art, artData, wikiData);
      }).catch(function () {
        // Network gone: still show everything that does not need it.
        out.innerHTML = revealHTML(hit, null, null, null);
      });

      go.disabled=false; rolling=false;
      go.textContent='Roll again';
    }

    function doRoll(){
      if(rolling) return;
      rolling=true; go.disabled=true;
      if(out) out.hidden=true;
      roll.textContent='Rolling…';
      if(reduceMotion()){ land(); return; }
      var cube=document.getElementById('gem-cube');
      spin+=720+Math.floor(Math.random()*360);
      cube.style.transition='transform 1500ms cubic-bezier(0.16,0.84,0.24,1)';
      cube.style.transform='rotate('+spin+'deg)';
      setTimeout(land,1560);
    }
    go.addEventListener('click',doRoll);
    dieEl.addEventListener('click',doRoll);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount);
  else mount();
})();
