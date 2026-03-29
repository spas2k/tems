/**
 * @file workflows.js — Workflows API Routes — /api/workflows
 * Workflow execution history, manual triggering, and step inspection.
 * Uses the workflow engine to execute registered workflow definitions.
 *
 * @module routes/workflows
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const safeError = require('./_safeError');
const { requireRole } = require('../middleware/auth');
const engine = require('../workflows/engine');
const registry = require('../workflows/index');

/**
 * Build the edge list from a workflow definition for the flowchart.
 * Supports linear (step → step+1), explicit nextStep, and decision branches.
 */
function buildEdges(def) {
  const edges = [];
  const sorted = [...def.steps].sort((a, b) => a.step - b.step);
  const stepNums = new Set(sorted.map(s => s.step));

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    if (s.type === 'end') continue; // end nodes have no outgoing edges

    if (s.type === 'decision' && s.branches) {
      // Two outgoing edges with labels
      if (s.branches.yes && stepNums.has(s.branches.yes.targetStep)) {
        edges.push({ from: s.step, to: s.branches.yes.targetStep, label: s.branches.yes.label || 'Yes' });
      }
      if (s.branches.no && stepNums.has(s.branches.no.targetStep)) {
        edges.push({ from: s.step, to: s.branches.no.targetStep, label: s.branches.no.label || 'No' });
      }
    } else if (s.nextStep != null && stepNums.has(s.nextStep)) {
      edges.push({ from: s.step, to: s.nextStep });
    } else {
      // Default: next sequential step
      const nextIdx = i + 1;
      if (nextIdx < sorted.length) {
        edges.push({ from: s.step, to: sorted[nextIdx].step });
      }
    }
  }
  return edges;
}

/**
 * Walk the definition graph from step 1, following one branch path.
 * Returns the set of step numbers that would be visited.
 *   branchChoices: { [stepNum]: 'yes' | 'no' }  — which branch to take at each decision
 */
function walkPath(def, branchChoices = {}) {
  const stepMap = new Map(def.steps.map(s => [s.step, s]));
  const sorted = [...def.steps].sort((a, b) => a.step - b.step);
  const visited = new Set();
  let cur = sorted[0].step;

  while (cur != null && stepMap.has(cur) && !visited.has(cur)) {
    visited.add(cur);
    const s = stepMap.get(cur);
    if (s.type === 'end') break;

    if (s.type === 'decision' && s.branches) {
      const choice = branchChoices[s.step] || 'yes';
      const branch = choice === 'no' ? s.branches.no : s.branches.yes;
      cur = branch?.targetStep ?? null;
    } else if (s.nextStep != null) {
      cur = s.nextStep;
    } else {
      const idx = sorted.findIndex(x => x.step === s.step);
      cur = idx < sorted.length - 1 ? sorted[idx + 1].step : null;
    }
  }
  return visited;
}

// ── GET /  — list all workflow runs ─────────────────────────
/**
 * GET /
 * List all workflow runs with step counts and triggered-by user, ordered by started_at desc.
 * @returns Array of workflow run objects
 */
router.get('/', async (req, res) => {
  try {
    const rows = await db('workflow_runs')
      .leftJoin('users as u', 'workflow_runs.triggered_by', 'u.users_id')
      .select(
        'workflow_runs.*',
        'u.display_name as triggered_by_name',
      )
      .orderBy('workflow_runs.started_at', 'desc');
    res.json(rows);
  } catch (err) { safeError(res, err, 'workflows'); }
});

// ── GET /definitions — list available workflow definitions ──
/**
 * GET /definitions
 * List all registered workflow definitions.
 * @returns Array of { key, name, description, stepCount }
 */
router.get('/definitions', (_req, res) => {
  const defs = Object.values(registry).map(d => ({
    key:         d.key,
    name:        d.name,
    description: d.description || '',
    stepCount:   d.steps.length,
    hasBranches: d.steps.some(s => s.branches),
  }));
  res.json(defs);
});

