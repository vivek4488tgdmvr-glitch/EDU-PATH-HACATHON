import assert from 'node:assert/strict';
import { buildFallbackPlan } from './agent.js';

const plan = buildFallbackPlan({
  skills: 'HTML, CSS, JavaScript, basic SQL',
  targetRole: 'Junior Frontend Developer',
  weeklyHours: '8 hours/week',
  deadline: '3 months',
  learningStyle: 'Project-based',
  constraints: 'Evenings only',
  goal: 'Build portfolio',
});

assert.ok(Array.isArray(plan.identified_gaps), 'identified_gaps should be an array');
assert.ok(plan.identified_gaps.length > 0, 'should identify gaps');
assert.ok(Array.isArray(plan.weekly_plan), 'weekly_plan should be an array');
assert.ok(plan.weekly_plan.length >= 4, 'should include multiple weeks');
assert.ok(plan.self_check_notes.includes('portfolio') || plan.self_check_notes.includes('goal') || plan.self_check_notes.includes('role'), 'self-check should relate to the learner goal');

console.log('fallback-plan test passed');
