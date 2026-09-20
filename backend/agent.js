// agent.js
// The actual agent: a short decision loop, not a single prompt-in/plan-out call.
// It reasons about gaps, decides when to call a tool, then self-checks its
// own plan before returning. Every decision is pushed into `trail` so the
// frontend can show what the agent did and why.
//
// Uses Google's Gemini API via the @google/genai SDK. Get a free key at
// https://aistudio.google.com/apikey and set GEMINI_API_KEY in .env.
// Optionally set GEMINI_API_KEY_2 as a second key - if the first one hits its
// free-tier quota mid-demo, the agent automatically retries with the second
// before falling back to the local template plan.

import { GoogleGenAI } from "@google/genai";
import { searchResources, searchResourcesToolDeclaration } from "./tools.js";

const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean);
const clients = API_KEYS.map((apiKey) => new GoogleGenAI({ apiKey }));
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const TOOLS = [{ functionDeclarations: [searchResourcesToolDeclaration] }];

// Tries each configured API key in turn. Useful when a key hits its free-tier
// quota mid-demo - failing over to a second key is invisible to the user.
// Throws the last error only if every configured key fails.
async function generateWithFailover(params) {
  if (clients.length === 0) {
    throw new Error("No Gemini API key configured. Set GEMINI_API_KEY in .env.");
  }
  let lastErr;
  for (let i = 0; i < clients.length; i++) {
    try {
      return await clients[i].models.generateContent(params);
    } catch (err) {
      lastErr = err;
      console.warn(`Gemini key #${i + 1} failed${i + 1 < clients.length ? ", trying next key" : ""}:`, err?.message || err);
    }
  }
  throw lastErr;
}

