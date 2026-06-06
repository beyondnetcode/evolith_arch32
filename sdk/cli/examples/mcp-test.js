#!/usr/bin/env node
/**
 * MCP Integration Test
 * Tests the Evolith MCP server directly via JSON-RPC over stdio
 */

const { spawn } = require('child_process');

function createRequest(id, method, params) {
  return JSON.stringify({
    jsonrpc: '2.0',
    id,
    method,
    params,
  });
}

function parseResponse(data) {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function runTest() {
  console.log('Starting Evolith MCP Server...');

  const server = spawn('node', ['dist/main.js', 'mcp', 'serve'], {
    cwd: __dirname + '/..',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let responseBuffer = '';

  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();

    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        const response = parseResponse(line);
        if (response) {
          console.log('Received:', JSON.stringify(response, null, 2));
        }
      }
    }
  });

  server.stderr.on('data', (data) => {
    console.error('Server error:', data.toString());
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('\nSending: tools/list');
  server.stdin.write(createRequest(1, 'tools/list', {}) + '\n');

  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('\nSending: tools/call (evolith-validate)');
  server.stdin.write(createRequest(2, 'tools/call', {
    name: 'evolith-validate',
    arguments: { path: process.cwd(), format: 'summary' }
  }) + '\n');

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\nSending: resources/list');
  server.stdin.write(createRequest(3, 'resources/list', {}) + '\n');

  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('\nShutting down...');
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 99,
    method: 'shutdown',
    params: {}
  }) + '\n');

  setTimeout(() => {
    server.kill();
    console.log('Done.');
    process.exit(0);
  }, 500);
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});