/**
 * Step Executor — dispatches workflow steps to agents or CI scripts.
 *
 * @module step-executor
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const HARNES_DIR = resolve(import.meta.dirname, '..', '..', '.harness', 'scripts');

const AGENT_PROMPTS = {
  analyst: (action) => `
You are the Analyst agent. Execute the following analysis task:

${action}

Output your findings to the designated deliverable path. Ensure all sections are complete
and follow the repository's documentation standards.
`,

  pm: (action) => `
You are the Product Manager agent. Execute the following product definition task:

${action}

Output your deliverable to the designated path. Ensure alignment with functional specs
and repository governance standards.
`,

  architect: (action) => `
You are the Architect agent. Execute the following architecture task:

${action}

Output your technical architecture document to the designated path. Follow Clean Architecture
principles and ensure dual-engine parity where applicable.
`,

  sm: (action) => `
You are the Scrum Master agent. Execute the following task breakdown:

${action}

Output your task breakdown to the designated path. Follow the GT task pattern for governance gaps.
`,

  dev: (action) => `
You are the Developer agent. Execute the following implementation task:

${action}

Implement all required artifacts. Follow existing code conventions and ensure test coverage.
`,

  qa: (action, validationScripts) => `
You are the QA agent. Execute the following validation task:

${action}

Run all validation scripts and document results. Ensure zero drift between Native and OPA verdicts.
${validationScripts?.length ? `Scripts to run: ${validationScripts.join(', ')}` : ''}
`,

  'qa-contracts': (action, validationScripts) => `
You are the QA-Contracts specialist (.bmad-core/agents/qa-contracts.md) — Native↔OPA parity & contract conformance.

${action}

Enforce R-25 dual-engine parity (zero drift) and fail-closed contract conformance; any drift blocks merge.
${validationScripts?.length ? `Scripts to run: ${validationScripts.join(', ')}` : ''}
`,

  'qa-security': (action, validationScripts) => `
You are the QA-Security specialist (.bmad-core/agents/qa-security.md) — OWASP, ABAC fail-closed, shell-injection, SSRF, agent sandbox.

${action}

Treat any confirmed vulnerability as merge-blocking. Report PASS/FAIL with evidence.
${validationScripts?.length ? `Scripts to run: ${validationScripts.join(', ')}` : ''}
`,

  'qa-e2e': (action, validationScripts) => `
You are the QA-E2E specialist (.bmad-core/agents/qa-e2e.md) — governance-flow E2E + cross-surface compatibility.

${action}

Drive phase→gate→artifact→verdict against real fixtures; any failed scenario blocks merge.
${validationScripts?.length ? `Scripts to run: ${validationScripts.join(', ')}` : ''}
`,

  'qa-unit': (action, validationScripts) => `
You are the QA-Unit specialist (.bmad-core/agents/qa-unit.md) — unit + integration coverage across all workspaces.

${action}

A failing test or coverage below threshold blocks merge. Report per-workspace results.
${validationScripts?.length ? `Scripts to run: ${validationScripts.join(', ')}` : ''}
`,

  'qa-docs': (action, validationScripts) => `
You are the QA-Docs specialist (.bmad-core/agents/qa-docs.md) — bilingual parity + doc/governance integrity.

${action}

A bilingual mismatch, doc-validation failure, or tracking/maturity drift blocks merge.
${validationScripts?.length ? `Scripts to run: ${validationScripts.join(', ')}` : ''}
`,

  devops: (action) => `
You are the DevOps agent. Execute the following operations task:

${action}

Update tracking files and record evidence. Ensure closure criteria are met.
`,

  docs: (action) => `
You are the Docs agent. Execute the following documentation task:

${action}

Verify bilingual parity on all affected files. Update MASTER_INDEX.md if needed.
`,
};

/**
 * Execute a workflow step by dispatching to the appropriate agent.
 *
 * @param {Object} step - Step object from parsed workflow
 * @param {Object} context - Execution context (instanceId, workflowName)
 * @returns {Object} Execution result { success, deliverables, metrics }
 */