export function buildFallbackPlan(profile) {
  const target = profile.targetRole || "your target role";
  const skillsText = (profile.skills || "").toLowerCase();
  const goalText = (profile.goal || "").toLowerCase();
  const roleLower = target.toLowerCase();

  const isBackend = /\b(back|api|server|node|java|python|dotnet|database)\b/.test(roleLower) || /\b(back|api|server|node|java|python|dotnet|database)\b/.test(skillsText);
  const isFrontend = /\b(front|ui|web|react|html|css|javascript)\b/.test(roleLower) || (!isBackend && /\b(front|ui|web|react|html|css|javascript)\b/.test(skillsText));
  const isData = /\b(data|analyst|science|sql|python|power bi|tableau)\b/.test(roleLower) || /\b(data|analyst|science|sql|python|power bi|tableau)\b/.test(skillsText);
  const isDevOps = /\b(devops|cloud|docker|kubernetes|terraform|ci\/cd|cicd|infrastructure|sre|automation|platform)\b/.test(roleLower + " " + skillsText);
  const isDesign = /\b(design|ux|ui designer|product designer|figma|wireframe)\b/.test(roleLower) || /\b(design|ux|figma|wireframe)\b/.test(skillsText);

  const roleTemplate = isFrontend
    ? {
        gap1: "Strengthen the core frontend fundamentals needed for " + target,
        gap2: "Practice JavaScript logic, DOM behavior, and component/state thinking",
        gap3: "Build a portfolio project that demonstrates real UI work",
        gap4: "Prepare for junior-role interviews and practical portfolio discussion",
        weeks: [
          {
            week: 1,
            focus: "Responsive UI foundations",
            objectives: [
              "Review semantic HTML and accessible page structure",
              "Practice responsive CSS layouts and spacing systems",
              "Map your current frontend gaps to the target role",
            ],
            resources: ["MDN HTML reference", "MDN CSS layout guides", "A beginner-friendly responsive design tutorial"],
            practice_task: "Build one landing page using semantic HTML and a responsive layout for mobile and desktop.",
          },
          {
            week: 2,
            focus: "JavaScript and interaction",
            objectives: [
              "Practice variables, functions, arrays, and DOM interaction",
              "Build form validation and button behaviors from scratch",
              "Debug UI bugs using browser dev tools",
            ],
            resources: ["MDN JavaScript Guide", "javascript.info", "freeCodeCamp JavaScript lessons"],
            practice_task: "Create a small interactive page with a form, filter, or tabbed panel that behaves correctly without a framework.",
          },
          {
            week: 3,
            focus: "Portfolio project sprint",
            objectives: [
              "Turn one feature into a polished mini-project",
              "Improve visual consistency and mobile UX",
              "Document your decisions and the problem you solved",
            ],
            resources: ["Frontend Mentor beginner projects", "A CSS design system tutorial", "An accessibility checklist"],
            practice_task: "Build a polished portfolio mini-project such as a dashboard, product landing page, or task tracker.",
          },
          {
            week: 4,
            focus: "Job-ready storytelling",
            objectives: [
              "Refine your strongest portfolio project",
              "Practice explaining your work clearly and confidently",
              "Prepare for technical and role-fit questions",
            ],
            resources: ["Frontend interview prep guides", "A concise case-study template", "Your own project notes"],
            practice_task: "Write a 2-minute walkthrough of your best project and rehearse it as if you were speaking to a hiring manager.",
          },
        ],
      }
    : isBackend
      ? {
          gap1: "Strengthen server-side fundamentals required for " + target,
          gap2: "Practice API design, data flow, and backend logic",
          gap3: "Build a working project that demonstrates a real backend workflow",
          gap4: "Prepare for system design and practical implementation questions",
          weeks: [
            {
              week: 1,
              focus: "APIs and backend foundations",
              objectives: [
                "Review HTTP, JSON, routing, and request handling",
                "Practice basic backend logic and validation",
                "Map your current skills to the backend gaps for your target role",
              ],
              resources: ["MDN HTTP guide", "Node.js official docs", "A beginner API tutorial"],
              practice_task: "Build a tiny REST API that accepts input and returns validated JSON responses.",
            },
            {
              week: 2,
              focus: "Data and persistence",
              objectives: [
                "Practice working with databases and CRUD operations",
                "Understand schema design and data validation",
                "Connect an app to real data and debug common issues",
              ],
              resources: ["SQLBolt", "PostgreSQL tutorial", "A database design primer"],
              practice_task: "Create a small CRUD app with a database and test the main create/read/update/delete flows.",
            },
            {
              week: 3,
              focus: "Project building",
              objectives: [
                "Turn a backend feature into a working project",
                "Add tests, error handling, and basic security checks",
                "Explain architecture decisions in simple terms",
              ],
              resources: ["Testing best practices", "Authentication basics", "A clean project architecture guide"],
              practice_task: "Build a small backend project such as a task API, inventory service, or note app with validation and tests.",
            },
            {
              week: 4,
              focus: "Application readiness",
              objectives: [
                "Polish your project and prepare your technical story",
                "Practice explaining trade-offs and design choices",
                "Prepare for technical interviews and role-fit questions",
              ],
              resources: ["System design basics", "Portfolio case-study templates", "Interview prep notes"],
              practice_task: "Document your backend project and rehearse how you would explain the architecture and challenges you solved.",
            },
          ],
        }
      : isData
        ? {
            gap1: "Strengthen the analytical and SQL foundations required for " + target,
            gap2: "Practice cleaning, questioning, and presenting data clearly",
            gap3: "Build a data project that demonstrates insight generation",
            gap4: "Prepare for analytical interviews and portfolio discussion",
            weeks: [
              {
                week: 1,
                focus: "Data foundations",
                objectives: [
                  "Review SQL, data types, joins, and filtering",
                  "Practice reading data questions and transforming raw data",
                  "Identify the main analytical gaps from your current background",
                ],
                resources: ["SQLBolt", "Mode SQL tutorial", "A beginner data analysis guide"],
                practice_task: "Complete a small SQL challenge using joins, aggregation, and filtering to answer business questions.",
              },
              {
                week: 2,
                focus: "Analysis and storytelling",
                objectives: [
                  "Practice summarizing findings clearly and accurately",
                  "Build basic charts and insight narratives",
                  "Compare raw data with the business question behind it",
                ],
                resources: ["Excel/Google Sheets tutorials", "Data storytelling resources", "Visualization best practices"],
                practice_task: "Turn a sample dataset into a short analytic story with charts, trends, and a recommendation.",
              },
              {
                week: 3,
                focus: "Portfolio data project",
                objectives: [
                  "Use a real dataset to answer an actual question",
                  "Create a clean project narrative and dashboard",
                  "Show how your analysis leads to a recommendation",
                ],
                resources: ["Kaggle datasets", "Dashboard tutorials", "A metrics explanation guide"],
                practice_task: "Build a portfolio analysis project using a public dataset and present your conclusions clearly.",
              },
              {
                week: 4,
                focus: "Interview readiness",
                objectives: [
                  "Practice explaining your analysis process",
                  "Refine your case-study story and metrics choices",
                  "Prepare for role-specific questions",
                ],
                resources: ["Analyst interview prep", "Case-study templates", "Your project notes"],
                practice_task: "Rehearse a 3-minute walkthrough of a data project and explain the business impact of your findings.",
              },
            ],
          }
        : isDevOps
          ? {
              gap1: "Strengthen infrastructure and automation fundamentals required for " + target,
              gap2: "Practice CI/CD, deployment workflows, and environment reliability",
              gap3: "Build a deployment project that proves automation and monitoring skills",
              gap4: "Prepare for DevOps interviews and troubleshooting discussions",
              weeks: [
                {
                  week: 1,
                  focus: "Linux and automation basics",
                  objectives: [
                    "Review Linux command line, shell scripts, and process basics",
                    "Practice automation for routine setup and maintenance tasks",
                    "Map your current systems knowledge to the target DevOps gap",
                  ],
                  resources: ["Linux journey", "Bash tutorial", "The Linux Command Line guide"],
                  practice_task: "Write a shell script that automates a repetitive server task such as log cleanup or config checks.",
                },
                {
                  week: 2,
                  focus: "CI/CD and delivery workflow",
                  objectives: [
                    "Learn how code moves through build, test, and deployment stages",
                    "Practice Git workflows and pipeline basics",
                    "Understand how failures are caught before production",
                  ],
                  resources: ["Git docs", "GitHub Actions tutorial", "A CI/CD beginner guide"],
                  practice_task: "Create a small CI pipeline that builds and tests a web app before deployment.",
                },
                {
                  week: 3,
                  focus: "Infrastructure as code",
                  objectives: [
                    "Practice Docker, container basics, and deployment automation",
                    "Learn how infrastructure is defined and repeatably provisioned",
                    "Build a simple app deployment that can be reproduced",
                  ],
                  resources: ["Docker getting started", "Terraform basics", "An IaC fundamentals tutorial"],
                  practice_task: "Deploy a simple application using Docker and a minimal infrastructure setup with automation.",
                },
                {
                  week: 4,
                  focus: "Monitoring and interview readiness",
                  objectives: [
                    "Review logging, monitoring, and recovery concepts",
                    "Practice explaining deployment trade-offs clearly",
                    "Prepare for role-specific DevOps interview questions",
                  ],
                  resources: ["Monitoring basics", "Incident response concepts", "DevOps interview prep guides"],
                  practice_task: "Document a simple deployment flow, the failure points, and how you would monitor and recover it.",
                },
              ],
            }
          : isDesign
            ? {
              gap1: "Strengthen design fundamentals required for " + target,
              gap2: "Practice layout, hierarchy, and user-centered thinking",
              gap3: "Build a portfolio project that shows your design decisions",
              gap4: "Prepare for design critiques and product storytelling",
              weeks: [
                {
                  week: 1,
                  focus: "Layout and hierarchy",
                  objectives: [
                    "Review spacing, alignment, typography, and visual rhythm",
                    "Practice creating clean interfaces from a brief",
                    "Identify your current design gaps and upgrade points",
                  ],
                  resources: ["Design fundamentals guides", "Typography basics", "A layout principles tutorial"],
                  practice_task: "Design a simple landing page or app screen with a clear hierarchy and consistent spacing.",
                },
                {
                  week: 2,
                  focus: "Interaction and usability",
                  objectives: [
                    "Practice flows, navigation, and usability patterns",
                    "Create a consistent design system for small decisions",
                    "Evaluate where the user experience is weak",
                  ],
                  resources: ["UX basics", "Figma beginner tutorials", "Usability heuristics"],
                  practice_task: "Create a 3-screen user flow for a simple product and explain how the experience supports the user journey.",
                },
                {
                  week: 3,
                  focus: "Portfolio project",
                  objectives: [
                    "Turn a concept into a complete design artifact",
                    "Add rationale, iteration notes, and design decisions",
                    "Prepare a polished case study",
                  ],
                  resources: ["Case-study examples", "Figma workflow tutorials", "UX critique resources"],
                  practice_task: "Create a polished portfolio case study for a small product or feature, including the challenge, solution, and reasoning.",
                },
                {
                  week: 4,
                  focus: "Presentation and critique",
                  objectives: [
                    "Practice explaining design decisions under feedback",
                    "Refine your portfolio story",
                    "Prepare for product and design interviews",
                  ],
                  resources: ["Portfolio design guides", "Critique frameworks", "Storytelling examples"],
                  practice_task: "Record a short walkthrough of your best design work and rehearse how you discuss decisions and trade-offs.",
                },
              ],
            }
          : {
              gap1: "Build the core fundamentals needed for " + target,
              gap2: "Practice the most relevant adjacent skills for your goal",
              gap3: "Create one practical project that demonstrates real progress",
              gap4: "Prepare to explain your work and apply with confidence",
              weeks: [
                {
                  week: 1,
                  focus: "Core fundamentals",
                  objectives: [
                    "Review the base knowledge behind your target role",
                    "Identify your key strengths and the biggest skill gaps",
                    "Set a realistic plan around your time and constraints",
                  ],
                  resources: ["Official docs", "Beginner-friendly tutorials", "Skill-specific learning guides"],
                  practice_task: "Write a short skills map that connects your current experience to the role you want and list the top 3 things to learn next.",
                },
                {
                  week: 2,
                  focus: "Skill building",
                  objectives: [
                    "Spend focused time on the most important missing capabilities",
                    "Practice one concept repeatedly until it feels natural",
                    "Keep notes on what worked and what still feels difficult",
                  ],
                  resources: ["Relevant beginner resources", "Hands-on tutorials", "Your own notes"],
                  practice_task: "Complete a small learning exercise that applies the target skill in a realistic task or mini-project.",
                },
                {
                  week: 3,
                  focus: "Portfolio output",
                  objectives: [
                    "Turn your learning into visible progress",
                    "Create a small artifact you can proudly show",
                    "Document the process and result clearly",
                  ],
                  resources: ["Portfolio examples", "Project briefs", "A simple project case-study template"],
                  practice_task: "Build one practical artifact linked to your goal, such as a mini-project, dashboard, landing page, or simple prototype.",
                },
                {
                  week: 4,
                  focus: "Role readiness",
                  objectives: [
                    "Practice explaining your work and progress",
                    "Prepare for role conversations and interviews",
                    "Adjust the plan based on your strongest and weakest areas",
                  ],
                  resources: ["Interview prep guides", "Role-specific resources", "Your own portfolio notes"],
                  practice_task: "Rehearse a short explanation of your aim, progress, and what you are building next.",
                },
              ],
            };

  const planData = roleTemplate;
  const gaps = [planData.gap1, planData.gap2, planData.gap3, planData.gap4];

  if (!/html|css|frontend|ui|javascript|react|design/.test(skillsText) && isFrontend) {
    gaps[0] = "Build a strong foundation in HTML, CSS, and responsive layout for " + target;
  }

  if (/sql/.test(skillsText) && isFrontend) {
    gaps[1] = "Practice JavaScript and DOM behavior more than backend topics, because your current skills already include SQL";
  }

  return {
    identified_gaps: gaps,
    self_check_notes: `I checked your existing skills and your target of ${target} against the goal of ${goalText || "your stated outcome"}, and the plan is tailored to your role, your current background, and the time you said you have available.`,
    weekly_plan: planData.weeks,
  };
}

