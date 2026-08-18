-- 9/300 cities failed wiki-attention's automatic title resolution
-- (name, then "name, country") because their display names don't map
-- cleanly to a Wikipedia article: parenthetical display names
-- ("Bali (Denpasar)", "Wadi Musa (Petra)", "Goa (Panaji)") and, for
-- nyc, a straight collision with Wikipedia's own disambiguation page
-- for the bare title "New York" (the real article is "New York City").
--
-- Each candidate below was verified against the real Wikipedia REST
-- summary endpoint and the real Pageviews API (non-zero data returned)
-- via wiki-attention's job=resolve_check diagnostic before being
-- written here -- see the PR description for the verification output.
--
-- city_points.wikipedia_title is both the cache AND the override: the
-- job reads it where present and only falls back to auto-derivation
-- where it is null (supabase/functions/wiki-attention/index.ts,
-- jobPageviews/jobRevisions). Writing the correct title here for these
-- 9 rows means the job will never attempt -- and never overwrite -- it
-- with its own guess again.
update city_points set wikipedia_title = v.title
from (values
  ('bali-denpasar', 'Denpasar'),
  ('banos', 'Baños de Agua Santa'),
  ('el-nido', 'El Nido, Palawan'),
  ('goa', 'Panaji'),
  ('hoi-an', 'Hội An (city)'),
  ('nyc', 'New York City'),
  ('sapa', 'Sa Pa'),
  ('takayama', 'Takayama, Gifu'),
  ('wadi-musa', 'Wadi Musa')
) as v(city_slug, title)
where city_points.city_slug = v.city_slug;
