#!/usr/bin/env node
/**
 * MCP smoke test — THE CANONICAL IMPLEMENTATION.
 *
 * This is the single real implementation of the MCP smoke. All protocol logic
 * lives here and nowhere else. Despite sitting under `examples/`, this file is
 * a CI GATE, not a sample (see "Naming" below).
 *
 * Invoked by:
 *   - `npm run mcp:smoke` (src/sdk/cli/package.json) — used by CI in
 *     .github/workflows/sdk-cli-ci.yml, job `e2e-tests`, step
 *     "Run MCP Stdio and HTTP Smoke".
 *   - `.harness/scripts/mcp-smoke.mjs` — a THIN SHIM that execs this file so the
 *     harness path cited by ADR ai-augmented/0002 and by
 *     reference/core/control-center/evidence/gap-closure-evidence.json keeps
 *     working. That shim contains no protocol logic of its own.
 *
 * Verifies the stdio AND HTTP/SSE JSON-RPC surfaces of the MCP gateway.
 *
 * Transport 1 — stdio: spawns `node dist/main.js serve` and communicates
 *   directly over stdin/stdout with JSON-RPC 2.0.
 *
 * Transport 2 — HTTP/SSE: spawns `node dist/main.js serve --transport http`
 *   on a fixed port, then speaks JSON-RPC over Streamable HTTP.
 *
 * NOTE: the server under test is the STANDALONE @beyondnet/evolith-mcp gateway.
 * The CLI hosted it behind `evolith-cli mcp serve` until dc0b9667 (2026-06-30)
 * decoupled the two; this smoke must spawn the gateway's own binary.
 *
 * EVIDENCE: on completion this writes .harness/evidence/mcp-smoke.evidence.json.
 * That artifact is consumed by McpRuleHandler in core-domain, which evaluates
 * rules MCP-01/02/03 by looking for `results.initialize`, `results['tools/list']`
 * and `results['resources/list']`. Evidence generation lives here — in the
 * implementation that actually observes the responses — so the recorded counts
 * are real rather than inferred from an exit code.
 *
 * Naming: `examples/mcp-test.js` understates what this is. The path is retained
 * deliberately because closure registers cite it verbatim
 * (gap-closure-evidence.json, gap-reference-catalog.md), matching the precedent
 * set when guard 28 was fixed by renaming the CI step rather than the file.
 */

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const cliRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(cliRoot, '..', '..', '..');
const mcpServerRoot = path.join(repoRoot, 'src', 'packages', 'mcp-server');
const mcpServerEntry = path.join(mcpServerRoot, 'dist', 'main.js');
const evidenceDir = path.join(repoRoot, '.harness', 'evidence');

/**
 * Write the harness evidence artifact consumed by McpRuleHandler (MCP-01/02/03).
 * `results` maps JSON-RPC method name -> observed outcome.
 */
function writeEvidence(results, passed) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const evidence = {
    id: `mcp-smoke-${Date.now()}`,
    source: 'src/sdk/cli/examples/mcp-test.js',
    generatedAt: new Date().toISOString(),
    producer: 'evolith-cli/mcp-smoke',
    sourceRef: 'src/packages/mcp-server/dist/main.js',
    status: passed ? 'passed' : 'failed',
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
  console.log(`Evidence written to ${path.relative(repoRoot, outPath)}`);
}

if (!fs.existsSync(mcpServerEntry)) {
  console.error(
    `MCP smoke test FAILED: the gateway is not built — ${mcpServerEntry} does not exist.\n` +
    `Build it first: npm run build -w @beyondnet/evolith-mcp`,
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Observed outcomes keyed by JSON-RPC method, accumulated by the stdio run and
 * serialised by writeEvidence(). Keys must match what McpRuleHandler looks for.
 */
const smokeResults = {};

function recordResult(method, detail = {}) {
  smokeResults[method] = { ok: true, ...detail };
}

function createRequest(id, method, params = {}) {
  return `${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseJsonLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

/** Simple HTTP GET — returns { status, body }. */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (d) => { body += d.toString(); });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
  });
}

/**
 * Retry GET /health until HTTP 200 or timeout (ms).
 */
function waitForHealth(port, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    function attempt() {
      httpGet(`http://localhost:${port}/health`)
        .then((r) => {
          if (r.status === 200) return resolve();
          if (Date.now() > deadline) return reject(new Error(`/health never returned 200 on port ${port}`));
          setTimeout(attempt, 150);
        })
        .catch(() => {
          if (Date.now() > deadline) return reject(new Error(`HTTP server never came up on port ${port}`));
          setTimeout(attempt, 150);
        });
    }
    attempt();
  });
}

// Removed manual HTTP RPC helpers as we now use the official MCP Client for Streamable HTTP

// ---------------------------------------------------------------------------
// Transport 1 — stdio smoke
// ---------------------------------------------------------------------------

