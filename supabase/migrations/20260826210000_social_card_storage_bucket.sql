-- Public bucket for finished social-share card PNGs. See
-- supabase/functions/social-next-post/index.ts (renderAndUploadCard).
--
-- REAL BUG, CONFIRMED LIVE: image_url previously pointed at the
-- social-card function's own invocation URL. Supabase's gateway requires
-- an Authorization header before any edge function handler runs at all.
-- Instagram's servers fetch image_url directly with zero custom headers
-- -- they will never send one -- so every real attempt got back
-- UNAUTHORIZED_NO_AUTH_HEADER (a JSON error body) instead of image
-- bytes, which is exactly why Instagram rejected every post as "not
-- photo or video media" and the automation was deactivated.
--
-- A bucket with public = true is served through Storage's
-- /storage/v1/object/public/<bucket>/<path> path, which Supabase's
-- gateway does not gate behind auth at all -- that is the one URL shape
-- a headerless fetch can actually succeed against. Only the service role
-- key (which bypasses RLS entirely) can write into this bucket: no INSERT
-- policy is granted to anon or authenticated below, so nothing but the
-- social-next-post function itself can ever write here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social-cards', 'social-cards', true, 5242880, array['image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
