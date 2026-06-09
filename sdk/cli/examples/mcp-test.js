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

/**
 * Connect to GET /sse, POST each request to /message, collect JSON-RPC
 * responses from the SSE stream keyed by request id.
 * Returns a Map<id, result>.
 */
function runHttpRpc(port, requests) {
  return new Promise((resolveAll, rejectAll) => {
    const results = new Map();
    const pending = new Set(requests.map((r) => r.id));
    let sseBuffer = '';

    const sseReq = http.get(
      { hostname: 'localhost', port, path: '/sse' },
      (sseRes) => {
        sseRes.on('data', (chunk) => {
          sseBuffer += chunk.toString();
          const events = sseBuffer.split('\n\n');
          sseBuffer = events.pop() ?? '';

          for (const event of events) {
            const dataLine = event.split('\n').find((l) => l.startsWith('data: '));
            if (!dataLine) continue;
            let msg;
            try { msg = JSON.parse(dataLine.slice(6)); } catch { continue; }
            if (msg.id == null) continue;

            results.set(msg.id, msg.error ? null : msg.result);
            pending.delete(msg.id);
            if (pending.size === 0) {
              sseReq.destroy();
              resolveAll(results);
            }
          }
        });

        sseRes.on('error', (err) => {
          if (err.code !== 'ECONNRESET') rejectAll(err);
        });
      },
    );

    sseReq.on('error', (err) => {
      if (err.code !== 'ECONNRESET') rejectAll(err);
    });

    // Give SSE connection 250 ms to establish, then send requests serially
    setTimeout(async () => {
      try {
        for (const req of requests) {
          await httpPost(`http://localhost:${port}/message`, {
            jsonrpc: '2.0',
            id: req.id,
            method: req.method,
            params: req.params ?? {},
          });
        }
      } catch (err) {
        rejectAll(err);
      }
    }, 250);

    // Global timeout
    setTimeout(() => {
      if (pending.size > 0) {
        sseReq.destroy();
        rejectAll(
          new Error(`HTTP RPC timeout. No response for IDs: ${[...pending].join(', ')}`),
        );
      }
    }, 10000);
  });
}

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

    // 3. /sse Content-Type
    const sseProbe = await new Promise((resolve, reject) => {
      const req = http.get({ hostname: 'localhost', port, path: '/sse' }, (res) => {
        resolve({ status: res.statusCode, contentType: res.headers['content-type'] });
        res.destroy();
      });
      req.on('error', reject);
    });
    assert(sseProbe.status === 200, `/sse: status ${sseProbe.status}`);
    assert(
      (sseProbe.contentType || '').includes('text/event-stream'),
      `/sse: content-type was ${sseProbe.contentType}`,
    );
    console.log('  /sse               OK  (text/event-stream)');

    // 4. JSON-RPC over POST /message + SSE responses
    const results = await runHttpRpc(port, [
      { id: 100, method: 'initialize' },
      { id: 101, method: 'tools/list' },
      { id: 102, method: 'resources/list' },
      { id: 103, method: 'prompts/list' },
      { id: 104, method: 'tools/call', params: { name: 'evolith-metrics', arguments: {} } },
    ]);

    const init = results.get(100);
    assert(init?.serverInfo?.name === 'evolith-mcp-server', 'HTTP initialize: serverInfo.name mismatch');
    assert(init?.capabilities?.tools, 'HTTP initialize: missing tools capability');
    console.log('  initialize         OK  (HTTP)');

    const tools = results.get(101);
    assert(Array.isArray(tools?.tools), 'HTTP tools/list: not an array');
    assert(tools.tools.length > 0, 'HTTP tools/list: empty');
    console.log(`  tools/list         OK  (${tools.tools.length} tools, HTTP)`);

    const resources = results.get(102);
    assert(Array.isArray(resources?.resources), 'HTTP resources/list: not an array');
    assert(resources.resources.length > 0, 'HTTP resources/list: empty');
    console.log(`  resources/list     OK  (${resources.resources.length} resources, HTTP)`);

    const prompts = results.get(103);
    assert(Array.isArray(prompts?.prompts), 'HTTP prompts/list: not an array');
    assert(prompts.prompts.length > 0, 'HTTP prompts/list: empty');
    console.log(`  prompts/list       OK  (${prompts.prompts.length} prompts, HTTP)`);

    const metrics = results.get(104);
    assert(Array.isArray(metrics?.content), 'HTTP tools/call metrics: content not an array');
    assert(metrics.content[0]?.type === 'text', 'HTTP tools/call metrics: first item not text');
    console.log('  tools/call         OK  (evolith-metrics, HTTP)');

    console.log('Transport 2 PASSED\n');
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