async function runStdioSmoke() {
  console.log('--- Transport 1: stdio ---');

  const server = spawn('node', [mcpServerEntry, 'serve'], {
    cwd: mcpServerRoot,
    env: { ...process.env, EVOLITH_CORE_PATH: repoRoot },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const responses = new Map();
  const pending = new Map();
  let stdoutBuffer = '';
  let failure;
  let stopping = false;

  function settle(id, response) {
    responses.set(id, response);
    const resolver = pending.get(id);
    if (resolver) { pending.delete(id); resolver(response); }
  }

  server.stdout.on('data', (data) => {
    stdoutBuffer += data.toString();
    const lines = stdoutBuffer.split('\n');
    stdoutBuffer = lines.pop() || '';
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const response = parseJsonLine(line);
      if (response && Object.prototype.hasOwnProperty.call(response, 'id')) {
        settle(response.id, response);
      }
    }
  });

  // Capture stderr and early exit so a server that never starts reports WHY
  // instead of surfacing only as an opaque "Timed out waiting for initialize".
  let stderrBuf = '';
  server.stderr.on('data', (d) => { stderrBuf += d.toString(); });

  let exited;
  server.on('exit', (code, signal) => {
    if (stopping) return;
    exited = `server exited early (code=${code}, signal=${signal})`;
    // Fail fast instead of letting every in-flight request burn its full timeout.
    for (const [id, resolver] of pending) {
      pending.delete(id);
      resolver({ jsonrpc: '2.0', id, error: { message: describeFailure('server exited') } });
    }
  });

  server.on('error', (error) => { failure = error; });

  function describeFailure(base) {
    const parts = [base];
    if (exited) parts.push(exited);
    if (stderrBuf.trim()) parts.push(`server stderr:\n${stderrBuf.trim()}`);
    return parts.join(' — ');
  }

  function request(id, method, params) {
    if (failure) throw failure;
    server.stdin.write(createRequest(id, method, params));
    if (responses.has(id)) return Promise.resolve(responses.get(id));
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(describeFailure(`Timed out waiting for ${method} (id ${id})`)));
      }, 5000);
      pending.set(id, (response) => { clearTimeout(timeout); resolve(response); });
    });
  }

  async function checkedRequest(id, method, params) {
    const response = await request(id, method, params);
    assert(response.jsonrpc === '2.0', `${method}: not JSON-RPC 2.0`);
    assert(!response.error, `${method}: error ${JSON.stringify(response.error)}`);
    return response.result;
  }

  try {
    const initialize = await checkedRequest(1, 'initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } });
    assert(initialize.serverInfo?.name === 'evolith-mcp', 'initialize: serverInfo.name mismatch');
    assert(initialize.capabilities?.tools, 'initialize: missing tools capability');
    assert(initialize.capabilities?.resources, 'initialize: missing resources capability');
    assert(initialize.capabilities?.prompts, 'initialize: missing prompts capability');
    console.log('  initialize         OK');
    recordResult('initialize', { serverInfo: initialize.serverInfo });

    const tools = await checkedRequest(2, 'tools/list');
    const toolNames = new Set((tools.tools || []).map((t) => t.name));
    assert(toolNames.has('evolith-validate'), 'tools/list: missing evolith-validate');
    assert(toolNames.has('evolith-metrics'), 'tools/list: missing evolith-metrics');
    assert(toolNames.has('evolith-architecture-validate'), 'tools/list: missing evolith-architecture-validate');
    console.log(`  tools/list         OK  (${tools.tools.length} tools)`);
    recordResult('tools/list', { count: tools.tools.length });

    const resources = await checkedRequest(3, 'resources/list');
    assert(Array.isArray(resources.resources), 'resources/list: not an array');
    assert(resources.resources.length > 0, 'resources/list: empty');
    console.log(`  resources/list     OK  (${resources.resources.length} resources)`);
    recordResult('resources/list', { count: resources.resources.length });

    const prompts = await checkedRequest(4, 'prompts/list');
    assert(Array.isArray(prompts.prompts), 'prompts/list: not an array');
    assert(prompts.prompts.length > 0, 'prompts/list: empty');
    console.log(`  prompts/list       OK  (${prompts.prompts.length} prompts)`);
    recordResult('prompts/list', { count: prompts.prompts.length });

    const metrics = await checkedRequest(5, 'tools/call', { name: 'evolith-metrics', arguments: {} });
    assert(Array.isArray(metrics.content), 'tools/call metrics: content not an array');
    assert(metrics.content[0]?.type === 'text', 'tools/call metrics: first item not text');
    console.log('  tools/call         OK  (evolith-metrics)');

    const gateEval = await checkedRequest(6, 'tools/call', {
      name: 'evolith-gate-evaluate',
      arguments: { phase: 'discovery', projectPath: repoRoot, evidenceMode: 'summary' }
    });
    assert(Array.isArray(gateEval.content), 'tools/call gate-evaluate: content not an array');
    const gateEnvelope = JSON.parse(gateEval.content[0].text);
    assert(gateEnvelope.success !== undefined, 'tools/call gate-evaluate: envelope must have success field');
    assert(gateEnvelope.meta?.tool === 'evolith-gate-evaluate', 'tools/call gate-evaluate: missing or invalid meta.tool');
    console.log('  tools/call         OK  (evolith-gate-evaluate stdio)');

    console.log('Transport 1 PASSED\n');
  } catch (err) {
    if (stderrBuf.trim()) console.error('  Server stderr:', stderrBuf.trim());
    throw err;
  } finally {
    stopping = true;
    for (const resolver of pending.values()) {
      resolver({ jsonrpc: '2.0', id: null, error: { message: 'Server stopped' } });
    }
    pending.clear();
    if (!server.killed) server.kill();
  }
}

