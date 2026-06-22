#!/usr/bin/env node

/**
 * Contract roundtrip test: gate evaluate across CLI, MCP, and REST.
 *
 * Starts all three surfaces, invokes the same gate evaluate operation,
 * and asserts semantically identical envelopes.
 *
 * Usage:
 *   node tests/contract/roundtrip-gate-evaluate.mjs
 *
 * Prerequisites: built packages
 *   (cd sdk/cli && npm run build)
 *   (cd packages/mcp-server && npm run build)
 *   (cd apps/core-api && rm -f tsconfig*.tsbuildinfo && npm run build)
 *
 * Exit codes: 0 = pass, 1 = fail
 */

import { spawn, spawnSync } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { mkdirSync, mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const TIMEOUT = 30000;

let failures = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  PASS: ${message}`);
  } else {
    failures++;
    console.error(`  FAIL: ${message}`);
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function httpPost(url, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const options = {
      hostname: u.hostname, port: u.port, path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...extraHeaders },
      timeout: TIMEOUT,
    };
    const req = httpRequest(options, (res) => {
      let responseData = '';
      const headers = res.headers;
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers, body: JSON.parse(responseData) }); }
        catch { resolve({ status: res.statusCode, headers, body: responseData }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timed out')); });
    req.write(data);
    req.end();
  });
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = httpRequest({
      hostname: u.hostname, port: u.port, path: u.pathname, method: 'GET', timeout: TIMEOUT,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timed out')); });
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n=== ADR-0073 Contract Roundtrip: gate evaluate ===\n');

  // -----------------------------------------------------------------------
  // Setup: temp workspace for REST (WORKSPACE_ROOT) + shared project dir
  // -----------------------------------------------------------------------
  const workspaceRoot = mkdtempSync(join(tmpdir(), 'evolith-workspace-'));
  const workspaceRef = 'test-workspace';
  const projectPath = join(workspaceRoot, workspaceRef);
  mkdirSync(projectPath, { recursive: true });

  const cliPath = join(ROOT, 'sdk/cli/dist/main.js');
  const coreApiPath = join(ROOT, 'apps/core-api/dist/main.js');
  const mcpPath = join(ROOT, 'packages/mcp-server/dist/main.js');

  for (const [label, p] of [['CLI', cliPath], ['Core API', coreApiPath], ['MCP', mcpPath]]) {
    if (!existsSync(p)) {
      console.error(`${label} binary not found at ${p}. Build first.`);
      process.exit(1);
    }
  }

  // Ports
  const restPort = 45678;
  const mcpPort = 45679;

  // Start Core API
  const restProc = spawn('node', [coreApiPath], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(restPort),
      CORE_PATH: ROOT,
      WORKSPACE_ROOT: workspaceRoot,
      NODE_ENV: 'development',
      OTEL_ENABLED: 'false',
      ALLOWED_ORIGINS: '*',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Start MCP server
  const mcpProc = spawn('node', [mcpPath, 'serve', '--transport', 'http', '--port', String(mcpPort)], {
    cwd: ROOT,
    env: { ...process.env, OTEL_ENABLED: 'false', NODE_ENV: 'development' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Wait for both servers to be ready
  let restReady = false;
  let mcpReady = false;
  for (let i = 0; i < 30; i++) {
    if (!restReady) {
      try {
        const h = await httpGet(`http://127.0.0.1:${restPort}/health`);
        if (h.status === 200) restReady = true;
      } catch {}
    }
    if (!mcpReady) {
      try {
        const h = await httpGet(`http://127.0.0.1:${mcpPort}/health`);
        if (h.status === 200) mcpReady = true;
      } catch {}
    }
    if (restReady && mcpReady) break;
    await sleep(500);
  }
  assert(restReady, 'Core API started');
  assert(mcpReady, 'MCP server started');
  if (!restReady || !mcpReady) {
    restProc.kill();
    mcpProc.kill();
    process.exit(1);
  }

  const phases = ['discovery', 'design', 'construction', 'qa', 'release'];
  const results = { cli: {}, mcp: {}, rest: {} };

  // -----------------------------------------------------------------------
  // 1. CLI
  // -----------------------------------------------------------------------
  console.log('\n--- CLI ---');
  for (const phase of phases) {
    const result = spawnSync('node', [
      cliPath, 'gate', 'evaluate',
      '--phase', phase,
      '--project', projectPath,
      '--core', ROOT,
      '--evaluated-by', 'ci',
      '--format', 'json',
    ], { cwd: ROOT, timeout: TIMEOUT, encoding: 'utf-8' });
    try {
      results.cli[phase] = JSON.parse(result.stdout.trim());
      assert(true, `gate evaluate ${phase}: valid JSON`);
    } catch (e) {
      assert(false, `gate evaluate ${phase}: parse error - ${e.message}`);
      if (result.stdout) console.error(`    stdout: ${result.stdout.substring(0, 300)}`);
      if (result.stderr) console.error(`    stderr: ${result.stderr.substring(0, 300)}`);
    }
  }

  // -----------------------------------------------------------------------
  // 2. REST
  // -----------------------------------------------------------------------
  console.log('\n--- REST ---');
  const gateIdMap = { discovery: 'PG1', design: 'PG2', construction: 'PG3', qa: 'PG4', release: 'PG5' };
  for (const phase of phases) {
    try {
      const gateId = gateIdMap[phase];
      const res = await httpPost(
        `http://127.0.0.1:${restPort}/api/v1/gates/${gateId}/evaluate`,
        { workspaceRef },
      );
      if (res.status === 200) {
        results.rest[phase] = res.body;
        assert(true, `gate evaluate ${phase}: 200 OK`);
      } else {
        assert(false, `gate evaluate ${phase}: status ${res.status}`);
      }
    } catch (e) {
      assert(false, `gate evaluate ${phase}: ${e.message}`);
    }
  }

  // -----------------------------------------------------------------------
  // 3. MCP
  // -----------------------------------------------------------------------
  console.log('\n--- MCP ---');

  // 3a. Initialize session
  const mcpHeaders = { Accept: 'application/json, text/event-stream' };
  let mcpSessionId = null;
  try {
    const initRes = await httpPost(`http://127.0.0.1:${mcpPort}/mcp`, {
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'contract-test', version: '1.0.0' },
      },
    }, mcpHeaders);
    assert(initRes.status === 200, 'MCP initialize: 200 OK');
    mcpSessionId = initRes.headers?.['mcp-session-id'] || null;
    assert(true, `MCP initialized (session: ${mcpSessionId || 'none'})`);
  } catch (e) {
    assert(false, `MCP initialize: ${e.message}`);
  }

  // 3b. tools/call for each phase
  if (mcpSessionId) mcpHeaders['mcp-session-id'] = mcpSessionId;
  for (const phase of phases) {
    try {
      const res = await httpPost(`http://127.0.0.1:${mcpPort}/mcp`, {
        jsonrpc: '2.0', id: phase, method: 'tools/call',
        params: {
          name: 'evolith-gate-evaluate',
          arguments: { phase, projectPath, corePath: ROOT, evaluatedBy: 'ci' },
        },
      }, mcpHeaders);
      if (res.status === 200 && res.body?.result?.content?.[0]?.text) {
        results.mcp[phase] = JSON.parse(res.body.result.content[0].text);
        assert(true, `gate evaluate ${phase}: valid response`);
      } else {
        assert(false, `gate evaluate ${phase}: ${res.body?.error?.message || `status ${res.status}`}`);
      }
    } catch (e) {
      assert(false, `gate evaluate ${phase}: ${e.message}`);
    }
  }

  // -----------------------------------------------------------------------
  // 4. Cross-surface comparison
  // -----------------------------------------------------------------------
  console.log('\n--- Cross-surface comparison ---');
  for (const phase of phases) {
    const cli = results.cli[phase];
    const mcp = results.mcp[phase];
    const rest = results.rest[phase];

    if (!cli || !mcp || !rest) {
      assert(false, `${phase}: missing results`);
      continue;
    }

    // Envelope structure: all three return { success, data, meta }
    assert(typeof cli.success === 'boolean', `${phase}: CLI has success`);
    assert(typeof mcp.success === 'boolean', `${phase}: MCP has success`);
    assert(typeof rest.success === 'boolean', `${phase}: REST has success`);

    // Verdict equivalence
    assert(cli.data?.verdict === mcp.data?.verdict, `${phase}: CLI/MCP verdict (${cli.data?.verdict} vs ${mcp.data?.verdict})`);
    assert(cli.data?.verdict === rest.data?.verdict, `${phase}: CLI/REST verdict (${cli.data?.verdict} vs ${rest.data?.verdict})`);

    // Phase equivalence
    assert(cli.data?.phase === phase, `${phase}: CLI phase`);
    assert(mcp.data?.phase === phase, `${phase}: MCP phase`);
    assert(rest.data?.phase === phase, `${phase}: REST phase`);

    // evaluatedBy equivalence
    assert(cli.data?.evaluatedBy === 'ci', `${phase}: CLI evaluatedBy`);
    assert(mcp.data?.evaluatedBy === 'ci', `${phase}: MCP evaluatedBy`);

    // rulesetRef equivalence
    assert(cli.data?.rulesetRef === 'rulesets/sdlc/phase-gates.rules.json', `${phase}: CLI rulesetRef`);
    assert(mcp.data?.rulesetRef === 'rulesets/sdlc/phase-gates.rules.json', `${phase}: MCP rulesetRef`);
    assert(rest.data?.rulesetRef === 'rulesets/sdlc/phase-gates.rules.json', `${phase}: REST rulesetRef`);

    // correlationId in meta
    assert(cli.meta?.correlationId, `${phase}: CLI correlationId`);
    assert(mcp.meta?.correlationId, `${phase}: MCP correlationId`);
    assert(rest.meta?.correlationId, `${phase}: REST correlationId`);

    // Success on all three (empty project: gates should fail with violations)
    assert(cli.success === true, `${phase}: CLI success`);
    assert(mcp.success === true, `${phase}: MCP success`);
    assert(rest.success === true, `${phase}: REST success`);

    // Violations present
    assert(Array.isArray(cli.data?.violations) && cli.data.violations.length > 0, `${phase}: CLI violations`);
    assert(Array.isArray(mcp.data?.violations) && mcp.data.violations.length > 0, `${phase}: MCP violations`);
    assert(Array.isArray(rest.data?.violations) && rest.data.violations.length > 0, `${phase}: REST violations`);
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------
  restProc.kill('SIGTERM');
  mcpProc.kill('SIGTERM');
  rmSync(workspaceRoot, { recursive: true, force: true });

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log(`\n=== Results: ${totalTests - failures}/${totalTests} passed ===`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