export function executeStep(step, context) {
  const startTime = Date.now();
  const result = {
    success: false,
    deliverables: [],
    metrics: { startTime: new Date().toISOString(), duration: 0 },
  };

  try {
    const agentType = step.agent.toLowerCase();

    if ((agentType === 'qa' || agentType.startsWith('qa-')) && step.validationScripts?.length > 0) {
      return executeValidationScripts(step, context, result, startTime);
    }

    const prompt = generateAgentPrompt(step);
    result.deliverables = extractDeliverablePaths(step.deliverables);
    result.metrics.agentType = agentType;
    result.metrics.promptLength = prompt.length;
    result.success = true;
    result.metrics.duration = Date.now() - startTime;
    result.output = `Agent ${agentType} prompt generated. Deliverables: ${result.deliverables.join(', ') || 'none specified'}`;

    return result;
  } catch (err) {
    result.success = false;
    result.output = err.message;
    result.metrics.duration = Date.now() - startTime;
    return result;
  }
}

/**
 * Generate the agent prompt for a step.
 *
 * @param {Object} step - Step object
 * @returns {string} Formatted prompt
 */
function generateAgentPrompt(step) {
  const generator = AGENT_PROMPTS[step.agent.toLowerCase()];
  if (!generator) {
    return `Execute: ${step.action}`;
  }
  return generator(step.action, step.validationScripts);
}

/**
 * Execute validation scripts for QA steps.
 *
 * @param {Object} step - Step with validationScripts
 * @param {Object} context - Execution context
 * @param {Object} result - Result object to populate
 * @param {number} startTime - Start timestamp
 * @returns {Object} Updated result
 */
function executeValidationScripts(step, context, result, startTime) {
  const scriptResults = [];

  for (const script of step.validationScripts) {
    const scriptPath = resolve(HARNES_DIR, script);
    if (!existsSync(scriptPath)) {
      scriptResults.push({ script, status: 'skipped', reason: 'not found' });
      continue;
    }

    try {
      const output = execSync(`node "${scriptPath}"`, {
        encoding: 'utf-8',
        timeout: 60000,
        cwd: resolve(import.meta.dirname, '..', '..'),
      });
      scriptResults.push({ script, status: 'pass', output: output.trim() });
    } catch (err) {
      scriptResults.push({ script, status: 'fail', error: err.message });
    }
  }

  result.metrics.duration = Date.now() - startTime;
  result.metrics.scriptResults = scriptResults;
  result.success = scriptResults.every(r => r.status !== 'fail');
  result.output = scriptResults.map(r => `${r.script}: ${r.status}`).join('; ');
  result.deliverables = step.deliverables ? extractDeliverablePaths(step.deliverables) : [];

  return result;
}

/**
 * Extract file paths from a deliverables string.
 *
 * @param {string} deliverablesStr - Deliverables description
 * @returns {Array<string>} Extracted file paths
 */
function extractDeliverablePaths(deliverablesStr) {
  if (!deliverablesStr) return [];
  const pathPattern = /`([^`]+\.[a-z]+)`/g;
  const paths = [];
  let match;
  while ((match = pathPattern.exec(deliverablesStr)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

/**
 * Get a human-readable summary of agent type capabilities.
 *
 * @param {string} agentType - Agent type name
 * @returns {string} Description of agent's role
 */
export function getAgentDescription(agentType) {
  const descriptions = {
    analyst: 'Requirements analysis and functional specification',
    pm: 'Product requirements and UX definition',
    architect: 'Technical architecture and design patterns',
    sm: 'Task breakdown and sprint planning',
    dev: 'Implementation and code development',
    qa: 'Quality assurance and validation',
    devops: 'Operations, CI/CD, and evidence recording',
    docs: 'Documentation and bilingual parity',
  };
  return descriptions[agentType.toLowerCase()] || 'Unknown agent type';
}
