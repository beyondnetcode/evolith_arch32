/**
 * Workflow Orchestrator — main entry point for BMAD workflow execution.
 *
 * @module orchestrator
 */

import { parseWorkflow, getExecutionOrder } from './workflow-parser.mjs';
import {
  createInstance,
  getInstance,
  listInstances,
  transitionStep,
  STATES,
} from './state-machine.mjs';
import { executeStep } from './step-executor.mjs';
import {
  registerArtifacts,
  validateArtifacts,
  getArtifactsForInstance,
} from './artifact-registry.mjs';
import { validateHandoff, checkCompletion } from './handoff-enforcer.mjs';

export class WorkflowOrchestrator {
  constructor(options = {}) {
    this.dryRun = options.dryRun ?? false;
    this.verbose = options.verbose ?? false;
    this.resumeInstanceId = options.resumeInstanceId ?? null;
  }

  async run(workflowName) {
    const workflow = parseWorkflow(workflowName);
    const executionOrder = getExecutionOrder(workflow);

    let instance;
    if (this.resumeInstanceId) {
      instance = getInstance(this.resumeInstanceId);
      if (!instance) {
        throw new Error(`Instance ${this.resumeInstanceId} not found`);
      }
      if (instance.completedAt) {
        return {
          success: true,
          instanceId: this.resumeInstanceId,
          status: 'already_completed',
          message: 'Workflow instance already completed',
        };
      }
    } else {
      instance = createInstance(workflow);
    }

    const results = {
      instanceId: instance.id,
      workflowName: workflow.name,
      steps: [],
      startedAt: instance.startedAt,
    };

    for (const stepId of executionOrder) {
      const step = workflow.steps.find(s => s.id === stepId);
      const instanceStep = instance.steps.find(s => s.id === stepId);

      if (instanceStep.state === STATES.COMPLETED) {
        results.steps.push({
          id: stepId,
          status: 'skipped',
          reason: 'already completed',
        });
        continue;
      }

      const handoff = validateHandoff(instance.id, stepId, workflow);
      if (!handoff.valid) {
        results.steps.push({
          id: stepId,
          status: 'blocked',
          errors: handoff.errors,
          warnings: handoff.warnings,
        });
        transitionStep(instance.id, stepId, STATES.BLOCKED, {
          error: handoff.errors.join('; '),
        });
        continue;
      }

      if (handoff.warnings.length > 0 && this.verbose) {
        results.steps.push({
          id: stepId,
          warnings: handoff.warnings,
        });
      }

      if (this.dryRun) {
        const dryResult = this.simulateStep(step, workflow);
        results.steps.push({
          id: stepId,
          status: 'dry_run',
          ...dryResult,
        });
        continue;
      }

      transitionStep(instance.id, stepId, STATES.READY);

      try {
        transitionStep(instance.id, stepId, STATES.RUNNING);

        const execResult = executeStep(step, {
          instanceId: instance.id,
          workflowName: workflow.name,
        });

        if (step.deliverables) {
          const deliverablePaths = this.extractDeliverablePaths(step.deliverables);
          if (deliverablePaths.length > 0) {
            registerArtifacts(instance.id, stepId, deliverablePaths);
            const validation = validateArtifacts(instance.id, stepId, deliverablePaths);
            if (!validation.valid) {
              execResult.warnings = validation.missing.map(p => `Missing deliverable: ${p}`);
            }
          }
        }

        if (execResult.success) {
          transitionStep(instance.id, stepId, STATES.COMPLETED, {
            output: execResult.output,
          });
        } else {
          transitionStep(instance.id, stepId, STATES.FAILED, {
            error: execResult.output,
          });
        }

        results.steps.push({
          id: stepId,
          status: execResult.success ? 'completed' : 'failed',
          output: execResult.output,
          deliverables: execResult.deliverables,
          duration: execResult.metrics?.duration,
        });
      } catch (err) {
        transitionStep(instance.id, stepId, STATES.FAILED, {
          error: err.message,
        });
        results.steps.push({
          id: stepId,
          status: 'failed',
          error: err.message,
        });
      }
    }

    const completion = checkCompletion(instance.id);
    results.completed = completion.completed;
    results.failedSteps = completion.failedSteps;

    if (completion.completed) {
      results.status = 'completed';
    } else if (completion.failedSteps.length > 0) {
      results.status = 'failed';
    } else {
      results.status = 'in_progress';
    }

    return results;
  }

  simulateStep(step, workflow) {
    const agentPrompts = {
      analyst: 'Requirements analysis and functional specification',
      pm: 'Product requirements and UX definition',
      architect: 'Technical architecture and design patterns',
      sm: 'Task breakdown and sprint planning',
      dev: 'Implementation and code development',
      qa: 'Quality assurance and validation',
      devops: 'Operations, CI/CD, and evidence recording',
      docs: 'Documentation and bilingual parity',
    };

    return {
      agent: step.agent,
      agentRole: agentPrompts[step.agent] || 'Unknown agent',
      action: step.action.substring(0, 100) + (step.action.length > 100 ? '...' : ''),
      deliverables: step.deliverables,
      dependsOn: step.dependsOn,
      validationScripts: step.validationScripts,
    };
  }

  extractDeliverablePaths(deliverablesStr) {
    if (!deliverablesStr) return [];
    const pathPattern = /`([^`]+\.[a-z]+)`/g;
    const paths = [];
    let match;
    while ((match = pathPattern.exec(deliverablesStr)) !== null) {
      paths.push(match[1]);
    }
    return paths;
  }
}

import { readdirSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

export function listWorkflows() {
  const workflowsDir = resolvePath(import.meta.dirname, '..', 'workflows');
  const files = readdirSync(workflowsDir);
  return files
    .filter(f => f.endsWith('.yaml'))
    .map(f => f.replace('.yaml', ''));
}
