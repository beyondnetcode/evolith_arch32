#!/usr/bin/env node
/**
 * MCP smoke test.
 * Verifies the stdio AND HTTP/SSE JSON-RPC surfaces exposed by the built Evolith CLI.
 *
 * Transport 1 — stdio: spawns `node dist/main.js mcp serve` and communicates
 *   directly over stdin/stdout with JSON-RPC 2.0.
 *
 * Transport 2 — HTTP/SSE: spawns `node dist/main.js mcp serve --transport http`
 *   on a fixed port, then sends JSON-RPC via POST /message and reads responses
 *   from the GET /sse stream.
 */

const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const cliRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(cliRoot, '..', '..');

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

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

/** POST JSON to url. Returns { status }. */
function httpPost(url, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const opts = new URL(url);
    const req = http.request(
      {
        hostname: opts.hostname,
        port: Number(opts.port),
        path: opts.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        res.resume(); // drain
        resolve({ status: res.statusCode });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
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

  const server = spawn('node', ['dist/main.js', 'mcp', 'serve'], {
    cwd: cliRoot,
    env: { ...process.env, EVOLITH_CORE_PATH: repoRoot },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const responses = new Map();
  const pending = new Map();
  let stdoutBuffer = '';
  let failure;

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

  server.on('error', (error) => { failure = error; });

  function request(id, method, params) {
    if (failure) throw failure;
    server.stdin.write(createRequest(id, method, params));
    if (responses.has(id)) return Promise.resolve(responses.get(id));
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timed out waiting for ${method} (id ${id})`));
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
    const initialize = await checkedRequest(1, 'initialize');
    assert(initialize.serverInfo?.name === 'evolith-mcp-server', 'initialize: serverInfo.name mismatch');
    assert(initialize.capabilities?.tools, 'initialize: missing tools capability');
    assert(initialize.capabilities?.resources, 'initialize: missing resources capability');
    assert(initialize.capabilities?.prompts, 'initialize: missing prompts capability');
    console.log('  initialize         OK');

    const tools = await checkedRequest(2, 'tools/list');
    const toolNames = new Set((tools.tools || []).map((t) => t.name));
    assert(toolNames.has('evolith-validate'), 'tools/list: missing evolith-validate');
    assert(toolNames.has('evolith-metrics'), 'tools/list: missing evolith-metrics');
    assert(toolNames.has('evolith-architecture-validate'), 'tools/list: missing evolith-architecture-validate');
    console.log(`  tools/list         OK  (${tools.tools.length} tools)`);

    const resources = await checkedRequest(3, 'resources/list');
    assert(Array.isArray(resources.resources), 'resources/list: not an array');
    assert(resources.resources.length > 0, 'resources/list: empty');
    console.log(`  resources/list     OK  (${resources.resources.length} resources)`);

    const prompts = await checkedRequest(4, 'prompts/list');
    assert(Array.isArray(prompts.prompts), 'prompts/list: not an array');
    assert(prompts.prompts.length > 0, 'prompts/list: empty');
    console.log(`  prompts/list       OK  (${prompts.prompts.length} prompts)`);

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
    assert(gateEnvelope.meta?.command === 'evolith gate evaluate', 'tools/call gate-evaluate: missing or invalid meta.command');
    console.log('  tools/call         OK  (evolith-gate-evaluate stdio)');

    console.log('Transport 1 PASSED\n');
  } finally {
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

  const server = spawn(
    'node',
    ['dist/main.js', 'mcp', 'serve', '--transport', 'http', '--port', String(port)],
    {
      cwd: cliRoot,
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
    const transport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/`));
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
    assert(gateEnvelopeHttp.meta?.command === 'evolith gate evaluate', 'HTTP tools/call gate-evaluate: missing or invalid meta.command');
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

main().catch((error) => {
  console.error(`MCP smoke test FAILED: ${error.message}`);
  process.exit(1);
});
