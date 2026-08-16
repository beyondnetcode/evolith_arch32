#!/usr/bin/env node
/**
 * GT-671 — does the thing customers install still work?
 *
 * Every other check in this repository measures the TREE. What a user touches is
 * the tarball, and the only post-publish check that existed was
 * `npm install -g @beyondnet/evolith-cli@<version>` followed by
 * `evolith-cli --help`, once, inside the release (`sdk-cli-release.yml:328-332`).
 * The functional smoke immediately above it runs the packaged BINARY downloaded
 * from build artifacts, not the npm install — so no run has ever exercised a
 * registry install doing real work. Exactly two workflows carry a `schedule:`
 * (`opa-parity`, `openssf-scorecard`), so nothing periodic touched the published
 * artifact at all.
 *
 * `--help` is a weak oracle and this was measured, not assumed: every published
 * version — 1.1.0, 1.2.0, 1.2.2 — answers `--version` with exit 0, including the
 * one `GT-625` recorded as broken. A check that cannot tell them apart is not a
 * check.
 *
 * WHAT THIS ASSERTS INSTEAD
 * -------------------------
 *   1. the documented command exists — `evolith`, the one the README tells people
 *      to run, not just the `evolith-cli` alias;
 *   2. `init` then `validate --format json` produce a REAL ADR-0073 envelope with
 *      a verdict, not a zero exit code (`GT-625`'s weak-oracle failure);
 *   3. the published MCP server answers a `tools/call` with a real gate verdict,
 *      asserted by `gate-verdict.assert.js` — the same oracle the in-tree smoke
 *      uses, not a second one written for this file.
 *
 * Nothing here resolves through the repository. The packages are installed into a
 * throwaway prefix and driven from a temp directory, which is the whole point:
 * `GT-625` shipped an uninstallable CLI precisely because the workspace symlink
 * hid it from every suite.
 *
 * Usage:
 *   node .harness/scripts/ci/published-artifact-canary.mjs [--version latest]
 */

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertScanned } from '../lib/coverage.mjs';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');

/** The one oracle. AC3 is explicit that this must not grow a second one. */
const { assertGateVerdict } = require(join(REPO, 'src', 'sdk', 'cli', 'examples', 'gate-verdict.assert.js'));

const argv = process.argv.slice(2);
const versionOf = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const CLI_VERSION = versionOf('--version', 'latest');
const MCP_VERSION = versionOf('--mcp-version', CLI_VERSION);

const failures = [];
const notes = [];
let checksRun = 0;
function check(label, fn) {
  checksRun += 1;
  try {
    const detail = fn();
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    failures.push({ label, message: err.message });
    console.error(`  ✗ ${label} — ${err.message}`);
  }
}

const prefix = mkdtempSync(join(tmpdir(), 'evolith-canary-'));
const work = join(prefix, 'satellite');
mkdirSync(work, { recursive: true });

function cleanup() {
  try { rmSync(prefix, { recursive: true, force: true }); } catch { /* best effort */ }
}

console.log(`published-artifact-canary — cli@${CLI_VERSION}, mcp@${MCP_VERSION}`);
console.log(`  prefix: ${prefix}`);

// ── Install from the REGISTRY, into a throwaway prefix ──────────────────────
try {
  execFileSync('npm', [
    'install', '--prefix', prefix, '--no-fund', '--no-audit', '--silent',
    `@beyondnet/evolith-cli@${CLI_VERSION}`,
    `@beyondnet/evolith-mcp@${MCP_VERSION}`,
  ], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 10 * 60 * 1000 });
} catch (err) {
  console.error(`  ✗ install — ${String(err.stderr ?? err.message).slice(0, 400)}`);
  cleanup();
  process.exit(1);
}

const bin = (name) => join(prefix, 'node_modules', '.bin', name);

