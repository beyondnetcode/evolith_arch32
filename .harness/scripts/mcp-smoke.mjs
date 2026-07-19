#!/usr/bin/env node
/**
 * MCP Smoke Evidence Generator
 *
 * Starts the Evolith MCP server in stdio mode, sends initialize / tools/list /
 * resources/list / prompts/list JSON-RPC requests, and writes evidence to
 * .harness/evidence/mcp-smoke.evidence.json.
 *
 * Usage:
 *   node .harness/scripts/mcp-smoke.mjs
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const cliMain = path.join(root, 'src', 'sdk', 'cli', 'dist', 'main.js');
const evidenceDir = path.join(root, '.harness', 'evidence');

if (!fs.existsSync(cliMain)) {
  console.error(`CLI not built: ${cliMain} not found.\nRun: cd src/sdk/cli && npm run build`);
  process.exit(1);
}

fs.mkdirSync(evidenceDir, { recursive: true });

const requests = [
  {
    id: 'initialize',
    message: {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'smoke-test', version: '1.0.0' },
      },
    },
  },
  {
    id: 'tools/list',
    message: { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
  },
  {
    id: 'resources/list',
    message: { jsonrpc: '2.0', id: 3, method: 'resources/list', params: {} },
  },
  {
    id: 'prompts/list',
    message: { jsonrpc: '2.0', id: 4, method: 'prompts/list', params: {} },
  },
];

console.log('Starting MCP server (stdio)...');
const proc = spawn('node', [cliMain, 'mcp', 'serve', '--transport', 'stdio'], {
  cwd: root,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'test' },
});

const results = {};
let outputBuffer = '';
let pendingIdx = 0;
let done = false;

function sendNext() {
  if (pendingIdx >= requests.length) {
    return;
  }
  const req = requests[pendingIdx];
  const msg = JSON.stringify(req.message) + '\n';
  proc.stdin.write(msg);
}

proc.stdout.on('data', (chunk) => {
  outputBuffer += chunk.toString();
  let newlineIdx;
  while ((newlineIdx = outputBuffer.indexOf('\n')) !== -1) {
    const line = outputBuffer.slice(0, newlineIdx).trim();
    outputBuffer = outputBuffer.slice(newlineIdx + 1);
    if (!line) continue;

    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }

    const req = requests[pendingIdx];
    if (!req) continue;

    const isResponse = parsed.jsonrpc === '2.0' && parsed.id === req.message.id;
    if (isResponse) {
      results[req.id] = {
        ok: !parsed.error,
        response: parsed.result ?? null,
        error: parsed.error ?? null,
      };
      console.log(`  ${parsed.error ? '✗' : '✓'} ${req.id}`);
      pendingIdx++;

      if (pendingIdx >= requests.length) {
        done = true;
        finalise();
      } else {
        sendNext();
      }
    }
  }
});

proc.stderr.on('data', () => { /* suppress NestJS startup noise */ });

proc.on('error', (err) => {
  console.error('Failed to start MCP server:', err.message);
  process.exit(1);
});

const startTimeout = setTimeout(() => {
  console.error('Timed out waiting for MCP server to become ready');
  proc.kill();
  process.exit(1);
}, 30_000);

// Wait briefly for server to initialise, then send first request
setTimeout(() => {
  clearTimeout(startTimeout);
  sendNext();
}, 1_500);

const responseTimeout = setTimeout(() => {
  if (!done) {
    console.error('Timed out waiting for MCP responses');
    proc.kill();
    writeEvidence(false);
    process.exit(1);
  }
}, 20_000);

function finalise() {
  clearTimeout(responseTimeout);
  proc.stdin.end();
  proc.kill('SIGTERM');
  writeEvidence(true);
}

function writeEvidence(success) {
  const evidence = {
    id: `mcp-smoke-${Date.now()}`,
    source: 'mcp-smoke.mjs',
    generatedAt: new Date().toISOString(),
    producer: 'evolith-harness/mcp-smoke',
    sourceRef: 'src/sdk/cli/dist/main.js',
    status: success && Object.values(results).every(r => r.ok) ? 'passed' : 'failed',
    evaluatedRules: ['MCP-01', 'MCP-02', 'MCP-03', 'MCP-05', 'CLI-RR-04'],
    blockingFailures: Object.entries(results)
      .filter(([, r]) => !r.ok)
      .map(([id]) => id),
    retentionPeriod: '90d',
    owner: 'evolith-core-team',
    results,
  };

  const outPath = path.join(evidenceDir, 'mcp-smoke.evidence.json');
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2) + '\n');
  console.log(`\nEvidence written to ${path.relative(root, outPath)}`);

  const allPassed = success && Object.values(results).every(r => r.ok);
  console.log(`Status: ${allPassed ? 'PASSED' : 'FAILED'}`);
  process.exit(allPassed ? 0 : 1);
}
