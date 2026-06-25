#!/usr/bin/env node
// Fails when the generated executive governance summary drifts from canonical evidence.

import { spawnSync } from 'child_process';
import path from 'path';

const root = process.cwd();
const script = path.join(root, '.harness/scripts/generate-executive-summary.mjs');
const result = spawnSync(process.execPath, [script, '--check'], {
  cwd: root,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
