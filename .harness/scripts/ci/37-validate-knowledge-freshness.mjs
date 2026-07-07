#!/usr/bin/env node
/**
 * 37-validate-knowledge-freshness.mjs — CI gate for the Knowledge OS.
 *
 * Wraps the local resolver's --freshness check so it runs in the pipeline:
 *   - reviewBy in the past          -> STALE (warning, NEVER blocks the branch)
 *   - oracle drift (missing file /  -> FAIL (blocks the PR that introduced it)
 *     symbol / referenced test)
 *
 * Single source of truth: .harness/scripts/knowledge-resolve.mjs --freshness.
 * The Core never runs the oracle tests here — it verifies the referenced test
 * still exists; CI (this pipeline) runs the actual test suite separately.
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync('node', ['.harness/scripts/knowledge-resolve.mjs', '--freshness'], {
  stdio: 'inherit',
  cwd: process.cwd(),
});

process.exit(result.status ?? 1);