export function buildFallbackReplan(profile, previousPlan, progress) {
  const completed = Array.isArray(progress?.completedWeeks) ? progress.completedWeeks : [];
  const struggling = Array.isArray(progress?.strugglingTopics) ? progress.strugglingTopics : [];
  const basePlan = buildFallbackPlan(profile);
  const adjustedWeeks = basePlan.weekly_plan.filter((week) => !completed.includes(week.week));

  return {
    adjustments_made: [
      completed.length ? `Kept the remaining plan after finishing weeks ${completed.join(", ")}` : "Started from the current plan and preserved the most relevant upcoming work",
      struggling.length ? `Added extra focus around ${struggling.join(", ")}` : "Kept the plan steady to avoid over-optimizing too early",
    ],
    self_check_notes:
      "The remaining plan keeps momentum while reinforcing the highest-risk gaps, especially where progress was weak or incomplete.",
    weekly_plan: adjustedWeeks.length ? adjustedWeeks : basePlan.weekly_plan,
  };
}

const SYSTEM_PROMPT = `You are Pathloom, an autonomous learning-and-skill-gap agent.

Given a learner's profile, target outcome, available time, and preferences, you must:
1. Identify the real skill gaps between their current profile and the target role (don't restate skills they already have).
2. For any gap topic where you are not confident about current, high-quality resources, call the search_resources tool. Do not call it for topics you already know well-established resources for.
3. Break the gaps into learning objectives and produce a realistic WEEKLY plan sized to their available hours, deadline, preferred learning style, and constraints. Never assume they are a student, computer science learner, or technical learner.
4. Make the plan practical for their context: use projects, exercises, portfolio work, interview preparation, credentials, or real-world practice only when relevant to their target.
5. Before finalizing, briefly self-check: does this plan actually get them from their current skills to the target role? If something important is missing, revise it.

When you are done reasoning and (optionally) calling tools, respond with ONLY a JSON object (no markdown fences, no prose) in exactly this shape:
{
  "identified_gaps": ["gap 1", "gap 2"],
  "self_check_notes": "one or two sentences on how you validated the plan",
  "weekly_plan": [
    {
      "week": 1,
      "focus": "short title",
      "objectives": ["objective 1", "objective 2"],
      "resources": ["resource 1", "resource 2"],
      "practice_task": "a concrete, specific practice task or mini-project"
    }
  ]
}`;

