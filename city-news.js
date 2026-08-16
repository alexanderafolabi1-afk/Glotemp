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
// It monitors news in 65+ languages worldwide, is keyless, free, and
// CORS-enabled. Critically it indexes the LOCAL press, not just the
// English wires, so a reader from Warsaw or Lima or Ho Chi Minh City gets
// their own outlets in their own language rather than a foreign desk's
// summary of their home.
//
// WHAT IS NOT DONE HERE
// Nothing is written, rewritten, summarised or invented. Each item is a
// real headline from a real outlet, linked to the outlet. Glotemp is the
// window, not the author.
//
// Client-side, keyless, never stored -- the same pattern as
// city-radio.js, city-wiki.js and city-venues.js.
(function () {
  'use strict';

  var ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc';
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

  // The city name alone matches too much (Cordoba is in Spain and
  // Argentina; Santiago is in several countries). Pairing it with the
  // country in a near-operator keeps it to the right place, and asking
  // GDELT to sort by date is what makes this a feed rather than an
  // archive.
  function buildURL(cityName, country) {
    var q = '"' + cityName + '"';
    if (country) q += ' "' + country + '"';
    return ENDPOINT +
      '?query=' + encodeURIComponent(q) +
      '&mode=ArtList&maxrecords=40&sort=DateDesc&format=json';
  }

  async function fetchNews(cityName, country) {
    var resp = await fetch(buildURL(cityName, country), { headers: { Accept: 'application/json' } });
    if (!resp.ok) return [];
    // GDELT answers a rate-limited or malformed query with an HTML/text
    // body and a 200, so this cannot assume JSON just because it is ok.
    var text = await resp.text();
    var data;
    try { data = JSON.parse(text); } catch (e) { return []; }
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
      articles = await fetchNews(cityName, country);
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

  window.GlotempNews = { loadNews: loadNews };
})();
