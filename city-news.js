// Glotemp local press: what a city's own outlets are reporting, right now.
//
// WHY THIS EXISTS
// People who have moved keep a city. What they lose is not statistics,
// it is the ordinary running commentary of the place. A real headline
// from a real outlet is closer to that than anything Glotemp could write
// itself.
//
// WHY THIS IS A COMPLETE REBUILD, NOT A PATCH
// The previous version called an edge function directly from the
// browser on every page load, and that edge function called GDELT live,
// in the same request. Neither side had a timeout the user could see the
// end of: a slow GDELT response (or GDELT rate-limiting the shared
// Supabase egress IP, which it does) meant the section sat on "Reading
// the local press..." forever, on every city, because nothing ever told
// it to stop waiting.
//
// GDELT is now only ever called server-side, on a schedule, by
// supabase/functions/city-news -- see that file for the fetch itself and
// why it paces and retries the way it does. This file does one thing:
// read whatever that job last stored in the city_news table, with a
// timeout of its own, and render up to five items. If nothing is stored
// -- job hasn't reached this city yet, or it genuinely had nothing in
// the last 48 hours -- the section does not render. No spinner is ever
// left on screen past that timeout, and there is no permanent "nothing
// filed" message either: a quiet city today does not need to announce
// its quietness.
(function () {
  'use strict';

  var SHOW = 5;
  var FETCH_TIMEOUT_MS = 5000;
  // Nothing older than this is shown, ever. The store is kept inside the
  // same window by the refresh job and an hourly purge, but this filter
  // is applied here too and independently: if both of those stall, the
  // section goes quiet rather than showing a three-day-old headline that
  // a reader has no way to tell from a fresh one.
  var MAX_AGE_HOURS = 72;

  var SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function ago(iso) {
    if (!iso) return '';
    var then = Date.parse(iso);
    if (isNaN(then)) return '';
    var mins = Math.floor((Date.now() - then) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var h = Math.floor(mins / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }

  // Reads straight off the table the scheduled job fills -- never a live
  // call to GDELT, never a call that can itself take more than
  // FETCH_TIMEOUT_MS to settle one way or the other.
  async function fetchNews(citySlug, limit) {
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, FETCH_TIMEOUT_MS);
    try {
      // Freshness is coalesce(published_at, fetched_at), not published_at
      // alone. GDELT's ArtList carries no publication date at all, so
      // published_at is null on every row it produces -- filtering on it
      // would hide the entire section. fetched_at (set by the database
      // default when the row was stored) is the fallback, and the same
      // expression orders the list.
      //
      // PostgREST cannot filter on an expression, so the window is
      // applied as "published_at is inside it OR (published_at is null
      // AND fetched_at is inside it)", which is coalesce written out.
      // fresh() below re-applies exactly the same rule to the rows that
      // come back, so a query change can never silently widen it.
      var since = new Date(Date.now() - MAX_AGE_HOURS * 3600000).toISOString();
      var window = 'or=(published_at.gte.' + since +
        ',and(published_at.is.null,fetched_at.gte.' + since + '))';
      var qs = '?city_slug=eq.' + encodeURIComponent(citySlug) +
        '&select=title,url,domain,published_at,fetched_at,scope' +
        '&' + window +
        '&order=published_at.desc.nullslast&order=fetched_at.desc.nullslast' +
        '&limit=' + encodeURIComponent(limit || SHOW);
      var resp = await fetch(SUPABASE_URL + '/rest/v1/city_news' + qs, {
        signal: ctl.signal,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
          Accept: 'application/json',
        },
      });
      if (!resp.ok) {
        console.error('city-news: read failed, HTTP ' + resp.status);
        return [];
      }
      var rows = await resp.json();
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.error('city-news: read failed: ' + (e && e.message ? e.message : e));
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  // Defence in depth against showing the same story twice -- the storing
  // job already dedupes by outlet and headline, this just protects the
  // render if that ever changes.
  function distinct(rows, limit) {
    var seenUrl = {};
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r || !r.title || !r.url || seenUrl[r.url]) continue;
      seenUrl[r.url] = true;
      out.push(r);
      if (out.length >= limit) break;
    }
    return out;
  }

  // The publication date, written out. "3h ago" alone tells a reader how
  // long ago something was filed but never what day it was, and this
  // section's whole credibility rests on a reader being able to see that
  // for themselves. Both are shown: the relative time reads faster, the
  // date is the one that can be checked.
  function pubDate(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) return '';
    var d = new Date(t);
    try {
      return d.toLocaleDateString(document.documentElement.lang || 'en', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  }

  // Second enforcement of the same horizon, on rows already returned.
  // The query above filters too; this catches a row whose date is in the
  // future (a mis-parsed seendate) and anything a changed query might
  // one day let through.
  // coalesce(published_at, fetched_at) -- the one definition of "when",
  // used for filtering, sorting and display, so those three can never
  // disagree about the same row.
  function whenOf(r) {
    if (!r) return NaN;
    var p = Date.parse(r.published_at);
    if (!isNaN(p)) return p;
    return Date.parse(r.fetched_at);
  }

  function fresh(rows) {
    var floor = Date.now() - MAX_AGE_HOURS * 3600000;
    var ceiling = Date.now() + 3600000;   // an hour of clock skew
    return (rows || []).filter(function (r) {
      var t = whenOf(r);
      return !isNaN(t) && t >= floor && t <= ceiling;
    }).sort(function (a, b) { return whenOf(b) - whenOf(a); });
  }

  function itemHTML(a) {
    var iso = !isNaN(Date.parse(a.published_at)) ? a.published_at : a.fetched_at;
    // Labelled honestly. GDELT gives no publication date, so for those
    // rows this is when Glotemp picked the story up -- saying "published"
    // over a crawl timestamp is exactly the claim that made freshness
    // unverifiable in the first place.
    var isPublished = !isNaN(Date.parse(a.published_at));
    var when = ago(iso);
    var date = pubDate(iso);
    return '<li class="news-item">' +
      '<a class="news-title" href="' + esc(a.url) + '" target="_blank" rel="noopener">' +
        esc(a.title) +
      '</a>' +
      '<p class="news-meta">' +
        '<span class="news-source">' + esc(a.domain || '') + '</span>' +
        (a.scope === 'global'
          ? '<span class="news-scope">Wider</span>' : '') +
        (date ? '<time class="news-date" datetime="' + esc(iso) + '" title="' +
          (isPublished ? 'Published' : 'Picked up by Glotemp') + '">' +
          (isPublished ? '' : 'Filed ') + esc(date) + '</time>' : '') +
        (when ? '<span class="news-when">' + esc(when) + '</span>' : '') +
      '</p>' +
    '</li>';
  }

  // The whole <section> -- not just the inner list -- is what gets
  // hidden when there is nothing to show, so an empty city leaves no gap
  // in the page and no stray heading sitting above nothing. The
  // news-hidden class (rather than only the inline style) lets the
  // homepage's two-column "Somewhere else is awake" grid give the
  // remaining column its full width instead of leaving a bare gap where
  // this strand would have been -- see .elsewhere-strands in styles.css.
  function hideSection(container) {
    var section = container.closest ? container.closest('section') : null;
    if (section) {
      section.style.display = 'none';
      section.classList.add('news-hidden');
    }
    container.innerHTML = '';
  }

  function showSection(container) {
    var section = container.closest ? container.closest('section') : null;
    if (section) {
      section.style.display = '';
      section.classList.remove('news-hidden');
    }
  }

  // targetId lets the same module serve the city page and the homepage
  // window without either one owning the other's markup.
  async function loadNews(citySlug, targetId) {
    var container = document.getElementById(targetId || 'news-content');
    if (!container || !citySlug) return 0;

    showSection(container);
    container.innerHTML = '<p class="news-status">Reading the local press&hellip;</p>';

    var rows = fresh(await fetchNews(citySlug, SHOW));
    var items = distinct(rows, SHOW);

    if (!items.length) {
      hideSection(container);
      return 0;
    }

    container.innerHTML = '<ul class="news-list">' + items.map(itemHTML).join('') + '</ul>';
    return items.length;
  }

  // Data only, no DOM -- glotemp-home-frequency.js wants a single headline
  // folded into its own card rather than the full <ul> loadNews renders.
  async function fetchHeadlines(citySlug, limit) {
    if (!citySlug) return [];
    var rows = fresh(await fetchNews(citySlug, limit || 1));
    return distinct(rows, limit || 1);
  }

  window.GlotempNews = { loadNews: loadNews, fetchHeadlines: fetchHeadlines, itemHTML: itemHTML };
})();
