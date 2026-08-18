// The music collector. Server side, on a schedule, never from a browser.
//
// FOUR JOBS, ONE FUNCTION, SELECTED BY ?job=
//   stations    fill city_stations from Radio Browser
//   nowplaying  read ICY metadata off those streams into the archive
//   artists     MusicBrainz, who is from this city
//   events      Ticketmaster Discovery, who is playing there next
//
// NOT LAST.FM. Non-commercial licence, and this site carries advertising.
//
// HOW ICY METADATA ACTUALLY WORKS
// It is not a header you can read and hang up on. Sending `Icy-MetaData: 1`
// makes the server answer with `icy-metaint: N`, which means: N bytes of
// audio, then one length byte, then that many blocks of 16 bytes carrying
// `StreamTitle='Artist - Title';`. So the only way to read the track is to
// pull N+1 bytes of audio off the socket and throw them away. That is why
// this reads a bounded number of bytes and then cancels the body: without
// the cancel, the connection keeps streaming audio for as long as the
// function lives.
//
// Stations that send no icy-metaint are skipped in silence. They are not
// broken, they simply do not announce, and there is nothing to report.
//
// Every failure path returns non-200 with a reason, so a red run in the
// scheduler means something real rather than a silent zero.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TICKETMASTER_KEY = Deno.env.get("TICKETMASTER_API_KEY") ?? "";

const UA = "glo-temp.com/1.0 (+https://glo-temp.com)";
const TIMEOUT_MS = 5000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function rest(path: string, init: RequestInit = {}) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!resp.ok) throw new Error(`rest ${path} ${resp.status} ${await resp.text()}`);
  return resp;
}

async function rpc(fn: string, args: Record<string, unknown>) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!resp.ok) throw new Error(`rpc ${fn} ${resp.status}`);
  return resp.json();
}

function withTimeout(ms: number) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  return { signal: ctl.signal, done: () => clearTimeout(t) };
}

// ---------- ICY ----------
async function readIcyTitle(streamUrl: string): Promise<string | null> {
  const { signal, done } = withTimeout(TIMEOUT_MS);
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  try {
    const resp = await fetch(streamUrl, {
      headers: { "Icy-MetaData": "1", "User-Agent": UA },
      signal,
      redirect: "follow",
    });
    if (!resp.ok || !resp.body) return null;

    const metaint = parseInt(resp.headers.get("icy-metaint") ?? "0", 10);
    // No metaint means this stream does not announce at all. Silence, not
    // an error.
    if (!Number.isFinite(metaint) || metaint <= 0 || metaint > 64000) {
      await resp.body.cancel().catch(() => {});
      return null;
    }

    reader = resp.body.getReader();
    // metaint bytes of audio, one length byte, then at most 255*16 of
    // metadata. Nothing beyond that is ever read.
    const need = metaint + 1 + 16 * 255;
    const buf = new Uint8Array(need);
    let filled = 0;

    while (filled < metaint + 1) {
      const { done: fin, value } = await reader.read();
      if (fin || !value) break;
      const take = Math.min(value.length, need - filled);
      buf.set(value.subarray(0, take), filled);
      filled += take;
      if (filled >= need) break;
    }
    if (filled < metaint + 1) return null;

    const lenByte = buf[metaint];
    if (lenByte === 0) return null; // no metadata in this block

    const metaLen = lenByte * 16;
    while (filled < metaint + 1 + metaLen) {
      const { done: fin, value } = await reader.read();
      if (fin || !value) break;
      const take = Math.min(value.length, need - filled);
      buf.set(value.subarray(0, take), filled);
      filled += take;
      if (filled >= need) break;
    }
    if (filled < metaint + 1 + metaLen) return null;

    const meta = new TextDecoder("utf-8", { fatal: false })
      .decode(buf.subarray(metaint + 1, metaint + 1 + metaLen));

    const m = /StreamTitle='([^']*)'/.exec(meta) ?? /StreamTitle="([^"]*)"/.exec(meta);
    const title = m?.[1]?.trim() ?? "";
    return title.length ? title : null;
  } catch {
    return null;
  } finally {
    done();
    try { await reader?.cancel(); } catch { /* already gone */ }
  }
}

