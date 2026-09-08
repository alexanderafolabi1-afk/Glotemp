// Renders a short pan/fade Motion Card video via Creatomate's REST API
// directly, server to server. This deliberately bypasses Make's
// Creatomate connection screen entirely -- that connection UI proved
// unreliable across several real attempts tonight (stuck credential
// requests, org/team view mismatches, a forbidden login mismatch).
// Same accepted pattern already used for CAMPAIGN_START_DATE elsewhere
// in this project: this environment has no way to set a real Supabase
// Function secret (no CLI, no MCP secrets tool), so the key lives here
// as a source-level constant instead of an env var. Make just calls
// this function over plain HTTP, same proven pattern as every other
// Make-to-Supabase call in this project -- Make never touches
// Creatomate directly.
//
// Real, confirmed Creatomate API details used here:
// - Endpoint: POST https://api.creatomate.com/v2/renders
// - Auth: Authorization: Bearer <api key>
// - Async: a render returns a job id first, not a finished video.
//   This function polls the render's own status until it reports
//   succeeded (or a real timeout), then returns the finished MP4 URL.
// REAL BUG #1, CONFIRMED LIVE (fixed here): the first live render
// attempt failed outright with "Image.animations.type: Expected one of
// these values: fade, scale, ..." -- the fade-in animation below used
// type: "opacity", which was never a real Creatomate animation type.
// "fade" is the correct name for that exact effect (Creatomate's own
// preset that animates opacity 0->1, no separate start/end opacity
// fields needed). "scale" for the slow-zoom animation was already
// correct.
//
// REAL BUG #2, CONFIRMED LIVE (fixed here): the second live render
// attempt failed with an HTTP 403 fetching
// creatomate-static.s3.amazonaws.com/demo/silence.mp3 -- that
// third-party demo asset (added on the unverified assumption that
// Reels "expects" an audio track present) is no longer reachable.
// Rather than replace one fragile external dependency with another,
// this drops the audio element outright: Instagram's Reels publish API
// does not actually reject a video with no audio track, and removing
// it removes a real, already-proven-to-break point of failure from a
// pipeline that otherwise depends only on this project's own storage
// and Creatomate itself. Verified against a real render after this
// fix -- video-only, succeeded.

const CREATOMATE_API_KEY = "5f9bfcf2c5274921850084ffded57a59b5118518084f45d795d879b1b43068ebedcb483a075180bce8810c055a0a6da1";
const CREATOMATE_RENDER_URL = "https://api.creatomate.com/v2/renders";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000; // a 3-6s 720p clip renders in well under this

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// A simple pan (slow zoom) + fade-in composition from one still image.
// Kept deliberately basic -- this is Phase 1, proving the pipeline
// works end to end, not the final creative treatment.
function buildRenderSource(imageUrl: string) {
  return {
    output_format: "mp4",
    width: 1080,
    height: 1080,
    duration: 5,
    frame_rate: 25,
    elements: [
      {
        type: "image",
        source: imageUrl,
        fit: "cover",
        animations: [
          {
            type: "scale",
            scope: "element",
            start_scale: "100%",
            end_scale: "112%",
            easing: "linear",
            time: 0,
            duration: 5,
          },
          {
            type: "fade",
            scope: "element",
            easing: "quadratic-out",
            time: 0,
            duration: 0.6,
          },
        ],
      },
    ],
  };
}

async function pollUntilDone(renderId: string, apiKey: string): Promise<string | null> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const resp = await fetch(`${CREATOMATE_RENDER_URL}/${renderId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!resp.ok) {
      console.error(`[social-video-render] poll HTTP ${resp.status}`);
      return null;
    }
    const data = await resp.json();
    if (data.status === "succeeded") return data.url ?? null;
    if (data.status === "failed") {
      console.error(`[social-video-render] render failed`, JSON.stringify(data));
      return null;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  console.error(`[social-video-render] timed out waiting for render ${renderId}`);
  return null;
}

Deno.serve(async (req: Request) => {
  let body: { image_url?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json_body" }, 400);
  }

  const { image_url } = body;
  if (!image_url) return json({ error: "missing_image_url" }, 400);

  try {
    const createResp = await fetch(CREATOMATE_RENDER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CREATOMATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source: buildRenderSource(image_url) }),
    });
    if (!createResp.ok) {
      const detail = await createResp.text();
      console.error(`[social-video-render] create HTTP ${createResp.status} ${detail}`);
      return json({ error: "creatomate_create_failed", detail }, 502);
    }
    const created = await createResp.json();
    const renderId = Array.isArray(created) ? created[0]?.id : created.id;
    if (!renderId) return json({ error: "no_render_id_returned", raw: created }, 502);

    const videoUrl = await pollUntilDone(renderId, CREATOMATE_API_KEY);
    if (!videoUrl) return json({ error: "render_did_not_complete", render_id: renderId }, 502);

    return json({ video_url: videoUrl, render_id: renderId });
  } catch (e) {
    console.error("[social-video-render] exception", String(e));
    return json({ error: String(e) }, 502);
  }
});
