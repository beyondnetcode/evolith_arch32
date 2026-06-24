#!/usr/bin/env node

/**
 * Orchestrate — main entry point for the BMAD Agent Orchestration Engine.
 *
 * Usage: node .bmad-core/engine/orchestrate.mjs <workflow-name> [--dry-run] [--status <instance-id>]
 *
 * @module orchestrate
 */

import { parseWorkflow, getExecutionOrder, getReadySteps } from './workflow-parser.mjs';
import {
  createInstance, getInstance, listInstances,
  markReady, markRunning, markCompleted, markFailed,
  STATES
} from './state-machine.mjs';
import { executeStep } from './step-executor.mjs';
import { registerArtifacts, getArtifactsForStep } from './artifact-registry.mjs';
import { validateHandoff, enforceHandoff, checkCompletion, generateHandoffReport } from './handoff-enforcer.mjs';

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
BMAD Agent Orchestration Engine v1.0.0

Usage:
  node .bmad-core/engine/orchestrate.mjs <workflow-name> [options]

Options:
  --dry-run           Parse workflow and show execution plan without running
  --status <id>       Show status of a workflow instance
  --list              List all workflow instances
  --report <id>       Generate handoff report for an instance
  --help, -h          Show this help message

Examples:
  node .bmad-core/engine/orchestrate.mjs governance-gap --dry-run
  node .bmad-core/engine/orchestrate.mjs development
  node .bmad-core/engine/orchestrate.mjs --status <instance-id>
  node .bmad-core/engine/orchestrate.mjs --list
