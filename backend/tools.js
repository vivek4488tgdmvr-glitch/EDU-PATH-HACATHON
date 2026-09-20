// tools.js
// The single tool the agent can call. Real web search if TAVILY_API_KEY is
// set; otherwise a small curated fallback so the demo works with zero setup.

const CURATED_FALLBACK = {
  javascript: ["MDN JavaScript Guide", "javascript.info", "freeCodeCamp JS course"],
  python: ["Python official tutorial (docs.python.org)", "Automate the Boring Stuff", "Real Python"],
  react: ["React official docs (react.dev)", "Epic React by Kent C. Dodds", "freeCodeCamp React course"],
  "system design": ["Grokking the System Design Interview", "ByteByteGo YouTube", "System Design Primer (GitHub)"],
  sql: ["Mode SQL Tutorial", "SQLBolt", "PostgreSQL official tutorial"],
  "machine learning": ["Andrew Ng's ML Specialization (Coursera)", "fast.ai course", "Google ML Crash Course"],
  git: ["Pro Git book (free)", "Learn Git Branching (interactive)"],
  "data structures": ["NeetCode roadmap", "CS50 lecture on data structures", "Visualgo.net"],
  docker: ["Docker official get-started guide", "freeCodeCamp Docker course"],
  aws: ["AWS Cloud Practitioner Essentials", "AWS Skill Builder"],
};

function fallbackLookup(topic) {
  const key = Object.keys(CURATED_FALLBACK).find((k) =>
    topic.toLowerCase().includes(k)
  );
  return key
    ? CURATED_FALLBACK[key]
    : [`Search "${topic} tutorial" on freeCodeCamp / official docs`];
}

export async function searchResources(topic) {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return {
      source: "curated-fallback",
      topic,
      results: fallbackLookup(topic),
    };
  }

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: `best free resource to learn ${topic}`,
        max_results: 3,
      }),
    });
    const data = await res.json();
    const results = (data.results || []).map((r) => `${r.title} - ${r.url}`);
    return {
      source: "tavily-live-search",
      topic,
      results: results.length ? results : fallbackLookup(topic),
    };
  } catch (err) {
    return {
      source: "curated-fallback (search failed)",
      topic,
      results: fallbackLookup(topic),
    };
  }
}

// JSON schema the model uses to decide when/how to call this tool.
// Gemini's functionDeclarations format (note: uppercase type strings).
export const searchResourcesToolDeclaration = {
  name: "search_resources",
  description:
    "Look up up-to-date learning resources (courses, docs, articles) for a specific skill topic. Call this only for gap topics you decide actually need external material.",
  parameters: {
    type: "OBJECT",
    properties: {
      topic: {
        type: "STRING",
        description: "The specific skill or topic to find learning resources for.",
      },
    },
    required: ["topic"],
  },
};