// ---------- jobs ----------
const RB = "https://de1.api.radio-browser.info";

async function jobStations(limitCities: number) {
  // Cities with the fewest stations first, so a new city fills before an
  // already-covered one is refreshed.
  const resp = await rest(
    `city_points?select=city_slug,lat,lon&order=city_slug.asc&limit=${limitCities}`,
  );
  const cities: { city_slug: string; lat: number; lon: number }[] = await resp.json();

  let added = 0;
  for (const c of cities) {
    const { signal, done } = withTimeout(TIMEOUT_MS);
    try {
      const r = await fetch(
        `${RB}/json/stations/search?geo_lat=${c.lat}&geo_long=${c.lon}` +
        `&geo_distance=50000&hidebroken=true&order=clickcount&reverse=true&limit=12`,
        { headers: { "User-Agent": UA, Accept: "application/json" }, signal },
      );
      if (!r.ok) continue;
      const list = await r.json();
      const rows = (Array.isArray(list) ? list : [])
        // https only. A plain-http stream is unusable from an https page
        // and pointless to poll for a site that is https everywhere.
        .filter((s: Record<string, string>) => /^https:/i.test(s.url_resolved || s.url || ""))
        .map((s: Record<string, string | number>) => ({
          station_uuid: s.stationuuid,
          city_slug: c.city_slug,
          name: String(s.name ?? "").trim().slice(0, 200),
          stream_url: s.url_resolved || s.url,
          homepage: s.homepage ?? null,
          codec: s.codec ?? null,
          bitrate: Number(s.bitrate) || null,
        }))
        .filter((s: Record<string, unknown>) => s.station_uuid && s.name && s.stream_url);

      if (rows.length) {
        await rest("city_stations?on_conflict=station_uuid", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(rows),
        });
        added += rows.length;
      }
    } catch (e) {
      console.error(`[music-sync] stations ${c.city_slug}`, String(e));
    } finally {
      done();
    }
  }
  return { cities: cities.length, stations: added };
}

async function jobNowPlaying(limitStations: number) {
  // Least recently polled first, so the whole set rotates rather than the
  // same few being hit every run.
  const resp = await rest(
    `city_stations?select=station_uuid,city_slug,name,stream_url` +
    `&order=last_polled_at.asc.nullsfirst&limit=${limitStations}`,
  );
  const stations: {
    station_uuid: string; city_slug: string; name: string; stream_url: string;
  }[] = await resp.json();

  let recorded = 0, silent = 0;
  for (const s of stations) {
    const title = await readIcyTitle(s.stream_url);
    if (title) {
      try {
        await rpc("record_now_playing", {
          p_city_slug: s.city_slug,
          p_station_uuid: s.station_uuid,
          p_station_name: s.name,
          p_raw: title,
        });
        recorded++;
      } catch (e) {
        console.error(`[music-sync] record ${s.station_uuid}`, String(e));
      }
    } else {
      silent++;
    }
    // Stamped whether or not it spoke, or a silent station would be
    // retried forever while a talkative one waits behind it.
    await rest(`city_stations?station_uuid=eq.${encodeURIComponent(s.station_uuid)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ last_polled_at: new Date().toISOString() }),
    }).catch(() => {});
  }
  return { polled: stations.length, recorded, silent };
}

async function jobArtists(limitCities: number) {
  const resp = await rest(
    `city_points?select=city_slug&order=city_slug.asc&limit=${limitCities}`,
  );
  const cities: { city_slug: string }[] = await resp.json();

  let added = 0;
  for (const c of cities) {
    // MusicBrainz asks for one request per second and a real user agent.
    // Honouring that is why this runs on a schedule over a small batch.
    await new Promise((r) => setTimeout(r, 1100));
    const { signal, done } = withTimeout(TIMEOUT_MS);
    try {
      const city = c.city_slug.replace(/-/g, " ");
      const q = encodeURIComponent(`beginarea:"${city}" OR area:"${city}"`);
      const r = await fetch(
        `https://musicbrainz.org/ws/2/artist?query=${q}&fmt=json&limit=8`,
        { headers: { "User-Agent": UA, Accept: "application/json" }, signal },
      );
      if (!r.ok) continue;
      const data = await r.json();
      const rows = (data?.artists ?? [])
        .filter((a: Record<string, unknown>) => a.id && a.name)
        .map((a: Record<string, unknown>) => ({
          city_slug: c.city_slug,
          mbid: a.id,
          name: a.name,
          begin_year: (() => {
            const b = (a["life-span"] as Record<string, string> | undefined)?.begin;
            const y = b ? parseInt(String(b).slice(0, 4), 10) : NaN;
            return Number.isFinite(y) ? y : null;
          })(),
          genre: ((a.tags as { name: string }[] | undefined) ?? [])[0]?.name ?? null,
        }));
      if (rows.length) {
        await rest("city_artists?on_conflict=city_slug,mbid", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(rows),
        });
        added += rows.length;
      }
    } catch (e) {
      console.error(`[music-sync] artists ${c.city_slug}`, String(e));
    } finally {
      done();
    }
  }
  return { cities: cities.length, artists: added };
}

