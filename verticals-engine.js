// Glotemp Verticals Engine
// Fetches, caches, and renders multi-vertical data from Supabase
// Per-source TTL caching to avoid redundant API calls

// var, not const: this file and tempo-economy.js both define these same
// two globals, and pages increasingly load both. var redeclaration across
// classic <script> tags is a legal no-op; const/let redeclaration throws
// and silently kills whichever script runs second.
var SUPABASE_URL = SUPABASE_URL || 'https://hnysztednzqfzbmiqqgl.supabase.co';
var SUPABASE_ANON_KEY = SUPABASE_ANON_KEY || 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

// Cache configuration: source → TTL in milliseconds
const CACHE_TTL = {
  'pulse_story': 86400000, // 24 hours
  'pulse_sentiment': 3600000, // 1 hour
  'github_activity': 3600000, // 1 hour
  'world_bank': 2592000000, // 30 days
  'fx_rates': 3600000, // 1 hour
};

class VerticalsEngine {
  constructor() {
    this.cache = new Map();
  }

  // Generate cache key
  cacheKey(vertical, city, metric) {
    return `${vertical}:${city}:${metric}`;
  }

  // Check if cached value is still valid
  isCacheValid(timestamp, source) {
    const ttl = CACHE_TTL[source] || 3600000; // Default 1 hour
    return Date.now() - timestamp < ttl;
  }

  // Fetch readings for a city×vertical from Supabase
  async fetchVerticalData(citySlug, vertical) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/readings?city_slug=eq.${citySlug}&vertical=eq.${vertical}&order=fetched_at.desc&limit=100`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        console.warn(`Failed to fetch ${vertical} data for ${citySlug}`);
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${vertical} data:`, error);
      return [];
    }
  }

  // Render a reading as HTML with source attribution
  renderReading(reading) {
    const timeAgo = this.getTimeAgo(new Date(reading.fetched_at));
    const confidenceLabel = this.getConfidenceLabel(reading.confidence);

    return `
      <div class="reading glass-card">
        <div class="reading-header">
          <span class="reading-metric">${reading.metric}</span>
          <span class="reading-confidence" title="Data confidence: ${(reading.confidence * 100).toFixed(0)}%">
            ${confidenceLabel}
          </span>
        </div>
        <div class="reading-value">
          ${reading.value !== null ? `<span class="value">${reading.value}${reading.label ? ` ${reading.label}` : ''}</span>` : ''}
          <span class="reading-label">${reading.label || ''}</span>
        </div>
        <div class="reading-footer">
          <span class="reading-source">${reading.source}</span>
          <time class="reading-time" datetime="${reading.fetched_at}">${timeAgo}</time>
        </div>
      </div>
    `;
  }

  // Helper: format time ago
  getTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date) / 1000);
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [name, secondsInInterval] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInInterval);
      if (interval >= 1) {
        return `${interval} ${name}${interval > 1 ? 's' : ''} ago`;
      }
    }
    return 'just now';
  }

  // Helper: confidence label
  getConfidenceLabel(confidence) {
    if (confidence >= 0.8) return '✓ High confidence';
    if (confidence >= 0.5) return '◐ Moderate confidence';
    return '○ Low confidence';
  }

}

const verticals = new VerticalsEngine();
