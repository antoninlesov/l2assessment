# Customer Inbox Triage App

## Assessment Write-up (changes by Antonin Lesov)

### Top 3 areas for improvement found
1. **Urgency was meaning-blind.** The rule-based scorer used punctuation and length, not content — so "Server down now" was marked **Low** (too short) and "Thank you!!!" was marked **High** (too many `!`). It never checked for words like *down, urgent, can't access*.
2. **Weak prompt + brittle parsing.** The LLM prompt was just *"Categorize this message"* with no category list, no format, and `temperature: 0.7` (inconsistent). The app then keyword-scraped the free-text reply (`content.includes('billing')`), which breaks on phrasing like "this is *not* a billing issue."
3. **Wrong recommendations & length-only escalation.** Feature requests were told to "check billing portal," there was no *Positive Feedback* category, and `shouldEscalate` only checked `message.length > 100` — ignoring urgency entirely.

### Improvement implemented
Replaced the three disconnected steps with **one structured LLM call** (`temperature: 0`, JSON output) that returns `category`, `urgency`, `confidence`, and `reasoning` together — grounded in a fixed category list with few-shot examples. On top of that:
- **Confidence-based human escalation** (`shouldEscalate`): escalates on High urgency, low confidence, or Unknown — the human-in-the-loop safety net.
- **Input validation** (min length) so junk like "hi" can't be submitted.
- **Visible fallback warning** instead of silently faking results when the API fails.
- Fixed the recommendation templates and added a *Positive Feedback* category.

**Why this is the biggest win for Relay AI:** accurate category + urgency is the whole value of triage. One structured call fixes pieces of all three problems at once, makes results consistent, and the confidence/escalation flow lets the AI safely handle the easy cases while routing the uncertain ones to a human — which is exactly how you handle more volume without adding staff.

Files changed: `src/utils/llmHelper.js`, `src/utils/templates.js`, `src/utils/urgencyScorer.js`, `src/pages/AnalyzePage.jsx`.

---

## Overview

The Customer Inbox Triage app is a lightweight AI-powered tool that helps classify customer support messages and recommend actions. It uses Groq AI to categorize messages, applies rule-based urgency scoring, and suggests next steps based on predefined templates.

## Problem Statement

Support teams waste time manually reading and triaging customer messages. This tool provides an automated first pass at classification to help prioritize and route messages more efficiently.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **AI**: Groq API (Llama 3.3 70B - Free tier)
- **Runtime**: Browser-based (local development only)

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Groq API key (FREE - get from https://console.groq.com)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "L2 assessment"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Groq API Key**
   
   Create a `.env.local` file in the root directory:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Groq API key:
   ```
   VITE_GROQ_API_KEY=gsk_your-actual-key-here
   ```
   
   Get your FREE API key from: https://console.groq.com/keys
   
   **Why Groq?** Groq offers a generous free tier with fast inference and no credit card required!

4. **Run the application**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173`

## How It Works

1. **Paste Message**: User pastes a customer support message into the text area
2. **Analyze**: Click "Analyze Message" to process the input
3. **Classification**: The app runs three processes in parallel:
   - **Category Classification** (LLM): Uses Groq AI (Llama 3.3 70B) to categorize the message
   - **Urgency Scoring** (Rule-based): Applies simple rules to determine urgency
   - **Recommendation** (Template-based): Maps category to a recommended action
4. **Display Results**: Shows category, urgency tag, recommended action, and AI reasoning
5. **History**: All analyses are saved to localStorage and viewable in the History tab


## Example Test Messages

Try analyzing these messages to see how the triage system works:

### Example 1: Production Issue
```
Our production server is down
```

### Example 2: Customer Feedback
```
Hi there! I just wanted to say thank you for your amazing customer service. I've been using your product for three years now and I'm really happy with it. Keep up the great work!
```

### Example 3: Feature Request
```
I would love to see a dark mode option in the app. It would be much easier on my eyes during night time usage.
```

### Example 4: Payment Issue
```
I tried to update my payment method but the page keeps loading forever. Is this a known issue?
```

### Example 5: Billing Question
```
Can I upgrade my subscription to the pro plan?
```

### Example 6: Technical Support
```
The dashboard won't load when I try to access it. I've tried refreshing but it keeps timing out.
```

## Security Note

⚠️ **Warning**: This application exposes the Groq API key in the browser (using `dangerouslyAllowBrowser: true`). This is acceptable for local development only but should **NEVER** be done in production. In a real application, API calls should be made from a secure backend server.

## Why Groq?

- ✅ **Completely Free** - No credit card required
- ✅ **Fast Inference** - Groq's LPU technology is incredibly fast
- ✅ **Generous Limits** - ~14,400 requests/day on free tier
- ✅ **High Quality** - Llama 3.3 70B performs excellently
- ✅ **Easy Signup** - Get started in minutes at https://console.groq.com

## License

This project is for educational purposes only.
