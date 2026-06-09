#!/usr/bin/env node
/**
 * MCP smoke test.
 * Verifies the stdio JSON-RPC surface exposed by the built Evolith CLI.
 */

const { spawn } = require('node:child_process');
const path = require('node:path');

const cliRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(cliRoot, '..', '..');

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

async function runSmoke() {
  console.log('Starting Evolith MCP Server smoke test...');

  const server = spawn('node', ['dist/main.js', 'mcp', 'serve'], {
    cwd: cliRoot,
    env: {
      ...process.env,
      EVOLITH_CORE_PATH: repoRoot,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const responses = new Map();
  const pending = new Map();
  let stdoutBuffer = '';
  let stderrBuffer = '';
  let failure;

  function settle(id, response) {
    responses.set(id, response);
    const resolver = pending.get(id);
    if (resolver) {
      pending.delete(id);
      resolver(response);
    }
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

  server.stderr.on('data', (data) => {
    stderrBuffer += data.toString();
  });

  server.on('error', (error) => {
    failure = error;
  });

  function request(id, method, params) {
    if (failure) {
      throw failure;
    }

    server.stdin.write(createRequest(id, method, params));

    if (responses.has(id)) {
      return Promise.resolve(responses.get(id));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timed out waiting for ${method} response (${id}). stderr: ${stderrBuffer.trim()}`));
      }, 5000);

      pending.set(id, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }

  async function checkedRequest(id, method, params) {
    const response = await request(id, method, params);
    assert(response.jsonrpc === '2.0', `${method} did not return JSON-RPC 2.0`);
    assert(!response.error, `${method} returned error: ${JSON.stringify(response.error)}`);
    return response.result;
  }

  try {
    const initialize = await checkedRequest(1, 'initialize');
    assert(initialize.serverInfo?.name === 'evolith-mcp-server', 'initialize server name mismatch');
    assert(initialize.capabilities?.tools, 'initialize missing tools capability');
    assert(initialize.capabilities?.resources, 'initialize missing resources capability');
    assert(initialize.capabilities?.prompts, 'initialize missing prompts capability');

    const tools = await checkedRequest(2, 'tools/list');
    const toolNames = new Set((tools.tools || []).map((tool) => tool.name));
    assert(toolNames.has('evolith-validate'), 'tools/list missing evolith-validate');
    assert(toolNames.has('evolith-metrics'), 'tools/list missing evolith-metrics');
    assert(toolNames.has('evolith-architecture-validate'), 'tools/list missing evolith-architecture-validate');

    const resources = await checkedRequest(3, 'resources/list');
    assert(Array.isArray(resources.resources), 'resources/list did not return resources array');
    assert(resources.resources.length > 0, 'resources/list returned no resources');

    const prompts = await checkedRequest(4, 'prompts/list');
    assert(Array.isArray(prompts.prompts), 'prompts/list did not return prompts array');
    assert(prompts.prompts.length > 0, 'prompts/list returned no prompts');

    const metrics = await checkedRequest(5, 'tools/call', {
      name: 'evolith-metrics',
      arguments: {},
    });
    assert(Array.isArray(metrics.content), 'tools/call did not return MCP content');
    assert(metrics.content[0]?.type === 'text', 'tools/call first content item is not text');

    console.log('MCP smoke test passed.');
  } finally {
    for (const resolver of pending.values()) {
      resolver({ jsonrpc: '2.0', id: null, error: { message: 'Server stopped' } });
    }
    pending.clear();

    if (!server.killed) {
      server.kill();
    }
  }
}

runSmoke().catch((error) => {
  console.error(`MCP smoke test failed: ${error.message}`);
  process.exit(1);
});
