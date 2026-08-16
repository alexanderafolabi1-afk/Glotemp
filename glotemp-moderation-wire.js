// Step 3 adapter: enhance existing glotemp-checkin moderation without rewriting the whole file.
// Load AFTER glotemp-moderation.js and glotemp-checkin.js.
(function () {
  if (!window.GlotempModeration) return;

  // Patch fetch for observations POST/GET to apply positive-only rules.
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const isObs = url.indexOf('/rest/v1/observations') !== -1;

      // Public reads: only visible + approved
      if (isObs && (!init || !init.method || init.method.toUpperCase() === 'GET')) {
        if (url.indexOf('moderation_status') === -1 && url.indexOf('?') !== -1) {
          const sep = url.indexOf('?') === -1 ? '?' : '&';
          input = url + sep + 'moderation_status=in.(visible,approved)';
        }
      }

      // Writes: evaluate note and set moderation_status / block hard content
      if (isObs && init && init.method && init.method.toUpperCase() === 'POST' && init.body) {
        let body;
        try { body = JSON.parse(init.body); } catch (_) { body = null; }
        if (body && typeof body.note === 'string') {
          const v = GlotempModeration.evaluate(body.note);
          if (v.action === 'block') {
            return new Response(JSON.stringify({ message: v.message, reason: v.reason }), {
              status: 422,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          if (v.action === 'auto_hide') {
            body.moderation_status = 'auto_hidden';
            body.moderation_reason = v.reason || 'negative_language';
            init = Object.assign({}, init, { body: JSON.stringify(body) });
            const resp = await originalFetch(input, init);
            // Best-effort queue
            try {
              const h = init.headers || {};
              originalFetch((typeof input === 'string' ? input : input.url).replace(/\/observations.*/, '/moderation_queue'), {
                method: 'POST',
                headers: h,
                body: JSON.stringify({
                  source: 'observation',
                  reason: v.reason || 'negative_language',
                  snippet: String(body.note).slice(0, 200),
                  status: 'pending',
                }),
              }).catch(function () {});
            } catch (_) {}
            return resp;
          }
          if (!body.moderation_status) {
            body.moderation_status = 'visible';
            init = Object.assign({}, init, { body: JSON.stringify(body) });
          }
        }
      }
    } catch (_) { /* never break the app */ }

    return originalFetch(input, init);
  };
})();