const REPLAN_SYSTEM_PROMPT = `You are Pathloom, continuing to guide a learner whose plan is already in progress.

You will be given: the learner's original profile, their current plan, and
which weeks they've completed vs. which topics they're struggling with.

Decide how to adjust the REMAINING plan:
- If they're ahead or a topic was easy, you may compress or skip redundant weeks.
- If they're struggling with a topic, add remedial resources, extra practice, or extend the timeline for it. Call search_resources if you're not confident about a good remedial resource.
- Keep weeks they've already completed out of the output - only return the adjusted upcoming weeks.

Respond with ONLY a JSON object (no markdown fences, no prose) in exactly this shape:
{
  "adjustments_made": ["adjustment 1", "adjustment 2"],
  "self_check_notes": "one or two sentences on why this adjustment makes sense",
  "weekly_plan": [
    {
      "week": 3,
      "focus": "short title",
      "objectives": ["objective 1"],
      "resources": ["resource 1"],
      "practice_task": "a concrete practice task"
    }
  ]
}`;

const ASK_SYSTEM_PROMPT = `You are Pathloom's assistant. Answer the learner's
question using ONLY the profile and plan given as context - don't invent
information outside it. Be concise (2-4 sentences unless a list is clearly
needed). If they're asking you to change or regenerate the plan itself, tell
them to use the "Update my plan" feature instead of trying to do it here.`;