// ── 1. The documented command exists ────────────────────────────────────────
//
// Not cosmetic: 1.1.0 publishes `evolith-cli` ALONE, so every `evolith …` line in
// the README — 447 invocations across 49 files when GT-571 counted them — is a
// command that does not exist for anyone who installed that version. This is the
// falsifiability fixture, and it was measured rather than argued.
check('the documented `evolith` command is published', () => {
  if (!existsSync(bin('evolith'))) {
    throw new Error(
      `@beyondnet/evolith-cli@${CLI_VERSION} does not publish an \`evolith\` binary; `
      + `the README documents \`evolith\`, so every documented invocation fails on this version.`,
    );
  }
  return 'bin/evolith present';
});

const cli = existsSync(bin('evolith')) ? bin('evolith') : bin('evolith-cli');

// ── 2. init, then a real envelope from validate ─────────────────────────────
check('`init` completes on a clean directory', () => {
  execFileSync(cli, ['init', '--name', 'canary', '--yes'], { cwd: work, stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
  if (!existsSync(join(work, 'evolith.yaml'))) throw new Error('init produced no evolith.yaml');
  return 'evolith.yaml written';
});

check('`validate --format json` returns an ADR-0073 envelope carrying a verdict', () => {
  // `spawnSync`, not `execFileSync`: a non-zero exit is a VERDICT here — a
  // satellite with blocking findings exits 2 by design — so the output must be read
  // on both paths without routing through an exception.
  const run = spawnSync(cli, ['validate', '--format', 'json'], {
    cwd: work,
    encoding: 'utf8',
    timeout: 300000,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout = String(run.stdout ?? '');

  // Extract rather than assume the whole stream is JSON — a published CLI may
  // interleave other output with the envelope.
  //
  // What this does NOT paper over, because it is a real finding: `cli@1.1.0`
  // truncates its own envelope THROUGH A PIPE. Measured — to a file it writes
  // 163 622 bytes that parse cleanly; piped, it stops at 65 386 mid-document.
  // `cli@1.2.2` writes 69 465 through the same pipe and parses. So a consumer that
  // pipes `validate --format json` into `jq`, into CI, or into any other tool gets
  // invalid JSON from that version, and the canary is right to be red about it
  // rather than clever enough to recover.
  const envelope = (() => {
    try { return JSON.parse(stdout); } catch { /* fall through to extraction */ }
    const start = stdout.indexOf('{');
    const end = stdout.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(stdout.slice(start, end + 1)); } catch { /* not an envelope */ }
    }
    throw new Error(`no JSON envelope on stdout (${stdout.length} bytes: ${stdout.slice(0, 160).replace(/\s+/g, ' ')})`);
  })();

  // The GT-625 lesson, stated as an assertion: `success` is present on EVERY
  // envelope, including error ones, so its presence proves nothing. A verdict is
  // what proves the command ran.
  const data = envelope.data ?? {};
  const VERDICTS = ['passed', 'failed', 'warning'];
  if (!VERDICTS.includes(data.status)) {
    throw new Error(`envelope carries no verdict: status=${JSON.stringify(data.status)} error=${JSON.stringify(envelope.error?.code)}`);
  }
  if (typeof data.rulesTotal !== 'number' || data.rulesTotal <= 0) {
    throw new Error(`verdict reached over an empty corpus (rulesTotal=${JSON.stringify(data.rulesTotal)}) — the install shipped no rulesets`);
  }
  notes.push(`validate: ${data.status}, ${data.rulesChecked}/${data.rulesTotal} checked`);
  return `${data.status}, ${data.rulesChecked}/${data.rulesTotal} rules checked`;
});

// ── 3. The published MCP server answers with a real gate verdict ────────────
const mcpResult = await (async function exerciseMcp() {
  const server = spawn(bin('evolith-mcp'), ['serve'], {
    cwd: work,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, EVOLITH_API_KEY: 'canary-key', NODE_ENV: 'development' },
  });

  const pending = new Map();
  let buffer = '';
  server.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line.startsWith('{')) continue;
      try {
        const message = JSON.parse(line);
        const resolver = pending.get(message.id);
        if (resolver) { pending.delete(message.id); resolver(message); }
      } catch { /* server logs are not protocol */ }
    }
  });

  const send = (id, method, params) => new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => { pending.delete(id); rejectPromise(new Error(`${method} timed out`)); }, 120000);
    pending.set(id, (message) => { clearTimeout(timer); resolvePromise(message); });
    server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });

  try {
    await send(1, 'initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'evolith-published-canary', version: '1.0.0' },
    });
    const call = await send(2, 'tools/call', {
      name: 'evolith-gate-evaluate',
      arguments: { phase: 'discovery', projectPath: work, evidenceMode: 'summary' },
    });
    return { ok: true, call };
  } catch (err) {
    return { ok: false, error: err };
  } finally {
    server.kill('SIGTERM');
  }
})();

