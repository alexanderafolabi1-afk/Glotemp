-- Seed Pulse story data from stories.js into readings table
-- Run this after supabase-verticals-schema.sql
-- Each story becomes a reading with mood score derived from narrative tone

INSERT INTO readings (city_slug, vertical, metric, value, label, source, source_url, confidence, fetched_at)
VALUES
  -- Kyiv: Resilient, brave spirit despite hardship → 7.5 (positive but grounded)
  ('kyiv', 'pulse', 'mood_story', 7.5, 'Kyiv''s Unbreakable Spirit', 'pulse_story', '/stories/kyiv-unbreakable', 1.0, '2025-01-15'::timestamp),

  -- Tokyo: Nostalgic, intimate, timeless → 7.8 (warm, contemplative)
  ('tokyo', 'pulse', 'mood_story', 7.8, 'Midnight Whispers in Golden Gai', 'pulse_story', '/stories/tokyo-golden-gai', 1.0, '2025-01-22'::timestamp),

  -- Mexico City: Joyful, celebratory, vibrant → 8.9 (energetic, festive)
  ('mexico-city', 'pulse', 'mood_story', 8.9, 'The Floating Gardens of Xochimilco', 'pulse_story', '/stories/mexico-city-xochimilco', 1.0, '2025-01-29'::timestamp),

  -- Lagos: Pulsing, energetic, rhythmic → 9.2 (highest energy)
  ('lagos', 'pulse', 'mood_story', 9.2, 'Afrobeats & Ocean Beats', 'pulse_story', '/stories/lagos-afrobeats', 1.0, '2025-02-05'::timestamp),

  -- Lisbon: Melancholic, romantic, introspective → 6.8 (wistful, beautiful sadness)
  ('lisbon', 'pulse', 'mood_story', 6.8, 'Fado, Tiles & Secret Miradouros', 'pulse_story', '/stories/lisbon-fado', 1.0, '2025-02-12'::timestamp),

  -- Dubai: Contrasting energies, layered → 7.2 (rich but complex)
  ('dubai', 'pulse', 'mood_story', 7.2, 'Beyond the Skyline: Old Souls & Souks', 'pulse_story', '/stories/dubai-old-souls', 1.0, '2025-02-19'::timestamp),

  -- Reykjavik: Imaginative, introspective, inspired → 7.5 (creative energy)
  ('reykjavik', 'pulse', 'mood_story', 7.5, 'Northern Lights & Bookworms', 'pulse_story', '/stories/reykjavik-books', 1.0, '2025-02-26'::timestamp),

  -- Cairo: Sensory overload, alive, ancient → 8.4 (intense, vibrant)
  ('cairo', 'pulse', 'mood_story', 8.4, 'Pyramids, Chaos & Street Feast', 'pulse_story', '/stories/cairo-street-feast', 1.0, '2025-03-05'::timestamp),

  -- Medellín: Transformation, hope, warmth → 8.7 (inspiring, redemptive)
  ('medellin', 'pulse', 'mood_story', 8.7, 'Spring Eternal & Urban Reinvention', 'pulse_story', '/stories/medellin-spring', 1.0, '2025-03-12'::timestamp),

  -- Bangkok: Welcoming, dynamic, sensory → 8.5 (energetic, open)
  ('bangkok', 'pulse', 'mood_story', 8.5, 'Temples, Tuk‑Tuks & Midnight Mango', 'pulse_story', '/stories/bangkok-midnight', 1.0, '2025-03-19'::timestamp)
ON CONFLICT DO NOTHING;

-- Verify insert
SELECT COUNT(*) as pulse_story_count FROM readings WHERE source = 'pulse_story';
