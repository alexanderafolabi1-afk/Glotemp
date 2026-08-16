# Step 3 — Positive-only filter + moderation queue

## Files
- `supabase/migrations/20260816140000_positive_moderation_queue.sql` — columns, queue, RPCs
- `glotemp-moderation.js` — shared hard-block / auto-hide engine
- `glotemp-moderation-wire.js` — fetch adapter for observations POST/GET
- `admin/moderation.html` — PIN-gated review queue UI
- `cities/_city-template.html` — loads moderation scripts
- `glotemp-core.js` — injects moderation scripts on city pages

## Deploy
1. Run the migration on Supabase
2. Merge this PR
3. Optionally add RLS select policy for admins on `moderation_queue`
4. Change default PIN in `admin/moderation.html` before production use

## Behaviour
- Hard toxic language: blocked at write (422)
- Soft negative phrases: stored as `auto_hidden`, enqueued for review
- Public reads: `moderation_status in (visible, approved)`
- Flag RPC: `flag_observation(id, reason)`
- Resolve RPC: `resolve_moderation_item(queue_id, decision)`
