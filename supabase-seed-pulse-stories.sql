-- Seed Pulse story data from stories.js into readings table
-- Run this after supabase-verticals-schema.sql
-- Each story becomes a reading with mood score derived from narrative tone
-- NOTE: Using city slugs from cities-data.js (30 available cities)

INSERT INTO readings (city_slug, vertical, metric, value, label, source, source_url, confidence, fetched_at)
VALUES
  -- Tokyo: Nostalgic, intimate, timeless → 7.8 (warm, contemplative)
  ('tokyo', 'pulse', 'mood_story', 7.8, 'Midnight Whispers in Golden Gai', 'pulse_story', '/stories/tokyo-golden-gai', 1.0, '2025-01-22'::timestamp),

  -- Mexico City: Joyful, celebratory, vibrant → 8.9 (energetic, festive)
  ('mexico-city', 'pulse', 'mood_story', 8.9, 'The Floating Gardens of Xochimilco', 'pulse_story', '/stories/mexico-city-xochimilco', 1.0, '2025-01-29'::timestamp),

  -- Lagos: Pulsing, energetic, rhythmic → 9.2 (highest energy)
  ('lagos', 'pulse', 'mood_story', 9.2, 'Afrobeats & Ocean Beats', 'pulse_story', '/stories/lagos-afrobeats', 1.0, '2025-02-05'::timestamp),

  -- Paris: Elegant, romantic, timeless → 7.5 (sophisticated, inspiring)
  ('paris', 'pulse', 'mood_story', 7.5, 'Northern Lights & Bookworms', 'pulse_story', '/stories/paris-lights', 1.0, '2025-02-12'::timestamp),

  -- Dubai: Contrasting energies, layered → 7.2 (rich but complex)
  ('dubai', 'pulse', 'mood_story', 7.2, 'Beyond the Skyline: Old Souls & Souks', 'pulse_story', '/stories/dubai-old-souls', 1.0, '2025-02-19'::timestamp),

  -- Istanbul: Bridging continents, historic → 7.3 (contemplative, connected)
  ('istanbul', 'pulse', 'mood_story', 7.3, 'East Meets West on the Bosphorus', 'pulse_story', '/stories/istanbul-bosphorus', 1.0, '2025-02-26'::timestamp),

  -- Cairo: Sensory overload, alive, ancient → 8.4 (intense, vibrant)
  ('cairo', 'pulse', 'mood_story', 8.4, 'Pyramids, Chaos & Street Feast', 'pulse_story', '/stories/cairo-street-feast', 1.0, '2025-03-05'::timestamp),

  -- Medellín: Transformation, hope, warmth → 8.7 (inspiring, redemptive)
  ('medellin', 'pulse', 'mood_story', 8.7, 'Spring Eternal & Urban Reinvention', 'pulse_story', '/stories/medellin-spring', 1.0, '2025-03-12'::timestamp),

  -- Bangkok: Welcoming, dynamic, sensory → 8.5 (energetic, open)
  ('bangkok', 'pulse', 'mood_story', 8.5, 'Temples, Tuk‑Tuks & Midnight Mango', 'pulse_story', '/stories/bangkok-midnight', 1.0, '2025-03-19'::timestamp),

  -- São Paulo: Vibrant, resilient, creative → 7.6 (energetic, community-focused)
  ('sao-paulo', 'pulse', 'mood_story', 7.6, 'Street Art & Urban Rhythm', 'pulse_story', '/stories/sao-paulo-streets', 1.0, '2025-03-26'::timestamp)
ON CONFLICT DO NOTHING;

-- Verify insert
SELECT COUNT(*) as pulse_story_count FROM readings WHERE source = 'pulse_story';
