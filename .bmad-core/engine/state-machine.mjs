/**
 * State Machine — manages workflow instance states with atomic persistence.
 *
 * @module state-machine
 */

import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const STATE_DIR = resolve(import.meta.dirname, '..', 'state');
const INSTANCES_FILE = resolve(STATE_DIR, 'workflow-instances.json');

const STATES = {
  PENDING: 'pending',
  READY: 'ready',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  BLOCKED: 'blocked',
};

export { STATES };

/**
 * Ensure state directory exists.
 */
function ensureStateDir() {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
}

/**
 * Read all workflow instances from disk.
 *
 * @returns {Object} Map of instance IDs to instance objects
 */
function readInstances() {
  ensureStateDir();
  if (!existsSync(INSTANCES_FILE)) {
    return {};
  }
  return JSON.parse(readFileSync(INSTANCES_FILE, 'utf-8'));
}

/**
 * Atomically write workflow instances to disk.
 * Uses write-to-temp-then-rename pattern.
 *
 * @param {Object} instances - Map of instance IDs to instance objects
 */
function writeInstancesSync(instances) {
  ensureStateDir();
  const tmpFile = `${INSTANCES_FILE}.tmp.${Date.now()}`;
  writeFileSync(tmpFile, JSON.stringify(instances, null, 2), 'utf-8');
  renameSync(tmpFile, INSTANCES_FILE);
}

/**
 * Create a new workflow instance.
 *
 * @param {Object} workflow - Parsed workflow object
 * @returns {Object} Created instance with unique ID
 */
export function createInstance(workflow) {
  const instanceId = randomUUID();
  const steps = workflow.steps.map(step => ({
    id: step.id,
    state: STATES.PENDING,
    startedAt: null,
    completedAt: null,
    output: null,
    error: null,
  }));

  const instance = {
    id: instanceId,
    workflowName: workflow.name,
    startedAt: new Date().toISOString(),
    completedAt: null,
    steps,
  };

  const instances = readInstances();
  instances[instanceId] = instance;
  writeInstancesSync(instances);

  return instance;
}

/**
 * Get a workflow instance by ID.
 *
 * @param {string} instanceId - Instance UUID
 * @returns {Object|null} Instance object or null
 */
export function getInstance(instanceId) {
  const instances = readInstances();
  return instances[instanceId] || null;
}

/**
 * Get all instances, optionally filtered by workflow name.
 *
 * @param {string} [workflowName] - Optional workflow name filter
 * @returns {Array} Array of instance objects
 */
export function listInstances(workflowName) {
  const instances = readInstances();
  const list = Object.values(instances);
  if (workflowName) {
    return list.filter(i => i.workflowName === workflowName);
  }
  return list;
}

/**
 * Transition a step to a new state.
 *
 * @param {string} instanceId - Instance UUID
 * @param {string} stepId - Step ID
 * @param {string} newState - Target state
 * @param {Object} [meta] - Optional metadata (output, error)
 * @returns {Object} Updated step
 * @throws {Error} If transition is invalid
 */
export function transitionStep(instanceId, stepId, newState, meta = {}) {
  if (!Object.values(STATES).includes(newState)) {
    throw new Error(`Invalid state: ${newState}`);
  }

  const instances = readInstances();
  const instance = instances[instanceId];
  if (!instance) throw new Error(`Instance ${instanceId} not found`);

  const step = instance.steps.find(s => s.id === stepId);
  if (!step) throw new Error(`Step ${stepId} not found in instance ${instanceId}`);

  const validTransitions = {
    [STATES.PENDING]: [STATES.READY, STATES.RUNNING],
    [STATES.READY]: [STATES.RUNNING],
    [STATES.RUNNING]: [STATES.COMPLETED, STATES.FAILED, STATES.BLOCKED],
    [STATES.FAILED]: [STATES.READY],
    [STATES.BLOCKED]: [STATES.READY],
  };

  if (!validTransitions[step.state]?.includes(newState)) {
    throw new Error(
      `Invalid transition: ${step.state} → ${newState} for step ${stepId}`
    );
  }

  step.state = newState;
  if (newState === STATES.RUNNING) {
    step.startedAt = new Date().toISOString();
  } else if (newState === STATES.COMPLETED || newState === STATES.FAILED) {
    step.completedAt = new Date().toISOString();
  }

  if (meta.output !== undefined) step.output = meta.output;
  if (meta.error !== undefined) step.error = meta.error;

  const allCompleted = instance.steps.every(s => s.state === STATES.COMPLETED);
  if (allCompleted) {
    instance.completedAt = new Date().toISOString();
  }

  writeInstancesSync(instances);
  return { ...step };
}

/**
 * Mark a step as ready (dependencies met).
 *
 * @param {string} instanceId
 * @param {string} stepId
 * @returns {Object} Updated step
 */
export function markReady(instanceId, stepId) {
  return transitionStep(instanceId, stepId, STATES.READY);
}

/**
 * Mark a step as running.
 *
 * @param {string} instanceId
 * @param {string} stepId
 * @returns {Object} Updated step
 */
export function markRunning(instanceId, stepId) {
  return transitionStep(instanceId, stepId, STATES.RUNNING);
}

/**
 * Mark a step as completed with output.
 *
 * @param {string} instanceId
 * @param {string} stepId
 * @param {string} output - Step output description
 * @returns {Object} Updated step
 */
export function markCompleted(instanceId, stepId, output) {
  return transitionStep(instanceId, stepId, STATES.COMPLETED, { output });
}

/**
 * Mark a step as failed with error.
 *
 * @param {string} instanceId
 * @param {string} stepId
 * @param {string} error - Error message
 * @returns {Object} Updated step
 */
export function markFailed(instanceId, stepId, error) {
  return transitionStep(instanceId, stepId, STATES.FAILED, { error });
}

/**
 * Delete a workflow instance.
 *
 * @param {string} instanceId - Instance UUID
 * @returns {boolean} true if deleted
 */
export function deleteInstance(instanceId) {
  const instances = readInstances();
  if (!instances[instanceId]) return false;
  delete instances[instanceId];
  writeInstancesSync(instances);
  return true;
}
