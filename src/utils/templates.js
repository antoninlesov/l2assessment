/**
 * Recommendation Templates - Maps categories to recommended actions
 */

// Single source of truth for the categories the triage model may use.
// Imported by llmHelper.js so the prompt and the app can never drift apart.
export const CATEGORIES = [
  "Billing Issue",
  "Technical Problem",
  "Feature Request",
  "General Inquiry",
  "Positive Feedback",
  "Unknown",
];

const actionTemplates = {
  "Billing Issue": "Route to the billing team and verify the customer's payment/account status.",
  "Technical Problem": "Create a support ticket; gather error details and reproduction steps for engineering.",
  "Feature Request": "Log in the product feedback backlog and thank the customer for the suggestion.",
  "General Inquiry": "Reply with the relevant FAQ/help-center article.",
  "Positive Feedback": "Acknowledge and thank the customer; no further action required.",
  "Unknown": "Review manually — message could not be confidently classified.",
}

/**
 * Get recommended action for a given category
 *
 * @param {string} category - The message category
 * @returns {string} - Recommended next step
 */
export function getRecommendedAction(category) {
  return actionTemplates[category] || "Review manually."
}

/**
 * Get all available categories
 *
 * @returns {string[]} - List of categories
 */
export function getAvailableCategories() {
  return CATEGORIES
}

/**
 * Determines if a message should be escalated to a human.
 *
 * Escalates when the stakes or the uncertainty are high — not based on
 * message length. This is the human-in-the-loop safety net for Relay AI:
 * the AI handles the easy/confident cases, humans catch the rest.
 *
 * @param {string} category - The message category
 * @param {string} urgency - The urgency level ("High" | "Medium" | "Low")
 * @param {number} confidence - Model confidence in the category (0..1)
 * @returns {boolean} - Whether to escalate
 */
export function shouldEscalate(category, urgency, confidence) {
  if (urgency === "High") return true            // high-stakes: always human-check
  if (category === "Unknown") return true         // couldn't classify it
  if (typeof confidence === "number" && confidence < 0.6) return true // not sure
  return false
}
