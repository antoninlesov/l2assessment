import Groq from 'groq-sdk';
import { calculateUrgency } from './urgencyScorer';
import { CATEGORIES } from './templates';

/**
 * LLM Helper for triaging customer support messages.
 *
 * Improvement over the original:
 *  - ONE structured call returns category + urgency + confidence + reasoning,
 *    instead of a vague prompt whose free-text answer was keyword-scraped.
 *  - A fixed category list + few-shot examples + temperature 0 make results
 *    consistent and grounded in the message's meaning (not its punctuation).
 *  - Failures are reported (usedFallback) instead of silently faking an answer.
 */

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true // local dev only — see README security note
});

const SYSTEM_PROMPT = `You are a customer-support triage assistant for a SaaS product.
Classify each incoming message and return ONLY a JSON object (no markdown, no prose) with this exact shape:

{
  "category": one of ${JSON.stringify(CATEGORIES)},
  "urgency": "High" | "Medium" | "Low",
  "confidence": a number between 0 and 1 (how sure you are of the category),
  "reasoning": a one-sentence explanation of your decision
}

Rules:
- Judge urgency by MEANING, not punctuation or length. Outages, "can't access", "down",
  payment failures blocking use, data loss, and security issues are High. Short messages
  like "Server down now" are High. Friendly thank-you notes are Low even with many "!".
- Use "Positive Feedback" for praise/thanks with no request.
- Use "Unknown" with low confidence when the message is empty, gibberish, or unclassifiable.

Examples:
Message: "Server down now"
{"category":"Technical Problem","urgency":"High","confidence":0.9,"reasoning":"Reports a production outage that blocks usage."}

Message: "Thank you so much, your team has been amazing!!!"
{"category":"Positive Feedback","urgency":"Low","confidence":0.97,"reasoning":"Pure praise with no support request."}

Message: "Could you add CSV export? Would help my monthly reports."
{"category":"Feature Request","urgency":"Low","confidence":0.92,"reasoning":"Requests new functionality, not a problem."}

Message: "My payment failed and now I can't access the dashboard."
{"category":"Billing Issue","urgency":"High","confidence":0.6,"reasoning":"Billing failure is blocking access; could also be technical."}`;

/**
 * Triage a customer support message.
 *
 * @param {string} message
 * @returns {Promise<{category: string, urgency: string, confidence: number, reasoning: string, usedFallback: boolean}>}
 */
export async function categorizeMessage(message) {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Message: ${message}` }
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content);

    // Validate the model's output and fall back per-field if needed.
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : "Unknown";
    const urgency = ["High", "Medium", "Low"].includes(parsed.urgency)
      ? parsed.urgency
      : calculateUrgency(message);
    const confidence = typeof parsed.confidence === "number"
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.5;

    return {
      category,
      urgency,
      confidence,
      reasoning: parsed.reasoning || "No reasoning provided.",
      usedFallback: false,
    };
  } catch (error) {
    console.warn('Groq API failed, using keyword fallback:', error.message);
    return { ...getMockCategorization(message), usedFallback: true };
  }
}

/**
 * Deterministic keyword fallback for when the API is unavailable.
 * Returns the same shape as the live path so the UI never breaks.
 */
function getMockCategorization(message) {
  const m = message.toLowerCase();
  const urgency = calculateUrgency(message);

  const has = (...words) => words.some((w) => m.includes(w));

  if (has('bill', 'payment', 'charge', 'invoice', 'credit card', 'subscription', 'refund')) {
    return { category: "Billing Issue", urgency, confidence: 0.5, reasoning: "Keyword fallback: billing-related terms detected." };
  }
  if (has('bug', 'error', 'broken', 'not working', 'crash', 'down', 'server', 'loading', 'slow')) {
    return { category: "Technical Problem", urgency, confidence: 0.5, reasoning: "Keyword fallback: technical problem terms detected." };
  }
  if (has('feature', 'add ', 'improve', 'suggestion', 'wish', 'would be great', 'enhancement')) {
    return { category: "Feature Request", urgency, confidence: 0.5, reasoning: "Keyword fallback: feature-request terms detected." };
  }
  if (has('thank', 'thanks', 'appreciate', 'love', 'great job') && !has('but', 'however')) {
    return { category: "Positive Feedback", urgency: "Low", confidence: 0.5, reasoning: "Keyword fallback: positive sentiment detected." };
  }
  if (has('how', 'what', 'when', 'where', 'can i', 'is there', '?')) {
    return { category: "General Inquiry", urgency, confidence: 0.5, reasoning: "Keyword fallback: question detected." };
  }
  return { category: "Unknown", urgency, confidence: 0.3, reasoning: "Keyword fallback: no clear category." };
}