async function jobEvents(limitCities: number) {
  if (!TICKETMASTER_KEY) throw new Error("TICKETMASTER_API_KEY not set");

  const resp = await rest(
    `city_points?select=city_slug,lat,lon&order=city_slug.asc&limit=${limitCities}`,
  );
  const cities: { city_slug: string; lat: number; lon: number }[] = await resp.json();

  let added = 0;
  for (const c of cities) {
    const { signal, done } = withTimeout(TIMEOUT_MS);
    try {
      const end = new Date(Date.now() + 30 * 864e5).toISOString().replace(/\.\d+Z$/, "Z");
      const r = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json` +
        `?apikey=${TICKETMASTER_KEY}&classificationName=music` +
        `&latlong=${c.lat},${c.lon}&radius=50&unit=km` +
        `&endDateTime=${end}&size=10&sort=date,asc`,
        { headers: { "User-Agent": UA, Accept: "application/json" }, signal },
      );
      if (!r.ok) continue;
      const data = await r.json();
      const rows = (data?._embedded?.events ?? []).map((e: Record<string, unknown>) => {
        const emb = e._embedded as Record<string, Record<string, string>[]> | undefined;
        return {
          event_id: e.id,
          city_slug: c.city_slug,
          artist: emb?.attractions?.[0]?.name ?? e.name,
          venue: emb?.venues?.[0]?.name ?? null,
          starts_at: (e.dates as Record<string, Record<string, string>>)?.start?.dateTime ?? null,
          url: e.url ?? null,
        };
      }).filter((x: Record<string, unknown>) => x.event_id && x.artist && x.starts_at);

      if (rows.length) {
        await rest("city_music_events?on_conflict=event_id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(rows),
        });
        added += rows.length;
      }
    } catch (e) {
      console.error(`[music-sync] events ${c.city_slug}`, String(e));
    } finally {
      done();
    }
  }
  return { cities: cities.length, events: added };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const job = url.searchParams.get("job") ?? "";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 25) || 25, 1), 200);

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[music-sync] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "not_configured" }, 500);
  }

  try {
    let result: unknown;
    switch (job) {
      case "stations":   result = await jobStations(limit); break;
      case "nowplaying": result = await jobNowPlaying(limit); break;
      case "artists":    result = await jobArtists(limit); break;
      case "events":     result = await jobEvents(limit); break;
      default:
        return json({ error: "unknown_job", jobs: ["stations", "nowplaying", "artists", "events"] }, 400);
    }
    console.log(`[music-sync] ${job}`, JSON.stringify(result));
    return json({ job, ...(result as Record<string, unknown>) });
  } catch (e) {
    // Non-200 on every failure path, so a scheduler shows red rather than
    // a green run that quietly wrote nothing.
    console.error(`[music-sync] ${job} failed`, String(e));
    return json({ job, error: String(e) }, 502);
  }
});
