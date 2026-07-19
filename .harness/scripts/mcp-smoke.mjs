#!/usr/bin/env node
/**
 * MCP smoke — THIN SHIM. Contains no protocol logic.
 *
 * The canonical implementation is src/sdk/cli/examples/mcp-test.js; this file
 * only execs it and forwards the exit code. Evidence
 * (.harness/evidence/mcp-smoke.evidence.json, consumed by McpRuleHandler for
 * rules MCP-01/02/03) is written by the canonical implementation, not here.
 *
 * Why this file still exists: the path `.harness/scripts/mcp-smoke.mjs` is cited
 * by ADR reference/core/architecture/adrs/ai-augmented/0002-mcp-integration-protocol.md
 * and by reference/core/control-center/evidence/gap-closure-evidence.json, and
 * by the skip message in core-domain's McpRuleHandler. Those are historical
 * records, so the path is preserved rather than rewritten — the same precedent
 * applied when guard 28 was fixed by renaming its CI step, not its file.
 *
 * Until this shim was introduced it carried a second, divergent copy of the
 * smoke that spawned `evolith-cli mcp serve` — a subcommand deleted in dc0b9667
 * (2026-06-30) — so every run died with `unknown command 'mcp'`.
 *
 * Usage:
 *   node .harness/scripts/mcp-smoke.mjs
 *
 * Equivalent entry point (used by CI, .github/workflows/sdk-cli-ci.yml job
 * `e2e-tests`), which additionally rebuilds the CLI first:
 *   npm run mcp:smoke --workspace sdk/cli
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const canonical = path.join(root, 'src', 'sdk', 'cli', 'examples', 'mcp-test.js');

console.log(`[shim] delegating to ${path.relative(root, canonical)}`);

const { status } = spawnSync(process.execPath, [canonical], { stdio: 'inherit' });
process.exit(status ?? 1);
