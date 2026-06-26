#!/usr/bin/env node

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const script = path.join(rootDir, '.harness/playbooks/sdlc-deep-audit.mjs');
const args = process.argv.slice(2);

const result = spawnSync('node', [script, ...args], { stdio: 'inherit', cwd: rootDir });
process.exit(result.status ?? 1);
