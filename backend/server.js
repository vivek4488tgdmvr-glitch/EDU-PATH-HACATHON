// server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAgent, runReplan, runAsk, runProgressReport } from "./agent.js";

const app = express();
const frontendPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "frontend");
app.use(cors());
app.use(express.json());
app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.post("/api/plan", async (req, res) => {
  const {
    skills,
    experience,
    targetRole,
    goal,
    background,
    motivation,
    weeklyHours,
    deadline,
    learningStyle,
    constraints,
  } = req.body || {};

  if (!skills || !targetRole) {
    return res.status(400).json({ error: "skills and targetRole are required" });
  }

  try {
    const result = await runAgent({
      skills,
      experience,
      targetRole,
      goal,
      background,
      motivation,
      weeklyHours,
      deadline,
      learningStyle,
      constraints,
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/replan", async (req, res) => {
  const { profile, previousPlan, progress } = req.body || {};

  if (!profile || !previousPlan) {
    return res.status(400).json({ error: "profile and previousPlan are required" });
  }

  try {
    const result = await runReplan(profile, previousPlan, progress || {});
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/ask", async (req, res) => {
  const { profile, plan, question } = req.body || {};

  if (!plan || !question) {
    return res.status(400).json({ error: "plan and question are required" });
  }

  try {
    const answer = await runAsk(profile || {}, plan, question);
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/progress-report", async (req, res) => {
  const { profile, plan, progress } = req.body || {};

  if (!plan) {
    return res.status(400).json({ error: "plan is required" });
  }

  try {
    const report = await runProgressReport(profile || {}, plan, progress || {});
    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Pathloom backend running on port ${PORT}`));
