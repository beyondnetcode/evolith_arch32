/**
 * Handoff Enforcer — validates step outputs before allowing next step to proceed.
 *
 * @module handoff-enforcer
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getInstance, transitionStep, STATES } from './state-machine.mjs';
import { validateArtifacts, getArtifactsForStep } from './artifact-registry.mjs';

/**
 * Validate that a step's handoff requirements are met before executing the next step.
 *
 * @param {string} instanceId - Workflow instance ID
 * @param {string} stepId - Step to validate before execution
 * @param {Object} workflow - Parsed workflow object
 * @returns {Object} Validation result { valid, errors, warnings }
 */
export function validateHandoff(instanceId, stepId, workflow) {
  const instance = getInstance(instanceId);
  if (!instance) {
    return { valid: false, errors: [`Instance ${instanceId} not found`], warnings: [] };
  }

  const step = workflow.steps.find(s => s.id === stepId);
  if (!step) {
    return { valid: false, errors: [`Step ${stepId} not found in workflow`], warnings: [] };
  }

  const instanceStep = instance.steps.find(s => s.id === stepId);
  if (!instanceStep) {
    return { valid: false, errors: [`Step ${stepId} not found in instance`], warnings: [] };
  }

  const errors = [];
  const warnings = [];

  // Check 1: Previous step completed successfully
  for (const depId of step.dependsOn) {
    const depInstanceStep = instance.steps.find(s => s.id === depId);
    if (!depInstanceStep) {
      errors.push(`Dependency step '${depId}' not found in instance`);
      continue;
    }
    if (depInstanceStep.state !== STATES.COMPLETED) {
      errors.push(`Dependency step '${depId}' is not completed (current state: ${depInstanceStep.state})`);
    }
  }

  // Check 2: Required deliverables exist
  if (step.deliverables) {
    const depStep = workflow.steps.find(s => s.id === step.dependsOn[0]);
    if (depStep) {
      const depArtifacts = getArtifactsForStep(instanceId, depStep.id);
      if (depArtifacts.length === 0) {
        warnings.push(`No artifacts registered for dependency step '${depStep.id}'`);
      } else {
        for (const artifact of depArtifacts) {
          const fullPath = resolve(import.meta.dirname, '..', '..', artifact.path);
          if (!existsSync(fullPath)) {
            warnings.push(`Deliverable '${artifact.path}' from step '${depStep.id}' does not exist on disk`);
          }
        }
      }
    }
  }

  // Check 3: Schema validation if schemaRef provided
  if (step.schemaRef) {
    const schemaPath = resolve(import.meta.dirname, '..', '..', step.schemaRef);
    if (!existsSync(schemaPath)) {
      warnings.push(`Schema reference '${step.schemaRef}' not found`);
    }
  }

  // Check 4: Validation scripts pass if declared
  if (step.validationScripts?.length > 0) {
    warnings.push(`${step.validationScripts.length} validation scripts declared - will be run during execution`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Enforce handoff and transition step to ready if valid.
 *
 * @param {string} instanceId - Workflow instance ID
 * @param {string} stepId - Step to enforce
 * @param {Object} workflow - Parsed workflow object
 * @returns {Object} Enforcement result { enforced, validation }
 */
export function enforceHandoff(instanceId, stepId, workflow) {
  const validation = validateHandoff(instanceId, stepId, workflow);

  if (validation.valid) {
    try {
      transitionStep(instanceId, stepId, STATES.READY);
      return { enforced: true, validation };
    } catch (err) {
      validation.errors.push(`Failed to transition to ready: ${err.message}`);
      return { enforced: false, validation };
    }
  }

  return { enforced: false, validation };
}

/**
 * Check if a workflow instance is fully completed.
 *
 * @param {string} instanceId - Workflow instance ID
 * @returns {Object} Completion status { completed, pendingSteps, failedSteps }
 */
export function checkCompletion(instanceId) {
  const instance = getInstance(instanceId);
  if (!instance) {
    return { completed: false, error: 'Instance not found' };
  }

  const pendingSteps = instance.steps
    .filter(s => s.state !== STATES.COMPLETED)
    .map(s => ({ id: s.id, state: s.state }));

  const failedSteps = instance.steps
    .filter(s => s.state === STATES.FAILED)
    .map(s => ({ id: s.id, error: s.error }));

  return {
    completed: pendingSteps.length === 0,
    pendingSteps,
    failedSteps,
  };
}

/**
 * Generate a handoff report for a workflow instance.
 *
 * @param {string} instanceId - Workflow instance ID
 * @param {Object} workflow - Parsed workflow object
 * @returns {Object} Handoff report
 */
export function generateHandoffReport(instanceId, workflow) {
  const instance = getInstance(instanceId);
  if (!instance) {
    return { error: 'Instance not found' };
  }

  const steps = workflow.steps.map(step => {
    const instanceStep = instance.steps.find(s => s.id === step.id);
    const validation = validateHandoff(instanceId, step.id, workflow);

    return {
      id: step.id,
      agent: step.agent,
      state: instanceStep?.state || 'unknown',
      handoffValid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  });

  return {
    instanceId,
    workflowName: workflow.name,
    steps,
    overallValid: steps.every(s => s.handoffValid || s.state === STATES.COMPLETED),
  };
}
