// Glotemp Sports: live fixtures, results, form and the F1 calendar for the
// Sport vertical. Two free, keyless, no-signup public APIs, both fetched
// directly from the browser so the content never goes stale between
// deploys:
//   - TheSportsDB (local clubs plus every city's national football/rugby/
//     cricket sides, resolved by name search -- no numeric team IDs are
//     hardcoded anywhere in this codebase)
//   - Jolpica-F1 (Ergast-compatible F1 calendar, ergast.com's maintained
//     successor)
// National-team coverage (city-sports-data.js) means every city gets real
// sport content, not just the ones with a hand-curated local club. Every
// request is wrapped so a network failure, CORS block, or empty result
// just leaves the section blank -- never a broken layout, never a
// fabricated score.
(function () {
  'use strict';

  var SPORTSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/123/';
  var F1_NEXT_URL = 'https://api.jolpi.ca/ergast/f1/current/next.json';
  var F1_CURRENT_URL = 'https://api.jolpi.ca/ergast/f1/current.json';

  var TEAM_ID_TTL = 24 * 60 * 60 * 1000;
  var FIXTURES_TTL = 30 * 60 * 1000;
  var F1_TTL = 6 * 60 * 60 * 1000;

  var SPORT_META = {
    football: { icon: '⚽', label: 'Football' },
    rugby: { icon: '🏉', label: 'Rugby' },
    cricket: { icon: '🏏', label: 'Cricket' },
  };

  // TheSportsDB's team search matches by name across every sport, so a
  // country name like "England" can return both the football and rugby
  // national sides. Filter the results down to the sport we actually asked
  // for rather than blindly taking the first hit.
  var SPORT_SEARCH_HINT = {
    football: 'soccer',
    rugby: 'rugby',
    cricket: 'cricket',
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function cacheGet(key, ttl) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return undefined;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.t !== 'number') return undefined;
      if (Date.now() - parsed.t > ttl) return undefined;
      return parsed.v;
    } catch (e) {
      return undefined;
    }
  }

  function cacheSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
    } catch (e) {
      // storage full or unavailable -- fine, just skip caching
    }
  }

  async function fetchJSON(url) {
    var resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) throw new Error('fetch failed ' + resp.status);
    return resp.json();
  }

  async function resolveTeamId(teamName, sportKey) {
    var cacheKey = 'gt-sports-id:' + sportKey + ':' + teamName;
    var cached = cacheGet(cacheKey, TEAM_ID_TTL);
    if (cached !== undefined) return cached;
    try {
      var data = await fetchJSON(SPORTSDB_BASE + 'searchteams.php?t=' + encodeURIComponent(teamName));
      var teams = (data && data.teams) || [];
      var hint = SPORT_SEARCH_HINT[sportKey];
      var team = (hint && teams.find(function (t) { return t.strSport && t.strSport.toLowerCase().indexOf(hint) !== -1; })) || teams[0];
      var result = team ? { id: team.idTeam, name: team.strTeam, badge: team.strTeamBadge || null } : null;
      cacheSet(cacheKey, result);
      return result;
    } catch (e) {
      return null;
    }
  }

  function formatEventDate(dateEvent, strTime) {
    if (!dateEvent) return '';
    try {
      var iso = dateEvent + (strTime ? 'T' + strTime : '');
      var d = new Date(iso);
      if (isNaN(d.getTime())) return dateEvent;
      return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d);
    } catch (e) {
      return dateEvent;
    }
  }

  function recapLine(ev) {
    var home = ev.strHomeTeam, away = ev.strAwayTeam;
    var hs = ev.intHomeScore, as = ev.intAwayScore;
    if (hs === null || hs === undefined || as === null || as === undefined) {
      return home + ' vs ' + away + (ev.strLeague ? ' · ' + ev.strLeague : '');
    }
    return home + ' ' + hs + '-' + as + ' ' + away + (ev.strLeague ? ' · ' + ev.strLeague : '');
  }

  function formLetter(ev, teamName) {
    var hs = Number(ev.intHomeScore), as = Number(ev.intAwayScore);
    if (isNaN(hs) || isNaN(as)) return null;
    var isHome = ev.strHomeTeam && ev.strHomeTeam.toLowerCase() === teamName.toLowerCase();
    var teamScore = isHome ? hs : as;
    var oppScore = isHome ? as : hs;
    if (teamScore > oppScore) return 'W';
    if (teamScore < oppScore) return 'L';
    return 'D';
  }

  async function loadTeamFixtures(sportKey, teamName) {
    var resolved = await resolveTeamId(teamName, sportKey);
    if (!resolved || !resolved.id) return null;

    var nextKey = 'gt-sports-next:' + resolved.id;
    var lastKey = 'gt-sports-last:' + resolved.id;
    var next = cacheGet(nextKey, FIXTURES_TTL);
    var last = cacheGet(lastKey, FIXTURES_TTL);

    var jobs = [];
    if (next === undefined) {
      jobs.push(
        fetchJSON(SPORTSDB_BASE + 'eventsnext.php?id=' + resolved.id)
          .then(function (d) { next = (d && d.events) || []; cacheSet(nextKey, next); })
          .catch(function () { next = []; })
      );
    }
    if (last === undefined) {
      jobs.push(
        fetchJSON(SPORTSDB_BASE + 'eventslast.php?id=' + resolved.id)
          .then(function (d) { last = (d && (d.results || d.events)) || []; cacheSet(lastKey, last); })
          .catch(function () { last = []; })
      );
    }
    await Promise.all(jobs);

    var form = (last || [])
      .slice(0, 5)
      .map(function (ev) { return formLetter(ev, resolved.name); })
      .filter(Boolean);

    return {
      sportKey: sportKey,
      teamName: resolved.name,
      next: (next && next[0]) || null,
      last: (last && last[0]) || null,
      form: form,
    };
  }

  async function loadF1() {
    var cached = cacheGet('gt-sports-f1', F1_TTL);
    if (cached !== undefined) return cached;
    try {
      var data = await fetchJSON(F1_NEXT_URL);
      var races = data && data.MRData && data.MRData.RaceTable && data.MRData.RaceTable.Races;
      var race = races && races[0];
      if (!race) {
        // Season's races have all passed -- try the full current-season
        // list and take the last one so there's still something honest to
        // show instead of silently going blank.
        var fallback = await fetchJSON(F1_CURRENT_URL);
        var all = fallback && fallback.MRData && fallback.MRData.RaceTable && fallback.MRData.RaceTable.Races;
        race = all && all[all.length - 1];
      }
      var result = race ? {
        name: race.raceName,
        circuit: race.Circuit && race.Circuit.circuitName,
        locality: race.Circuit && race.Circuit.Location && race.Circuit.Location.locality,
        country: race.Circuit && race.Circuit.Location && race.Circuit.Location.country,
        date: race.date,
      } : null;
      cacheSet('gt-sports-f1', result);
      return result;
    } catch (e) {
      return null;
    }
  }

  function cityMatchesLocality(cityName, locality) {
    if (!cityName || !locality) return false;
    var a = cityName.toLowerCase();
    var b = locality.toLowerCase();
    return a === b || a.indexOf(b) !== -1 || b.indexOf(a) !== -1;
  }

  function fixtureBlockHTML(sportKey, fixture, isNational) {
    var meta = SPORT_META[sportKey] || { icon: '🏆', label: sportKey };
    var who = fixture.teamName + (isNational ? ' national team' : '');
    var parts = [];
    parts.push('<div class="sport-live-item">');
    parts.push('<p class="sport-live-heading">' + meta.icon + ' <span>' + esc(meta.label) + ' &middot; ' + esc(who) + '</span></p>');
    if (fixture.form.length) {
      parts.push('<p class="sport-form">' + fixture.form.map(function (f) {
        var cls = f === 'W' ? 'sport-form-w' : f === 'L' ? 'sport-form-l' : 'sport-form-d';
        return '<span class="' + cls + '">' + f + '</span>';
      }).join('') + '</p>');
    }
    if (fixture.next) {
      parts.push('<p class="sport-live-line"><span class="sport-live-tag">Next</span>' + esc(recapLine(fixture.next)) + ' <span class="sport-live-date">' + esc(formatEventDate(fixture.next.dateEvent, fixture.next.strTime)) + '</span></p>');
    }
    if (fixture.last) {
      parts.push('<p class="sport-live-line"><span class="sport-live-tag">Last</span>' + esc(recapLine(fixture.last)) + ' <span class="sport-live-date">' + esc(formatEventDate(fixture.last.dateEvent, fixture.last.strTime)) + '</span></p>');
    }
    parts.push('</div>');
    return parts.join('');
  }

  function f1BlockHTML(f1, hosted) {
    var dateStr = formatEventDate(f1.date, null);
    return '<div class="sport-live-item">' +
      '<p class="sport-live-heading">🏎️ <span>Formula 1' + (hosted ? ' &middot; racing in ' + esc(f1.locality) : '') + '</span></p>' +
      '<p class="sport-live-line"><span class="sport-live-tag">' + (hosted ? 'Here' : 'Next') + '</span>' + esc(f1.name) + (f1.circuit ? ' &middot; ' + esc(f1.circuit) : '') + ' <span class="sport-live-date">' + esc(dateStr) + '</span></p>' +
      '</div>';
  }

  function nationalTeamsForCity(citySlug, country) {
    // Every city gets its country's national football team -- the one
    // sport genuinely followed almost everywhere. Rugby and cricket are
    // added only for countries where the sport is actually major, so a
    // city in a country with no meaningful national side doesn't get a
    // hollow entry.
    var out = [];
    var football = (typeof CITY_NATIONAL_FOOTBALL_OVERRIDE !== 'undefined' && CITY_NATIONAL_FOOTBALL_OVERRIDE[citySlug])
      || (typeof COUNTRY_NATIONAL_FOOTBALL !== 'undefined' && COUNTRY_NATIONAL_FOOTBALL[country]);
    if (football) out.push({ sportKey: 'football', teamName: football });

    var rugby = (typeof CITY_NATIONAL_RUGBY_OVERRIDE !== 'undefined' && CITY_NATIONAL_RUGBY_OVERRIDE[citySlug])
      || (typeof COUNTRY_NATIONAL_RUGBY !== 'undefined' && COUNTRY_NATIONAL_RUGBY[country]);
    if (rugby) out.push({ sportKey: 'rugby', teamName: rugby });

    var cricket = typeof COUNTRY_NATIONAL_CRICKET !== 'undefined' && COUNTRY_NATIONAL_CRICKET[country];
    if (cricket) out.push({ sportKey: 'cricket', teamName: cricket });

    return out;
  }

  async function mount(container) {
    var citySlug = container.getAttribute('data-city');
    var cityName = container.getAttribute('data-city-name') || '';
    var country = container.getAttribute('data-country') || '';
    var config = (typeof CITY_SPORTS !== 'undefined' && CITY_SPORTS[citySlug]) || {};

    var wanted = [];
    Object.keys(config).forEach(function (sportKey) {
      (config[sportKey] || []).forEach(function (teamName) { wanted.push({ sportKey: sportKey, teamName: teamName, isNational: false }); });
    });
    nationalTeamsForCity(citySlug, country).forEach(function (entry) {
      // Skip a national side if a local club of the same name is already
      // queued (rare, but avoids a duplicate block).
      var dupe = wanted.some(function (w) { return w.sportKey === entry.sportKey && w.teamName.toLowerCase() === entry.teamName.toLowerCase(); });
      if (!dupe) wanted.push({ sportKey: entry.sportKey, teamName: entry.teamName, isNational: true });
    });

    var blocks = [];
    var seen = {};

    var teamJobs = wanted.map(function (w) {
      return loadTeamFixtures(w.sportKey, w.teamName).then(function (fixture) {
        if (!fixture || (!fixture.next && !fixture.last)) return;
        var dedupeKey = w.sportKey + ':' + fixture.teamName.toLowerCase();
        if (seen[dedupeKey]) return;
        seen[dedupeKey] = true;
        blocks.push({ order: w.isNational ? 2 : 1, html: fixtureBlockHTML(w.sportKey, fixture, w.isNational) });
      }).catch(function () {});
    });

    var f1Job = loadF1().then(function (f1) {
      if (!f1) return;
      var hosted = cityMatchesLocality(cityName, f1.locality);
      blocks.push({ order: hosted ? 0 : 3, html: f1BlockHTML(f1, hosted) });
    }).catch(function () {});

    await Promise.all(teamJobs.concat([f1Job]));

    if (!blocks.length) return;
    blocks.sort(function (a, b) { return a.order - b.order; });
    container.innerHTML = '<p class="listings-eyebrow">Live sport</p><div class="sport-live-grid">' +
      blocks.map(function (b) { return b.html; }).join('') +
      '</div>';
  }

  function mountAll() {
    var containers = document.querySelectorAll('.sport-live');
    for (var i = 0; i < containers.length; i++) mount(containers[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll);
  } else {
    mountAll();
  }

  window.GlotempSports = { mountAll: mountAll };
})();