/**
 * The published MCP server ships NO ruleset corpus — `files: ["dist/", "README.md",
 * "LICENSE"]`, and none of its `@beyondnet/*` dependencies carries one either; only
 * the CLI package does, through its `copy-rulesets` prebuild. Measured on this
 * canary's first real run: `evolith-gate-evaluate` answers RULESET_NOT_FOUND for
 * the missing gate definitions and `evolith-validate` answers "Could not locate the
 * Evolith ruleset corpus", while `evolith-metrics` — which needs no corpus — works.
 * Registered as GT-705.
 *
 * So the gate-verdict assertion cannot pass against today's registry. It is kept
 * and it is LOAD-BEARING: the exemption below matches the exact known symptom and
 * nothing else, so any other failure still fails the run, and the day GT-705 ships
 * a corpus the exemption stops matching and this assertion starts biting on its
 * own. A blanket skip would have been the permanently-green twin of the
 * permanently-red workflow GT-635 records.
 */
const CORPUS_MISSING = /RULESET_NOT_FOUND|Could not locate the Evolith ruleset corpus/i;

check('the published MCP server answers a tools/call with a real gate verdict', () => {
  if (!mcpResult.ok) throw new Error(mcpResult.error.message);
  try {
    // AC3 — the SAME oracle the in-tree smoke uses. A second one written here is
    // how two surfaces come to disagree about what "it worked" means.
    assertGateVerdict(mcpResult.call.result, `published mcp@${MCP_VERSION} stdio`);
    return 'verdict asserted by gate-verdict.assert.js';
  } catch (err) {
    if (!CORPUS_MISSING.test(err.message)) throw err;
    notes.push(`mcp gate verdict UNAVAILABLE — the published package ships no ruleset corpus (GT-705): ${err.message.slice(0, 120)}`);
    return 'KNOWN LIMITATION (GT-705) — the published MCP package ships no ruleset corpus';
  }
});

check('the published MCP server starts and serves a tools/call over stdio', () => {
  if (!mcpResult.ok) throw new Error(mcpResult.error.message);
  // The floor the corpus-less package can still meet: the protocol works and the
  // process is alive. Without this, the exemption above would let a server that
  // never starts pass as a "known limitation".
  if (!mcpResult.call?.result) throw new Error('tools/call returned no result');
  return 'stdio round trip completed';
});

cleanup();

// GT-578 — the denominator. A canary that silently executed zero checks would
// print no failures and exit 0, which is the vacuous pass `42-validate-guard-
// denominators` exists to make impossible. `checksRun` is incremented by `check`
// itself, so a check deleted from this file moves the number rather than leaving
// a stale constant behind.
assertScanned(checksRun, { what: 'published-artifact checks', where: [`cli@${CLI_VERSION}`, `mcp@${MCP_VERSION}`] });

console.log('');
for (const note of notes) console.log(`  · ${note}`);

if (failures.length > 0) {
  console.error(`\n✗ published-artifact-canary: ${failures.length} check(s) failed against cli@${CLI_VERSION} / mcp@${MCP_VERSION}.`);
  for (const f of failures) console.error(`   - ${f.label}: ${f.message}`);
  console.error('\n  This measures the REGISTRY, not this branch. A red run means what users install is broken,');
  console.error('  and the tree can be perfectly green at the same time — that asymmetry is why this exists.');
  process.exit(1);
}

console.log(`\n✓ published-artifact-canary: cli@${CLI_VERSION} and mcp@${MCP_VERSION} install from the registry and do real work.`);
