# Pathloom - Personalized Learning & Skill-Gap Agent

Pathloom is a personalized learning and skill-gap agent.

## Problem

Learners often know their target role but not the specific path to get there.
Resources are scattered, and generic curricula don't account for what someone
already knows. Most "learning path" tools just hand out a fixed template
curriculum regardless of the learner's actual background.

## Why this is an agent, not a form

Pathloom doesn't run a single prompt-in/plan-out call. It runs a short
**decision loop**: the model decides, per gap topic, whether it already knows
good resources or needs to call a tool to look them up; it self-checks its
own plan before returning it; and on re-plan, it decides how to adjust based
on what the learner actually struggled with. Every one of these decisions is
returned in a `trail` and rendered live in the UI, so the reasoning is
visible rather than a black box — this is the project's main differentiator
versus a templated recommender.

## Solution

Pathloom is an **agent**, not a single prompt-response tool. Given a learner's
current skills and target role, it:

1. Reasons about the real gap between current skills and the target role.
2. **Decides for itself** which gap topics it needs external, up-to-date
   resources for, and calls a `search_resources` tool only for those.
3. Assembles a structured weekly learning plan (objectives, resources, a
   practice task per week).
4. **Self-checks** its own plan against the learner's stated goal before
   returning it, and can revise if something's missing.

Every decision the agent makes (search or don't search, self-check notes) is
returned in a `trail` and shown in the UI — so the reasoning is visible, not
a black box.

## Architecture

```
frontend/index.html  --POST /api/plan-->  backend/server.js
                                                  |
                                           backend/agent.js  (decision loop)
                                                  |
                                    Gemini (@google/genai, function calling)
                                                  |
                                        backend/tools.js: search_resources()
                                          (Tavily live search, or curated
                                           fallback if no API key set)
```

- **Frontend**: six static pages (Tailwind via CDN, no build step) - `index.html`
  (Overview), `skills.html`, `roadmap.html`, `today.html`, `ask.html`,
  `report.html`. `shared.css` / `shared.js` hold the common styles and logic.
  State (profile, plan, progress) is persisted in `localStorage` so it
  survives real page navigation between files - each page calls `requirePlan()`
  on load and bounces back to Overview if no plan exists yet.
- **Backend**: Node.js + Express. `agent.js` runs the decision loop; `tools.js`
  is the agent's one external tool.
- **Model**: Google Gemini (`gemini-2.5-flash`) via the `@google/genai` SDK,
  using native function calling (swap the model name in `agent.js` for
  `gemini-2.5-pro` if you want stronger reasoning at the cost of latency).

## Setup

```bash
cd backend
npm install
npm start               # runs on http://localhost:7000
```

Then open `frontend/index.html` directly in a browser (or serve it with any
static server). The frontend is already configured to call
`http://127.0.0.1:7000` in this project. Do not open the backend root URL in
the browser for the UI; it only serves the API and health check.

## What's human-authored vs. agent-generated

- **Human-authored**: the agent's architecture, the decision-loop design, the
  tool schema, the system prompt, the fallback resource map, and the UI.
- **Agent-generated at runtime**: the specific skill gaps identified, the
  decision to call `search_resources` (or not) per topic, the weekly plan
  content, and the self-check notes — all produced live per learner, not
  templated or hardcoded.

## Reliability

- `GEMINI_API_KEY_2` (optional) - a second Gemini key. If the first hits its
  free-tier quota mid-demo, every call automatically retries with the second
  key before doing anything else.
- If every configured key fails, `/api/plan` and `/api/replan` fall back to
  a locally generated template plan (`buildFallbackPlan` / `buildFallbackReplan`
  in `agent.js`); `/api/ask` and `/api/progress-report` fall back to a direct
  summary computed from the plan and progress data, with no AI call. Nothing
  the learner does returns a raw error, even with zero working keys.

## Available capabilities

- **`POST /api/replan`** - the learner marks completed weeks and struggling
  topics; the agent decides how to adjust the remaining plan (skip, add
  remedial resources, extend timelines), calling `search_resources` again if
  needed. This is the same decision loop as the initial plan, just given
  progress context.
- **`POST /api/ask`** - natural-language Q&A scoped to the learner's own
  profile and current plan (won't answer outside that context).
- **`POST /api/progress-report`** - generates a structured report: skills
  acquired, skills in progress, remaining gaps, recommended next steps.

## Stretch (not built)

- Resume/portfolio upload parsing to auto-populate current skills.