`);
}

function parseArgs(args) {
  const options = {
    workflowName: null,
    dryRun: false,
    status: null,
    list: false,
    report: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--status':
        options.status = args[++i];
        break;
      case '--list':
        options.list = true;
        break;
      case '--report':
        options.report = args[++i];
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (!args[i].startsWith('--')) {
          options.workflowName = args[i];
        }
    }
  }

  return options;
}

function printStep(step, status = 'pending') {
  const icons = {
    pending: '○',
    ready: '◎',
    running: '◉',
    completed: '●',
    failed: '✗',
    blocked: '⊘',
  };
  console.log(`  ${icons[status] || '?'} ${step.id.padEnd(25)} [${step.agent}]`);
}

function printWorkflowPlan(workflow) {
  console.log(`\nWorkflow: ${workflow.name}`);
  console.log(`Description: ${workflow.description}`);
  console.log(`Version: ${workflow.version}`);
  console.log(`Steps: ${workflow.steps.length}\n`);

  const order = getExecutionOrder(workflow);
  console.log('Execution Order:');
  for (const stepId of order) {
    const step = workflow.steps.find(s => s.id === stepId);
    const deps = step.dependsOn.length > 0 ? ` (depends on: ${step.dependsOn.join(', ')})` : '';
    printStep(step);
    if (deps) {
      console.log(`    └─${deps}`);
    }
  }
  console.log();
}

function printInstanceStatus(instance) {
  console.log(`\nInstance: ${instance.id}`);
  console.log(`Workflow: ${instance.workflowName}`);
  console.log(`Started: ${instance.startedAt}`);
  console.log(`Completed: ${instance.completedAt || 'in progress'}\n`);

  console.log('Steps:');
  for (const step of instance.steps) {
    printStep(step, step.state);
    if (step.output) {
      console.log(`    └─ Output: ${step.output.substring(0, 80)}${step.output.length > 80 ? '...' : ''}`);
    }
    if (step.error) {
      console.log(`    └─ Error: ${step.error.substring(0, 80)}${step.error.length > 80 ? '...' : ''}`);
    }
  }
  console.log();
}

async function runWorkflow(workflowName) {
  console.log(`\n🚀 Starting workflow: ${workflowName}\n`);

  let workflow;
  try {
    workflow = parseWorkflow(workflowName);
  } catch (err) {
    console.error(`❌ Failed to parse workflow: ${err.message}`);
    process.exit(1);
  }

  const instance = createInstance(workflow);
  console.log(`📋 Created instance: ${instance.id}\n`);

  const completedSteps = new Set();
  let maxIterations = 100;

  while (completedSteps.size < workflow.steps.length && maxIterations-- > 0) {
    const readySteps = getReadySteps(workflow, completedSteps);

    if (readySteps.length === 0) {
      const pending = workflow.steps.filter(s => !completedSteps.has(s.id));
      if (pending.length === 0) break;

      console.error('❌ No ready steps available. Possible deadlock or failed dependencies.');
      for (const step of pending) {
        console.error(`   - ${step.id} (depends on: ${step.dependsOn.join(', ') || 'none'})`);
      }
      process.exit(1);
    }

    for (const step of readySteps) {
      console.log(`▶️  Executing: ${step.id} [${step.agent}]`);

      const handoffResult = enforceHandoff(instance.id, step.id, workflow);
      if (!handoffResult.enforced) {
        console.error(`   ❌ Handoff validation failed:`);
        for (const err of handoffResult.validation.errors) {
          console.error(`      - ${err}`);
        }
        markFailed(instance.id, step.id, handoffResult.validation.errors.join('; '));
        continue;
      }

      markRunning(instance.id, step.id);

      const result = executeStep(step, {
        instanceId: instance.id,
        workflowName,
      });

      if (result.success) {
        registerArtifacts(instance.id, step.id, result.deliverables);
        markCompleted(instance.id, step.id, result.output || 'Completed successfully');
        completedSteps.add(step.id);
        console.log(`   ✅ Completed (${result.metrics.duration}ms)`);
        if (result.deliverables.length > 0) {
          console.log(`   📦 Deliverables: ${result.deliverables.join(', ')}`);
        }
      } else {
        markFailed(instance.id, step.id, result.output || 'Unknown error');
        console.error(`   ❌ Failed: ${result.output}`);
      }

      console.log();
    }
  }

  const completion = checkCompletion(instance.id);
  if (completion.completed) {
    console.log('🎉 Workflow completed successfully!\n');
  } else {
    console.log('⚠️  Workflow incomplete. Failed or pending steps:');
    for (const step of completion.pendingSteps) {
      console.log(`   - ${step.id}: ${step.state}`);
    }
    for (const step of completion.failedSteps) {
      console.log(`   - ${step.id}: ${step.error}`);
    }
    console.log();
  }

  return instance.id;
}

function runDryRun(workflowName) {
  let workflow;
  try {
    workflow = parseWorkflow(workflowName);
  } catch (err) {
    console.error(`❌ Failed to parse workflow: ${err.message}`);
    process.exit(1);
  }

  printWorkflowPlan(workflow);

  const instance = createInstance(workflow);
  console.log(`📋 Dry run instance created: ${instance.id}`);
  console.log('   (No steps executed in dry-run mode)\n');
}

async function main() {
  const options = parseArgs(args);

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  if (options.list) {
    const instances = listInstances();
    if (instances.length === 0) {
      console.log('No workflow instances found.\n');
    } else {
      console.log(`\nWorkflow Instances (${instances.length}):\n`);
      for (const instance of instances) {
        const completed = instance.steps.filter(s => s.state === STATES.COMPLETED).length;
        const total = instance.steps.length;
        console.log(`  ${instance.id}`);
        console.log(`    Workflow: ${instance.workflowName}`);
        console.log(`    Progress: ${completed}/${total} steps`);
        console.log(`    Started: ${instance.startedAt}`);
        console.log();
      }
    }
    process.exit(0);
  }

  if (options.status) {
    const instance = getInstance(options.status);
    if (!instance) {
      console.error(`❌ Instance ${options.status} not found`);
      process.exit(1);
    }
    printInstanceStatus(instance);
    process.exit(0);
  }

  if (options.report) {
    const workflow = parseWorkflow('governance-gap');
    const report = generateHandoffReport(options.report, workflow);
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  if (!options.workflowName) {
    console.error('❌ Workflow name required. Use --help for usage information.');
    process.exit(1);
  }

  if (options.dryRun) {
    runDryRun(options.workflowName);
    process.exit(0);
  }

  await runWorkflow(options.workflowName);
}

main().catch(err => {
  console.error(`\n❌ Fatal error: ${err.message}`);
  process.exit(1);
});
