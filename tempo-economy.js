// ===== TEMPO ECONOMY PLATFORM =====
// Supabase integration, comments, reporters, and monetization

const SUPABASE_URL = 'https://hnysztednzqfzbmiqqgl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AV3IDw0gfEnwf4ZSTYQPRQ_tzDogHi_';

// Supabase client
const supabaseClient = {
  async request(method, path, body = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${SUPABASE_URL}/rest/v1${path}`, options);
    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }
    return response.json();
  }
};

// ===== USER MANAGEMENT =====
function getUserId() {
  let userId = localStorage.getItem('glotemp-user-id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('glotemp-user-id', userId);
  }
  return userId;
}

// ===== SENTIMENT ANALYSIS =====
const POSITIVE_KEYWORDS = ['great', 'amazing', 'wonderful', 'excellent', 'love', 'fantastic', 'awesome', 'beautiful', 'perfect', 'incredible', 'best', 'brilliant'];
const NEGATIVE_KEYWORDS = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'disappointing', 'worst', 'disgusting', 'poor', 'pathetic', 'disgusted', 'angry'];

function analyzeSentiment(text) {
  const lower = text.toLowerCase();
  let score = 5; // neutral baseline

  POSITIVE_KEYWORDS.forEach(word => {
    if (lower.includes(word)) score += 1;
  });

  NEGATIVE_KEYWORDS.forEach(word => {
    if (lower.includes(word)) score -= 1;
  });

  return Math.max(0, Math.min(10, score));
}

// ===== COMMENTS API =====
async function submitComment(citySlug, text, moodEmoji) {
  const userId = getUserId();

  try {
    // Insert comment
    const comment = await supabaseClient.request('POST', '/city_comments', {
      city_slug: citySlug,
      text,
      mood_emoji: moodEmoji,
      user_id: userId,
      stars_awarded: 0
    });

    // Award 10 stars to reporter
    await awardStars(userId, 10);

    return comment;
  } catch (error) {
    console.error('Comment submission error:', error);
    throw error;
  }
}

async function getComments(citySlug) {
  try {
    const comments = await supabaseClient.request(
      'GET',
      `/city_comments?city_slug=eq.${encodeURIComponent(citySlug)}&order=created_at.desc`
    );
    return comments || [];
  } catch (error) {
    console.error('Fetch comments error:', error);
    return [];
  }
}

async function getCitySentiment(citySlug) {
  try {
    const comments = await getComments(citySlug);
    if (comments.length === 0) return 5;

    let totalScore = 0;
    const moodMap = { '🔥': 9, '😊': 7, '😐': 5, '😞': 3, '😡': 1 };

    comments.forEach(comment => {
      totalScore += moodMap[comment.mood_emoji] || 5;
    });

    return Math.round((totalScore / comments.length) * 10) / 10;
  } catch (error) {
    console.error('Sentiment calculation error:', error);
    return 5;
  }
}

// ===== REPORTERS & STARS =====
async function awardStars(userId, amount) {
  try {
    // Upsert reporter record
    const reporters = await supabaseClient.request(
      'GET',
      `/reporters?user_id=eq.${encodeURIComponent(userId)}`
    );

    if (reporters.length === 0) {
      // Insert new reporter
      await supabaseClient.request('POST', '/reporters', {
        user_id: userId,
        total_stars: amount,
        current_rank: getRank(amount)
      });
    } else {
      // Update existing reporter
      const newTotal = reporters[0].total_stars + amount;
      await supabaseClient.request(
        'PATCH',
        `/reporters?user_id=eq.${encodeURIComponent(userId)}`,
        {
          total_stars: newTotal,
          current_rank: getRank(newTotal),
          updated_at: new Date().toISOString()
        }
      );
    }

    // Update local stars display
    updateLocalStars();
  } catch (error) {
    console.error('Award stars error:', error);
  }
}

function getRank(stars) {
  if (stars < 50) return 'Contributor';
  if (stars < 200) return 'Reporter';
  if (stars < 500) return 'Correspondent';
  if (stars < 1000) return 'Luminary';
  return 'Ambassador';
}

async function getUserStars() {
  const userId = getUserId();
  try {
    const reporters = await supabaseClient.request(
      'GET',
      `/reporters?user_id=eq.${encodeURIComponent(userId)}`
    );
    if (reporters.length > 0) {
      return { stars: reporters[0].total_stars, rank: reporters[0].current_rank };
    }
    return { stars: 0, rank: 'Contributor' };
  } catch (error) {
    console.error('Fetch user stars error:', error);
    return { stars: 0, rank: 'Contributor' };
  }
}

async function getTopReporters() {
  try {
    const topReporters = await supabaseClient.request(
      'GET',
      '/reporters?order=total_stars.desc&limit=5'
    );
    return topReporters || [];
  } catch (error) {
    console.error('Fetch top reporters error:', error);
    return [];
  }
}

function updateLocalStars() {
  // This will be called to update UI stars display
  // The main app will handle the actual DOM updates
}

// ===== ADMIN FUNCTIONS =====
async function getAdminStats() {
  try {
    const comments = await supabaseClient.request('GET', '/city_comments');
    const reporters = await supabaseClient.request('GET', '/reporters');

    const totalComments = comments.length;
    const totalStars = reporters.reduce((sum, r) => sum + r.total_stars, 0);

    return { totalComments, totalStars, reporters };
  } catch (error) {
    console.error('Admin stats error:', error);
    return { totalComments: 0, totalStars: 0, reporters: [] };
  }
}

async function getRecentComments(limit = 10) {
  try {
    const comments = await supabaseClient.request(
      'GET',
      `/city_comments?order=created_at.desc&limit=${limit}`
    );
    return comments || [];
  } catch (error) {
    console.error('Fetch recent comments error:', error);
    return [];
  }
}
