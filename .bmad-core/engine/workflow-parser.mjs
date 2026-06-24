/**
 * Workflow Parser — reads YAML workflows and builds dependency graphs.
 *
 * @module workflow-parser
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';

const WORKFLOWS_DIR = resolve(import.meta.dirname, '..', 'workflows');

/**
 * Parse a workflow YAML file and validate its structure.
 *
 * @param {string} workflowName - Name of the workflow (filename without .yaml)
 * @returns {Object} Parsed workflow with validated dependency graph
 * @throws {Error} If workflow file is missing or has cycle in dependencies
 */
export function parseWorkflow(workflowName) {
  const filePath = resolve(WORKFLOWS_DIR, `${workflowName}.yaml`);
  const raw = readFileSync(filePath, 'utf-8');
  const doc = yaml.load(raw);

  if (!doc?.name || !doc?.steps || !Array.isArray(doc.steps)) {
    throw new Error(`Invalid workflow structure in ${workflowName}.yaml: missing 'name' or 'steps'`);
  }

  const steps = doc.steps.map((s, idx) => {
    if (!s.id || !s.agent || !s.action) {
      throw new Error(`Step ${idx} in ${workflowName}.yaml missing required fields (id, agent, action)`);
    }
    return {
      id: s.id,
      agent: s.agent,
      action: s.action.trim(),
      deliverables: s.deliverable || null,
      dependsOn: s.dependsOn || [],
      validationScripts: s.validationScripts || [],
      schemaRef: s.schemaRef || null,
    };
  });

  validateDependencyGraph(steps, workflowName);

  return {
    name: doc.name,
    description: doc.description || '',
    version: doc.version || '1.0.0',
    steps,
  };
}

/**
 * Validate that the dependency graph has no cycles using DFS.
 *
 * @param {Array} steps - Array of step objects
 * @param {string} workflowName - For error messages
 * @throws {Error} If cycle is detected
 */
function validateDependencyGraph(steps, workflowName) {
  const stepIds = new Set(steps.map(s => s.id));
  const visited = new Set();
  const inStack = new Set();

  for (const step of steps) {
    for (const dep of step.dependsOn) {
      if (!stepIds.has(dep)) {
        throw new Error(
          `Workflow ${workflowName}: step '${step.id}' depends on unknown step '${dep}'`
        );
      }
    }
  }

  function dfs(stepId) {
    if (inStack.has(stepId)) {
      throw new Error(`Workflow ${workflowName}: dependency cycle detected involving step '${stepId}'`);
    }
    if (visited.has(stepId)) return;

    visited.add(stepId);
    inStack.add(stepId);

    const step = steps.find(s => s.id === stepId);
    if (step) {
      for (const dep of step.dependsOn) {
        dfs(dep);
      }
    }

    inStack.delete(stepId);
  }

  for (const step of steps) {
    dfs(step.id);
  }
}

/**
 * Get execution order using topological sort.
 *
 * @param {Object} workflow - Parsed workflow object
 * @returns {string[]} Step IDs in valid execution order
 */
export function getExecutionOrder(workflow) {
  const steps = workflow.steps;
  const inDegree = new Map();
  const adjacency = new Map();

  for (const step of steps) {
    inDegree.set(step.id, 0);
    adjacency.set(step.id, []);
  }

  for (const step of steps) {
    for (const dep of step.dependsOn) {
      adjacency.get(dep).push(step.id);
      inDegree.set(step.id, inDegree.get(step.id) + 1);
    }
  }

  const queue = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const order = [];
  while (queue.length > 0) {
    const id = queue.shift();
    order.push(id);

    for (const neighbor of adjacency.get(id)) {
      inDegree.set(neighbor, inDegree.get(neighbor) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (order.length !== steps.length) {
    throw new Error(`Workflow ${workflow.name}: failed to produce valid execution order`);
  }

  return order;
}

/**
 * Get steps that are ready to execute (all dependencies completed).
 *
 * @param {Object} workflow - Parsed workflow object
 * @param {Set<string>} completedSteps - Set of completed step IDs
 * @returns {Array} Steps ready to execute
 */
export function getReadySteps(workflow, completedSteps) {
  return workflow.steps.filter(step => {
    if (completedSteps.has(step.id)) return false;
    return step.dependsOn.every(dep => completedSteps.has(dep));
  });
}