const REPORT_SYSTEM_PROMPT = `Given a learner's profile, their plan, and their
progress (completed weeks / struggling topics), produce a short progress
report. Respond with ONLY a JSON object (no markdown fences, no prose) in
exactly this shape:
{
  "skills_acquired": ["skill 1"],
  "skills_in_progress": ["skill 2"],
  "remaining_gaps": ["gap 1"],
  "recommended_next_steps": ["step 1", "step 2"]
}`;

// Shared decision loop: lets the model call search_resources zero or more
// times before producing its final text response. Hard cap of 5 rounds so a
// runaway loop can't hang a demo. Pushes every tool decision into `trail`.
async function runDecisionLoop(systemInstruction, initialUserText, trail) {
  const contents = [{ role: "user", parts: [{ text: initialUserText }] }];

  for (let round = 0; round < 5; round++) {
    const response = await generateWithFailover({
      model: MODEL,
      contents,
      config: { systemInstruction, tools: TOOLS },
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCallPart = parts.find((p) => p.functionCall);

    if (!functionCallPart) {
      return parts.map((p) => p.text || "").join("");
    }

    // The model decided it needs external info - record that decision,
    // push its turn into history, run the tool, and feed the result back in.
    contents.push(candidate.content);

    const { name, args } = functionCallPart.functionCall;
    trail.push({
      step: "agent_decided_to_search",
      topic: args.topic,
      reasoning: "Agent judged its own knowledge of this topic's resources as insufficient",
    });

    const result = await searchResources(args.topic);
    trail.push({ step: "tool_result", ...result });

    contents.push({
      role: "user",
      parts: [{ functionResponse: { name, response: result } }],
    });
  }

  throw new Error("Agent did not produce a final response within the round limit");
}

// Gemini sometimes wraps JSON in ```json fences even when told not to.
function parseJsonOrThrow(content, label) {
  const cleaned = content.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Agent returned non-JSON output for ${label}: ` + cleaned.slice(0, 200));
  }
}

export async function runAgent(profile) {
  const trail = [];
  const userMessage = `Learner profile:
- Current skills: ${profile.skills}
- Background: ${profile.background || "not specified"}
- Relevant experience: ${profile.experience || "not specified"}
- Target role: ${profile.targetRole}
- Goal: ${profile.goal || "not specified"}
- Motivation: ${profile.motivation || "not specified"}
- Available time per week: ${profile.weeklyHours || "not specified"}
- Desired timeline or deadline: ${profile.deadline || "not specified"}
- Preferred learning style: ${profile.learningStyle || "not specified"}
- Constraints or accessibility needs: ${profile.constraints || "not specified"}`;

  trail.push({ step: "profile_received", detail: userMessage });

  try {
    const finalContent = await runDecisionLoop(SYSTEM_PROMPT, userMessage, trail);
    const plan = parseJsonOrThrow(finalContent, "initial plan");

    trail.push({ step: "self_check", detail: plan.self_check_notes || "(none provided)" });
    trail.push({ step: "plan_finalized" });

    return { trail, plan };
  } catch (err) {
    console.warn("Gemini quota or API issue; returning fallback plan.", err?.message || err);
    const fallbackPlan = buildFallbackPlan(profile);
    trail.push({ step: "self_check", detail: "Fallback plan used because the AI API was rate-limited or unavailable." });
    trail.push({ step: "plan_finalized" });
    return { trail, plan: fallbackPlan };
  }
}

// progress: { completedWeeks: [1,2], strugglingTopics: ["React state"] }
export async function runReplan(profile, previousPlan, progress) {
  const trail = [];
  const completed = (progress.completedWeeks || []).join(", ") || "none";
  const struggling = (progress.strugglingTopics || []).join(", ") || "none";

  const userMessage = `Original profile:
- Current skills: ${profile.skills}
- Background: ${profile.background || "not specified"}
- Relevant experience: ${profile.experience || "not specified"}
- Target role: ${profile.targetRole}
- Goal: ${profile.goal || "not specified"}
- Available time per week: ${profile.weeklyHours || "not specified"}
- Desired timeline or deadline: ${profile.deadline || "not specified"}
- Preferred learning style: ${profile.learningStyle || "not specified"}
- Constraints or accessibility needs: ${profile.constraints || "not specified"}

Current plan: ${JSON.stringify(previousPlan)}

Progress: completed weeks: ${completed}. Struggling with: ${struggling}.`;

  trail.push({ step: "progress_received", detail: `Completed: ${completed} | Struggling: ${struggling}` });

  try {
    const finalContent = await runDecisionLoop(REPLAN_SYSTEM_PROMPT, userMessage, trail);
    const plan = parseJsonOrThrow(finalContent, "replan");

    trail.push({ step: "self_check", detail: plan.self_check_notes || "(none provided)" });
    trail.push({ step: "plan_updated" });

    return { trail, plan };
  } catch (err) {
    console.warn("Gemini quota or API issue during replan; using fallback replan.", err?.message || err);
    const fallbackPlan = buildFallbackReplan(profile, previousPlan, progress);
    trail.push({ step: "self_check", detail: fallbackPlan.self_check_notes || "(none provided)" });
    trail.push({ step: "plan_updated" });
    return { trail, plan: fallbackPlan };
  }
}

export async function runAsk(profile, plan, question) {
  const userText = `Profile: ${JSON.stringify(profile)}\nPlan: ${JSON.stringify(plan)}\n\nQuestion: ${question}`;

  try {
    const response = await generateWithFailover({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: userText }] }],
      config: { systemInstruction: ASK_SYSTEM_PROMPT },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    return parts.map((p) => p.text || "").join("");
  } catch (err) {
    console.warn("Gemini unavailable for /api/ask; using local fallback answer.", err?.message || err);
    return buildFallbackAnswer(plan, question);
  }
}

function buildFallbackAnswer(plan, question) {
  const weeks = plan?.weekly_plan || [];
  const normalizedQuestion = question.toLowerCase();
  const requestedWeek = normalizedQuestion.match(/\bweek\s*(\d+)\b/);
  const matchedWeek = (requestedWeek
    ? weeks.find((week) => String(week.week) === requestedWeek[1])
    : null) || weeks.find((week) => {
    const terms = `${week.focus} ${week.objectives?.join(" ") || ""} ${week.practice_task || ""}`.toLowerCase();
    return terms.split(/\W+/).some((term) => term.length > 5 && normalizedQuestion.includes(term));
  });

  if (matchedWeek) {
    return `Week ${matchedWeek.week} focuses on ${matchedWeek.focus}. It comes next because it builds the foundation needed for later work. Start with ${matchedWeek.objectives?.[0] || "the first objective"}, then complete this practice task: ${matchedWeek.practice_task || "the week's practice task"}.`;
  }

  if (/why|start|first|begin|order|before/.test(normalizedQuestion) && weeks.length > 1) {
    return `Your path starts with ${weeks[0].focus} because the plan builds skills in sequence before moving to ${weeks[1].focus}. The full sequence is ${weeks.map((week) => `Week ${week.week}: ${week.focus}`).join("; ")}.`;
  }

  const summary = weeks.map((week) => `Week ${week.week}: ${week.focus}`).join("; ") || "no plan available yet";
  return `Here is the plan context available locally: ${summary}. Ask about a specific week, topic, or practice task for a more focused answer.`;
}

export async function runProgressReport(profile, plan, progress) {
  const userText = `Profile: ${JSON.stringify(profile)}\nPlan: ${JSON.stringify(plan)}\nProgress: ${JSON.stringify(progress || {})}`;

  try {
    const response = await generateWithFailover({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: userText }] }],
      config: { systemInstruction: REPORT_SYSTEM_PROMPT },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p.text || "").join("");
    return parseJsonOrThrow(text, "progress report");
  } catch (err) {
    console.warn("Gemini unavailable for /api/progress-report; using local fallback report.", err?.message || err);
    return buildFallbackReport(plan, progress);
  }
}

function buildFallbackReport(plan, progress) {
  const completed = Array.isArray(progress?.completedWeeks) ? progress.completedWeeks : [];
  const struggling = Array.isArray(progress?.strugglingTopics) ? progress.strugglingTopics : [];
  const weeks = plan?.weekly_plan || [];

  const acquired = weeks.filter((w) => completed.includes(w.week)).map((w) => w.focus);
  const inProgress = weeks.filter((w) => !completed.includes(w.week)).map((w) => w.focus).slice(0, 2);
  const remaining = struggling.length ? struggling : (plan?.identified_gaps || []);

  return {
    skills_acquired: acquired.length ? acquired : ["Not enough progress data yet"],
    skills_in_progress: inProgress.length ? inProgress : ["Continue with your current week"],
    remaining_gaps: remaining.length ? remaining : ["No specific struggles reported"],
    recommended_next_steps: [
      "Keep following the next scheduled week in your plan",
      struggling.length ? `Revisit resources for: ${struggling.join(", ")}` : "Move on to the next week when ready",
    ],
  };
}
