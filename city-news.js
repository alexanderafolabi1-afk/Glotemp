// Glotemp x GDELT: what is being reported about this city, right now, in
// the languages it is actually reported in.
//
// WHY THIS EXISTS
// People who have moved keep a city. Often several: born in one, studied
// in another, working in a third, family scattered across a fourth. What
// they lose is not statistics, it is the ordinary running commentary of
// the place. That is the gap this fills, and it is the thing that brings
// somebody back daily rather than once before a trip.
//
// WHY GDELT
// It monitors news in 65+ languages worldwide, is keyless and free.
// Critically it indexes the LOCAL press, not just the English wires, so a
// reader from Warsaw or Lima or Ho Chi Minh City gets their own outlets
// in their own language rather than a foreign desk's summary of home.
//
// GDELT IS NOT CORS-ENABLED
// An earlier version of this file said it was and called it directly from
// the browser. It is not, and every one of those requests was blocked
// before a response could be read, which showed up as "Nothing filed" on
// all 151 cities at once. The fetch now happens in
// supabase/functions/city-news and this file talks to that. Unlike
// city-radio.js and city-venues.js, whose sources really do send the
// header, this one needs the hop.
//
// WHAT IS NOT DONE HERE
// Nothing is written, rewritten, summarised or invented. Each item is a
// real headline from a real outlet, linked to the outlet. Glotemp is the
// window, not the author.
(function () {
  'use strict';

  var SHOW = 6;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // GDELT names languages in English words, not ISO codes.
  var NATIVE = {
    Spanish: 'Espanol', French: 'Francais', Portuguese: 'Portugues',
    German: 'Deutsch', Italian: 'Italiano', Dutch: 'Nederlands',
    Polish: 'Polski', Turkish: 'Turkce', Vietnamese: 'Tieng Viet',
    Japanese: 'Nihongo', Korean: 'Hangugeo', Arabic: 'Arabiyya',
    Russian: 'Russkiy', Ukrainian: 'Ukrainska', Czech: 'Cestina',
    Swedish: 'Svenska', Danish: 'Dansk', Norwegian: 'Norsk',
    Finnish: 'Suomi', Greek: 'Ellinika', Hebrew: 'Ivrit',
    Thai: 'Phasa Thai', Indonesian: 'Bahasa Indonesia', Romanian: 'Romana',
    Hungarian: 'Magyar', Bulgarian: 'Balgarski', Croatian: 'Hrvatski',
    Serbian: 'Srpski', Persian: 'Farsi', Hindi: 'Hindi', Bengali: 'Bangla',
    Urdu: 'Urdu', Tamil: 'Tamil', Chinese: 'Zhongwen', Catalan: 'Catala',
  };

  function languageLabel(name) {
    if (!name || name === 'English') return '';
    return NATIVE[name] || name;
  }

  // GDELT returns "20260816T101500Z". Date can't parse that.
  function parseStamp(s) {
    var m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(String(s || ''));
    if (!m) return null;
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
  }

  function ago(date) {
    if (!date) return '';
    var mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var h = Math.floor(mins / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }

  // Via our own function, NOT api.gdeltproject.org directly.
  //
  // GDELT sends no Access-Control-Allow-Origin header. Every direct
  // browser fetch to it was blocked before a response could be read, and
  // the catch below turned that into "Nothing filed" for all 151 cities
  // at once. Server to server has no CORS check, so supabase/functions/
  // city-news does the fetch and sets the headers a browser needs.
  //
  // The query moved there too. It used to be `"City" "Country"`, and two
  // quoted phrases in GDELT are an implicit AND: local coverage of a city
  // rarely repeats its own country's name, so that returned almost
  // nothing even where CORS was not the problem.
  var ENDPOINT = 'https://hnysztednzqfzbmiqqgl.supabase.co/functions/v1/city-news';

  function buildURL(cityName, limit) {
    return ENDPOINT +
      '?city=' + encodeURIComponent(cityName) +
      '&limit=' + encodeURIComponent(limit || SHOW);
  }

  async function fetchNews(cityName) {
    var resp = await fetch(buildURL(cityName, SHOW), { headers: { Accept: 'application/json' } });
    if (!resp.ok) return [];
    var data;
    try { data = await resp.json(); } catch (e) { return []; }
    return (data && Array.isArray(data.articles)) ? data.articles : [];
  }

  // One item per outlet. Breaking news gets syndicated, and six copies of
  // one story reads as a broken feed rather than a busy city.
  function oneEach(articles) {
    var seenDomain = {};
    var seenTitle = {};
    var out = [];
    for (var i = 0; i < articles.length; i++) {
      var a = articles[i];
      if (!a || !a.title || !a.url) continue;
      if (!/^https?:\/\//i.test(a.url)) continue;
      var d = String(a.domain || '').toLowerCase();
      var t = String(a.title).toLowerCase().slice(0, 60);
      if (seenDomain[d] || seenTitle[t]) continue;
      seenDomain[d] = true;
      seenTitle[t] = true;
      out.push(a);
      if (out.length >= SHOW) break;
    }
    return out;
  }

  function itemHTML(a) {
    var when = ago(parseStamp(a.seendate));
    var lang = languageLabel(a.language);
    return '<li class="news-item">' +
      '<a class="news-title" href="' + esc(a.url) + '" target="_blank" rel="noopener noreferrer nofollow">' +
        esc(a.title) +
      '</a>' +
      '<span class="news-meta">' +
        '<span class="news-source">' + esc(a.domain || '') + '</span>' +
        (lang ? '<span class="news-lang">' + esc(lang) + '</span>' : '') +
        (when ? '<span class="news-when">' + esc(when) + '</span>' : '') +
      '</span>' +
    '</li>';
  }

  // targetId lets the same module serve the city page and the homepage
  // window without either one owning the other's markup.
  async function loadNews(cityName, country, targetId) {
    var container = document.getElementById(targetId || 'news-content');
    if (!container || !cityName) return 0;

    container.innerHTML = '<p class="news-status">Reading the local press&hellip;</p>';

    var articles = [];
    try {
      articles = await fetchNews(cityName);
    } catch (e) {
      articles = [];
    }

    var items = oneEach(articles);

    if (!items.length) {
      container.innerHTML = '<p class="news-status">Nothing filed for ' + esc(cityName) + ' in the last few days.</p>';
      return 0;
    }

    container.innerHTML =
      '<ul class="news-list">' + items.map(itemHTML).join('') + '</ul>' +
      '<p class="news-attribution">Headlines monitored by <a href="https://www.gdeltproject.org" target="_blank" rel="noopener noreferrer">GDELT</a> across the world press. Each one opens at its own publisher.</p>';
    return items.length;
  }

  // Data only, no DOM -- glotemp-home-frequency.js wants a single headline
  // folded into its own card rather than the full <ul> loadNews renders.
  async function fetchHeadlines(cityName, limit) {
    if (!cityName) return [];
    try {
      const articles = await fetchNews(cityName);
      return oneEach(articles).slice(0, limit || 1);
    } catch (e) {
      return [];
    }
  }

  window.GlotempNews = { loadNews: loadNews, fetchHeadlines: fetchHeadlines, itemHTML: itemHTML };
})();