// ---------------------------------------------------------------------------
// Transport 2 — HTTP/SSE smoke
// ---------------------------------------------------------------------------

async function runHttpSmoke() {
  console.log('--- Transport 2: HTTP/SSE ---');

  const port = 49400;
  // GT-250: the MCP HTTP server fails closed — it requires an API key. Start it
  // with one and authenticate the client below.
  const apiKey = 'smoke-test-key-123';

  const server = spawn(
    'node',
    [mcpServerEntry, 'serve', '--transport', 'http', '--port', String(port), '--api-key', apiKey],
    {
      cwd: mcpServerRoot,
      env: { ...process.env, EVOLITH_CORE_PATH: repoRoot },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  let stderrBuf = '';
  server.stderr.on('data', (d) => { stderrBuf += d.toString(); });

  try {
    // 1. Wait for server ready
    await waitForHealth(port);

    // 2. /health
    const healthRes = await httpGet(`http://localhost:${port}/health`);
    assert(healthRes.status === 200, `/health: status ${healthRes.status}`);
    const healthBody = parseJsonLine(healthRes.body);
    assert(healthBody?.status === 'ok', `/health: body.status was ${JSON.stringify(healthBody?.status)}`);
    console.log('  /health            OK');

    // 3. JSON-RPC over Streamable HTTP using official SDK Client
    const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
    const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const { z } = require('zod');
    
    // We send requests to the root endpoint which is handled by StreamableHTTPServerTransport
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/`), {
      requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
    });
    const client = new Client({ name: 'evolith-smoke-client', version: '1.0.0' }, { capabilities: {} });
    
    await client.connect(transport);
    console.log('  initialize         OK  (HTTP Streamable)');

    const tools = await client.request({ method: 'tools/list' }, z.any());
    assert(Array.isArray(tools?.tools), 'HTTP tools/list: not an array');
    assert(tools.tools.length > 0, 'HTTP tools/list: empty');
    console.log(`  tools/list         OK  (${tools.tools.length} tools, HTTP)`);

    const resources = await client.request({ method: 'resources/list' }, z.any());
    assert(Array.isArray(resources?.resources), 'HTTP resources/list: not an array');
    assert(resources.resources.length > 0, 'HTTP resources/list: empty');
    console.log(`  resources/list     OK  (${resources.resources.length} resources, HTTP)`);

    const prompts = await client.request({ method: 'prompts/list' }, z.any());
    assert(Array.isArray(prompts?.prompts), 'HTTP prompts/list: not an array');
    assert(prompts.prompts.length > 0, 'HTTP prompts/list: empty');
    console.log(`  prompts/list       OK  (${prompts.prompts.length} prompts, HTTP)`);

    const metrics = await client.request({ method: 'tools/call', params: { name: 'evolith-metrics', arguments: {} } }, z.any());
    assert(Array.isArray(metrics?.content), 'HTTP tools/call metrics: content not an array');
    assert(metrics.content[0]?.type === 'text', 'HTTP tools/call metrics: first item not text');
    console.log('  tools/call         OK  (evolith-metrics, HTTP)');

    const gateEvalHttp = await client.request({ method: 'tools/call', params: { name: 'evolith-gate-evaluate', arguments: { phase: 'discovery', projectPath: repoRoot } } }, z.any());
    assert(Array.isArray(gateEvalHttp?.content), 'HTTP tools/call gate-evaluate: content not an array');
    const gateEnvelopeHttp = JSON.parse(gateEvalHttp.content[0].text);
    assert(gateEnvelopeHttp.success !== undefined, 'HTTP tools/call gate-evaluate: envelope must have success field');
    assert(gateEnvelopeHttp.meta?.tool === 'evolith-gate-evaluate', 'HTTP tools/call gate-evaluate: missing or invalid meta.tool');
    console.log('  tools/call         OK  (evolith-gate-evaluate, HTTP)');

    await client.close();

    console.log('Transport 2 PASSED\\n');
  } catch (err) {
    if (stderrBuf.trim()) {
      console.error('  Server stderr:', stderrBuf.trim());
    }
    throw err;
  } finally {
    if (!server.killed) server.kill();
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  console.log('Starting Evolith MCP smoke tests...\n');
  await runStdioSmoke();
  await runHttpSmoke();
  console.log('All MCP smoke tests passed.');
}

main()
  .then(() => {
    writeEvidence(smokeResults, true);
  })
  .catch((error) => {
    console.error(`MCP smoke test FAILED: ${error.message}`);
    // Still emit evidence so MCP-01/02/03 evaluate against the real failure
    // rather than a stale artifact from an earlier passing run.
    writeEvidence(smokeResults, false);
    process.exit(1);
  });
