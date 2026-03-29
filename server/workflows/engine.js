/**
 * Workflow Engine
 *
 * Executes a workflow definition with support for branching (if/else decisions).
 * Decision steps return true/false from their action; the engine follows the
 * appropriate branch and marks steps on the untaken path as "skipped".
 *
 * Usage:
 *   const engine = require('./engine');
 *   const result = await engine.run(definition, context, userId);
 */
const db = require('../db');

/**
 * Resolve the next step number from a step definition.
 * - Decision steps: follows branches.yes or branches.no based on actionResult
 * - Other steps: uses explicit nextStep, or returns null to fall through
 *
 * @param {object}  stepDef       — Step definition from the workflow
 * @param {boolean} actionResult  — Result of the step's action (true/false)
 * @returns {number|null} The next step number, or null for sequential fallthrough
 */
function resolveNext(stepDef, actionResult) {
  if (stepDef.type === 'decision' && stepDef.branches) {
    return actionResult
      ? stepDef.branches.yes?.targetStep
      : stepDef.branches.no?.targetStep;
  }
  return stepDef.nextStep != null ? stepDef.nextStep : null;
}

/**
 * Collect every step number in the definition. Used to identify
 * unvisited steps that should be marked as "skipped".
 *
 * @param {Array<{ step: number }>} steps — Array of step definitions
 * @returns {Set<number>} Set of all step numbers in the workflow
 */
function allReachableSteps(steps) {
  return new Set(steps.map(s => s.step));
}

/**
 * Execute a full workflow definition by walking the step graph.
 *
 * Creates a `workflow_runs` record, iterates through steps starting from
 * the lowest-numbered step, executes each step's action function (if any),
 * follows decision branches, marks untaken branches as "skipped", and
 * finalizes the run with a success/failed status.
 *
 * @async
 * @param {object} definition — Workflow definition: { key, name, steps: [{ step, type, label, instruction, action?, branches?, nextStep? }] }
 * @param {object} context    — Arbitrary context object passed to each step's action function
 * @param {number} [triggeredBy] — users_id of the user who triggered the workflow
 * @returns {Promise<{ run: object, steps: object[] }>} The finalized workflow_runs row and sorted array of workflow_steps rows
 */
async function run(definition, context, triggeredBy) {
  // 1. Create the workflow run record
  const [run] = await db('workflow_runs').insert({
    workflow_key:  definition.key,
    workflow_name: definition.name,
    status:        'running',
    triggered_by:  triggeredBy || null,
    context:       JSON.stringify(context || {}),
    started_at:    db.fn.now(),
  }).returning('*');

  const stepMap = new Map(definition.steps.map(s => [s.step, s]));
  const allSteps = allReachableSteps(definition.steps);
  const visited = new Set();
  const stepResults = [];
  let overallStatus = 'success';

  // 2. Walk the graph starting from step 1 (or the lowest-numbered step)
  const sorted = [...definition.steps].sort((a, b) => a.step - b.step);
  let currentStepNum = sorted[0].step;

  while (currentStepNum != null && stepMap.has(currentStepNum)) {
    const stepDef = stepMap.get(currentStepNum);
    visited.add(currentStepNum);

    const stepRecord = {
      workflow_runs_id: run.workflow_runs_id,
      step:             stepDef.step,
      type:             stepDef.type,
      label:            stepDef.label,
      instruction:      stepDef.instruction,
      status:           'pending',
    };

    // If a previous step failed, mark remaining as skipped and stop
    if (overallStatus === 'failed') {
      stepRecord.status = 'skipped';
      stepRecord.executed_at = new Date();
      const [saved] = await db('workflow_steps').insert(stepRecord).returning('*');
      stepResults.push(saved);
      break;
    }

    let actionResult = true; // default: treat as truthy for branching
    try {
      if (typeof stepDef.action === 'function') {
        const result = await stepDef.action(context, db);
        // For decision steps, the action should return a boolean
        if (stepDef.type === 'decision') {
          actionResult = !!result;
        }
        stepRecord.status = 'success';
        stepRecord.status_detail = typeof result === 'string' ? result
          : typeof result === 'boolean' ? (result ? 'Condition met' : 'Condition not met')
          : null;
      } else {
        stepRecord.status = 'success';
      }
    } catch (err) {
      stepRecord.status = 'failed';
      stepRecord.status_detail = err.message;
      overallStatus = 'failed';
    }

    stepRecord.executed_at = new Date();
    const [saved] = await db('workflow_steps').insert(stepRecord).returning('*');
    stepResults.push(saved);

    // Determine next step
    if (stepDef.type === 'end' || overallStatus === 'failed') break;

    const nextStep = resolveNext(stepDef, actionResult);
    if (nextStep != null) {
      currentStepNum = nextStep;
    } else {
      // Default: next sequential step in the sorted array
      const idx = sorted.findIndex(s => s.step === stepDef.step);
      currentStepNum = idx < sorted.length - 1 ? sorted[idx + 1].step : null;
    }
  }

  // 3. Mark any unvisited steps as "skipped"
  for (const stepNum of allSteps) {
    if (!visited.has(stepNum)) {
      const stepDef = stepMap.get(stepNum);
      const [saved] = await db('workflow_steps').insert({
        workflow_runs_id: run.workflow_runs_id,
        step:             stepDef.step,
        type:             stepDef.type,
        label:            stepDef.label,
        instruction:      stepDef.instruction,
        status:           'skipped',
        status_detail:    'Branch not taken',
        executed_at:      null,
      }).returning('*');
      stepResults.push(saved);
    }
  }

  // 4. Finalize the run
  const [finalized] = await db('workflow_runs')
    .where('workflow_runs_id', run.workflow_runs_id)
    .update({
      status:        overallStatus,
      finished_at:   db.fn.now(),
      error_message: overallStatus === 'failed'
        ? stepResults.find(s => s.status === 'failed')?.status_detail || 'Unknown error'
        : null,
    })
    .returning('*');

  return { run: finalized, steps: stepResults.sort((a, b) => a.step - b.step) };
}

module.exports = { run };
