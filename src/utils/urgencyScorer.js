/**
 * Urgency Scorer - Rule-based urgency calculation (fallback path).
 *
 * Primary urgency now comes from the LLM (see llmHelper.js). This rule-based
 * version is the deterministic fallback used when the API is unavailable.
 *
 * It scores on MEANING (urgency keywords), not punctuation or length — the
 * original version marked "Server down now" as Low (too short) and a happy
 * "Thank you!!!" as High (too many "!"), which is exactly backwards.
 */

const HIGH_URGENCY_TERMS = [
  'urgent', 'emergency', 'asap', 'immediately', 'critical', 'down', 'outage',
  'not working', "can't access", 'cannot access', 'cant access', 'broken',
  'crash', 'data loss', 'lost data', 'hacked', 'security', 'breach',
  'payment failed', 'charged twice', 'locked out',
];

const LOW_URGENCY_TERMS = [
  'thank', 'thanks', 'appreciate', 'love', 'great job', 'feedback',
  'suggestion', 'would be nice', 'whenever', 'no rush',
];

export function calculateUrgency(message) {
  const m = message.toLowerCase();

  if (HIGH_URGENCY_TERMS.some((term) => m.includes(term))) return "High";
  if (LOW_URGENCY_TERMS.some((term) => m.includes(term))) return "Low";

  // A reported problem with no explicit urgency word defaults to Medium.
  const problemTerms = ['error', 'bug', 'issue', 'problem', 'fail', 'slow', 'wrong'];
  if (problemTerms.some((term) => m.includes(term))) return "Medium";

  return "Low";
}
