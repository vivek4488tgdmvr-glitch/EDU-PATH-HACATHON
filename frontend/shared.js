// shared.js - loaded by every page. Handles cross-page state (since each
// section is now a real page, not a tab), nav rendering, and helpers
// duplicated across pages otherwise.

const BASE_URL = "http://127.0.0.1:5000"; // active local backend
const STORAGE_KEY = "pathloom_state_v1";

const PAGES = [
  { id: "overview", href: "index.html", label: "Overview" },
  { id: "skills", href: "skills.html", label: "Skill Map" },
  { id: "roadmap", href: "roadmap.html", label: "Roadmap" },
  { id: "today", href: "today.html", label: "Today" },
  { id: "ask", href: "ask.html", label: "Ask AI" },
];

const DEMO_PROFILE = {
  skills: "HTML, CSS, basic JavaScript, some SQL",
  background: "Self-taught, 6 months of practice",
  experience: "Built two static portfolio sites",
  targetRole: "Frontend Developer",
  goal: "Land a junior frontend role",
  motivation: "Switch careers into tech within 3 months",
  weeklyHours: "8 hours/week",
  deadline: "3 months",
  learningStyle: "Project-based",
  constraints: "Evenings only",
};
const DEMO_TRAIL = [
  { step: "profile_received", detail: "Learner profile received (demo data)." },
  { step: "agent_decided_to_search", topic: "React fundamentals", reasoning: "Agent judged its own knowledge of current best resources as worth verifying" },
  { step: "tool_result", source: "curated-fallback", topic: "React fundamentals", results: ["React official docs (react.dev)", "Epic React by Kent C. Dodds"] },
  { step: "self_check", detail: "Plan matches stated weekly hours and prioritizes portfolio-ready output." },
  { step: "plan_finalized" },
];
const DEMO_PLAN = {
  identified_gaps: [
    "JavaScript logic and DOM interaction",
    "Component-based thinking (React)",
    "Portfolio-quality project polish",
    "Interview storytelling",
  ],
  self_check_notes: "This is illustrative demo data, not a live agent run - shown so you can preview the dashboard instantly.",
  weekly_plan: [
    { week: 1, focus: "Responsive UI foundations", objectives: ["Review semantic HTML and accessible structure", "Practice responsive CSS layouts", "Map current gaps to the target role"], resources: ["MDN HTML reference", "MDN CSS layout guides"], practice_task: "Build one responsive landing page." },
    { week: 2, focus: "JavaScript and interaction", objectives: ["Practice DOM interaction", "Build form validation from scratch", "Debug with dev tools"], resources: ["javascript.info", "MDN JavaScript Guide"], practice_task: "Build an interactive form with validation." },
    { week: 3, focus: "Portfolio project sprint", objectives: ["Turn a feature into a polished mini-project", "Improve mobile UX", "Document your decisions"], resources: ["Frontend Mentor projects"], practice_task: "Build a polished portfolio mini-project." },
    { week: 4, focus: "Job-ready storytelling", objectives: ["Refine your strongest project", "Practice explaining your work", "Prepare for interview questions"], resources: ["Frontend interview prep guides"], practice_task: "Rehearse a 2-minute project walkthrough." },
  ],
};

// ---- state persistence (localStorage - this is a local static app the
// person runs on their own machine, not a hosted Claude artifact, so
// browser storage is the right tool here) ----
function getState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch (err) {
    console.warn("Could not read saved state, starting fresh.", err);
    return defaultState();
  }
}

function defaultState() {
  return {
    profile: null,
    plan: null,
    trail: [],
    completedWeeks: [],
    strugglingTopics: [],
    todayChecked: [], // array of "week:objectiveIndex" strings
  };
}

function setState(partial) {
  const current = getState();
  const next = { ...current, ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

function loadDemoData() {
  return setState({
    profile: DEMO_PROFILE,
    plan: DEMO_PLAN,
    trail: DEMO_TRAIL,
    completedWeeks: [],
    strugglingTopics: [],
    todayChecked: [],
  });
}

// ---- nav bar ----
function renderNavBar(activeId) {
  const container = document.getElementById("navBar");
  if (!container) return;
  const state = getState();
  const hasPlan = !!state.plan;

  container.innerHTML = PAGES.map((p) => {
    const isActive = p.id === activeId;
    const locked = !hasPlan && p.id !== "overview";
    const classes = ["tab-btn"];
    if (isActive) classes.push("active");
    if (locked) classes.push("locked");
    return `<a href="${locked ? "#" : p.href}" class="${classes.join(" ")}" data-page-id="${p.id}" ${locked ? 'data-locked="true"' : ""}>${p.label}</a>`;
  }).join("");

  container.querySelectorAll('[data-locked="true"]').forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      alert("Generate your plan on the Overview page first (or click \"Load demo example\").");
    });
  });
}

// A page that needs a plan to make sense (everything except Overview) calls
// this at load time; if there's no plan yet it bounces back to Overview.
function requirePlan() {
  const state = getState();
  if (!state.plan) {
    window.location.href = "index.html";
    return null;
  }
  return state;
}

// ---- shared UI helpers ----
function setBusy(btn, label) {
  btn.disabled = true;
  btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
  btn.innerHTML = `<span class="spinner"></span>${label}`;
}

function clearBusy(btn) {
  btn.disabled = false;
  btn.textContent = btn.dataset.originalText;
}

const TRAIL_ICONS = {
  profile_received: "📝", agent_decided_to_search: "🔎", tool_result: "📚",
  self_check: "✅", plan_finalized: "🏁", progress_received: "📈", plan_updated: "🔄",
};

function renderTrailList(listEl, trail) {
  listEl.innerHTML = "";
  trail.forEach((t) => {
    const li = document.createElement("li");
    li.className = "bg-slate-900 border border-slate-800 rounded-lg p-3 fade-in";
    const icon = TRAIL_ICONS[t.step] || "•";
    if (t.step === "agent_decided_to_search") {
      li.innerHTML = `${icon} <span class="text-indigo-400">Decided to search:</span> ${t.topic} <span class="text-slate-500">- ${t.reasoning}</span>`;
    } else if (t.step === "tool_result") {
      li.innerHTML = `${icon} <span class="text-emerald-400">Tool result (${t.source}) for "${t.topic}":</span> ${t.results.join(", ")}`;
    } else if (t.step === "self_check") {
      li.innerHTML = `${icon} <span class="text-amber-400">Self-check:</span> ${t.detail}`;
    } else if (t.step === "profile_received" || t.step === "progress_received") {
      li.innerHTML = `${icon} <span class="text-slate-400">${t.detail || "Input received"}</span>`;
    } else if (t.step === "plan_finalized") {
      li.innerHTML = `${icon} <span class="text-emerald-400">Plan finalized.</span>`;
    } else if (t.step === "plan_updated") {
      li.innerHTML = `${icon} <span class="text-emerald-400">Plan updated based on your progress.</span>`;
    }
    listEl.appendChild(li);
  });
}

function getCurrentWeek(plan, completedWeeks) {
  const weeks = plan?.weekly_plan || [];
  return weeks.find((w) => !completedWeeks.includes(w.week)) || weeks[weeks.length - 1] || null;
}
