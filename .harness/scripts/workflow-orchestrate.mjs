#!/usr/bin/env node

/**
 * Workflow Orchestrate CLI — thin wrapper around the BMAD Agent Orchestration Engine.
 *
 * Delegates to `.bmad-core/engine/orchestrate.mjs` for all execution logic.
 *
 * Usage: node .harness/scripts/workflow-orchestrate.mjs <workflow-name> [options]
 *
 * @module workflow-orchestrate
 */

import { execFileSync } from 'node:child_process';
import { resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const enginePath = resolvePath(__dirname, '..', '..', '.bmad-core', 'engine', 'orchestrate.mjs');

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(`
Workflow Orchestrate CLI v1.0.0

Thin wrapper for the BMAD Agent Orchestration Engine.

Usage:
  node .harness/scripts/workflow-orchestrate.mjs <workflow-name> [options]

Options:
  --dry-run           Parse workflow and show execution plan without running
  --status <id>       Show status of a workflow instance
  --list              List all workflow instances
  --report <id>       Generate handoff report for an instance
  --help, -h          Show this help message

Examples:
  node .harness/scripts/workflow-orchestrate.mjs governance-gap --dry-run
  node .harness/scripts/workflow-orchestrate.mjs development
  node .harness/scripts/workflow-orchestrate.mjs --list
`);
  process.exit(0);
}

try {
  execFileSync('node', [enginePath, ...args], { stdio: 'inherit' });
} catch (err) {
  process.exit(err.status ?? 1);
}
