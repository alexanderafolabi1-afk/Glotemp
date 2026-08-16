// Glotemp positive-only moderation engine (Step 3).
// Shared by city check-ins, daily check-ins, and any future text surfaces.
// Hard-block: reject at submit. Soft: auto-hide + queue for review.
(function () {
  const HARD = [
    'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded', 'chink', 'spic',
    'kike', 'gook', 'tranny', 'coon', 'beaner', 'wetback', 'towelhead',
    'kill yourself', 'kys', 'rape you', 'i will kill', 'going to kill',
    'i will find you', "i'll find you", 'you should die', 'hope you die',
  ];

  const PROFANITY = [
    'fuck', 'fucking', 'fucker', 'motherfucker', 'shit', 'bullshit', 'bitch',
    'asshole', 'cunt', 'bastard', 'dick', 'pussy', 'cock', 'wanker', 'slut', 'whore',
  ];

  const NEGATIVE = [
    'everything sucks', 'this city is dead', 'hate this place', 'worst day ever',
    'i hate this', 'want to die', 'kill myself', 'nothing matters', 'life is pointless',
    'this place is trash', 'absolute dump', 'horrible city', 'disgusting city',
    'never come here', 'total waste', 'completely ruined',
  ];

  function containsWord(lowerText, word) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('\\b' + escaped + '\\b', 'i').test(lowerText);
  }

  function evaluate(text) {
    if (!text || !String(text).trim()) {
      return { ok: true, action: 'allow' };
    }
    const lower = String(text).toLowerCase();

    for (const p of HARD) {
      if (lower.indexOf(p) !== -1 || containsWord(lower, p)) {
        return {
          ok: false,
          action: 'block',
          reason: 'hard_block',
          message: "That can't be posted. Please keep contributions constructive and free of harm.",
        };
      }
    }

    for (const w of PROFANITY) {
      if (containsWord(lower, w)) {
        return {
          ok: false,
          action: 'block',
          reason: 'profanity',
          message: "That can't be posted. Please remove the strong language and try again.",
        };
      }
    }

    for (const p of NEGATIVE) {
      if (lower.indexOf(p) !== -1) {
        return {
          ok: true,
          action: 'auto_hide',
          reason: 'negative_language',
          message: 'Posted quietly. We prioritise constructive notes on the public feed.',
        };
      }
    }

    return { ok: true, action: 'allow' };
  }

  function isPubliclyVisible(row) {
    if (!row) return false;
    const s = row.moderation_status || 'visible';
    return s === 'visible' || s === 'approved';
  }

  function publicSelectFilter() {
    return 'moderation_status=in.(visible,approved)';
  }

  window.GlotempModeration = {
    evaluate,
    isPubliclyVisible,
    publicSelectFilter,
  };
})();
