#!/usr/bin/env node

/**
 * DEPRECATED — Compatibility alias.
 *
 * Use the new entry points instead:
 *   run-evolith-audit.mjs       — Wilson architectural / BMAD prompt audit
 *   run-evolith-topology.mjs    — Topology compliance audit
 *   run-evolith-deep.mjs        — SDLC Deep Audit (8-dimension)
 *
 * This script detects the intent and delegates to the appropriate new script.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const args = process.argv.slice(2);
const isTopology = args.includes('--topology');
const isDeep = args.includes('--deep');
const isBmad = args.includes('--bmad');

let targetScript;
let extraArgs;

if (isTopology) {
  targetScript = 'run-evolith-topology.mjs';
  extraArgs = args.filter(a => a !== '--topology');
} else if (isDeep) {
  targetScript = 'run-evolith-deep.mjs';
  extraArgs = args.filter(a => a !== '--deep');
} else {
  targetScript = 'run-evolith-audit.mjs';
  extraArgs = args;
}

const scriptPath = path.join(rootDir, '.harness/scripts', targetScript);

console.warn(`⚠️  [run-wilson-audit] DEPRECATED — use ${targetScript} instead. Delegating...\n`);

const result = spawnSync('node', [scriptPath, ...extraArgs], { stdio: 'inherit', cwd: rootDir });
process.exit(result.status ?? 1);