// ── GET /:id — get a single workflow run with its steps ─────
/**
 * GET /:id
 * Get a single workflow run by ID with all steps ordered by step number.
 * @returns Workflow run object + steps array
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id' });

    const run = await db('workflow_runs')
      .leftJoin('users as u', 'workflow_runs.triggered_by', 'u.users_id')
      .select('workflow_runs.*', 'u.display_name as triggered_by_name')
      .where('workflow_runs.workflow_runs_id', id)
      .first();
    if (!run) return res.status(404).json({ error: 'Workflow run not found' });

    const steps = await db('workflow_steps')
      .where('workflow_runs_id', id)
      .orderBy('step', 'asc');

    const def = registry[run.workflow_key];
    const edges = def ? buildEdges(def) : [];

    res.json({ run, steps, edges });
  } catch (err) { safeError(res, err, 'workflows'); }
});

// ── POST /execute — run a workflow by key ───────────────────
router.post('/execute', requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const { workflow_key, context } = req.body;
    if (!workflow_key) return res.status(400).json({ error: 'workflow_key is required' });

    const definition = registry[workflow_key];
    if (!definition) return res.status(404).json({ error: `Workflow "${workflow_key}" not found` });

    const userId = req.user?.users_id || null;
    const result = await engine.run(definition, context || {}, userId);
    const edges = buildEdges(definition);
    res.json({ ...result, edges });
  } catch (err) { safeError(res, err, 'workflows'); }
});

// ── POST /demo/:key — simulate a run for demo/testing ───────
// Body options:
//   failAtStep:     number  — simulate a hard failure at step N
//   branchChoices:  { [stepNum]: 'yes' | 'no' } — which branch to take at each decision
router.post('/demo/:key', requireRole('Admin'), async (req, res) => {
  try {
    const definition = registry[req.params.key];
    if (!definition) return res.status(404).json({ error: `Workflow "${req.params.key}" not found` });

    const { failAtStep, branchChoices } = req.body;
    const userId = req.user?.users_id || null;

    // Determine which steps are on the taken path
    const takenPath = walkPath(definition, branchChoices || {});
    const now = new Date();

    const steps = definition.steps.map(s => {
      const onPath = takenPath.has(s.step);
      let status;
      if (!onPath) {
        status = 'skipped';
      } else if (failAtStep && s.step === failAtStep) {
        status = 'failed';
      } else if (failAtStep && s.step > failAtStep && onPath) {
        // After failure on the taken path, subsequent steps are skipped
        const sortedPath = [...takenPath].sort((a, b) => a - b);
        const failIdx = sortedPath.indexOf(failAtStep);
        const curIdx = sortedPath.indexOf(s.step);
        status = curIdx > failIdx ? 'skipped' : 'success';
      } else {
        status = 'success';
      }
      return {
        step:          s.step,
        type:          s.type,
        label:         s.label,
        instruction:   s.instruction,
        status,
        status_detail: status === 'failed' ? 'Simulated failure for demo'
          : status === 'skipped' && !onPath ? 'Branch not taken'
          : null,
        executed_at:   status !== 'skipped' ? now : null,
      };
    });

    const overallStatus = steps.some(s => s.status === 'failed') ? 'failed' : 'success';

    const [run] = await db('workflow_runs').insert({
      workflow_key:  definition.key,
      workflow_name: definition.name,
      status:        overallStatus,
      triggered_by:  userId,
      context:       JSON.stringify(req.body.context || {}),
      started_at:    now,
      finished_at:   now,
      error_message: overallStatus === 'failed' ? 'Simulated failure for demo' : null,
    }).returning('*');

    const savedSteps = [];
    for (const s of steps) {
      const [saved] = await db('workflow_steps').insert({
        workflow_runs_id: run.workflow_runs_id,
        ...s,
      }).returning('*');
      savedSteps.push(saved);
    }

    const edges = buildEdges(definition);
    res.json({ run, steps: savedSteps, edges });
  } catch (err) { safeError(res, err, 'workflows'); }
});

module.exports = router;
