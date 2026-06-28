import { spawn, ChildProcess } from 'child_process';
import * as http from 'http';
import * as path from 'path';

/**
 * mcp-server E2E — the real MCP HTTP surface (test playbook: mcp-server).
 *
 * Spawns the built server (`node dist/main --transport http`) and drives the
 * live protocol: public `/health` liveness, fail-closed auth on `POST /`, and
 * the MCP `initialize` handshake (serverInfo + session id). Requires a prior
 * `npm run --workspace packages/mcp-server build`.
 */
const MCP_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(__dirname, '../../..');
const PORT = 55000 + Math.floor(Math.random() * 1000);
const API_KEY = 'e2e-test-key';

interface Res { status: number; headers: http.IncomingHttpHeaders; body: string }

function httpReq(method: string, p: string, headers: Record<string, string> = {}, body?: string): Promise<Res> {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://127.0.0.1:${PORT}${p}`, { method, headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

async function waitForReady(timeoutMs = 20000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await httpReq('GET', '/health');
      if (r.status === 200) return;
    } catch {
      /* server not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('mcp-server did not become ready on /health');
}

describe('mcp-server (e2e) — MCP HTTP surface', () => {
  let proc: ChildProcess;

  beforeAll(async () => {
    proc = spawn('node', ['dist/main', 'serve', '--transport', 'http', '--port', String(PORT), '--api-key', API_KEY], {
      cwd: MCP_ROOT,
      env: { ...process.env, WORKSPACE_ROOT: REPO_ROOT, CORE_PATH: REPO_ROOT },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await waitForReady();
  }, 30000);

  afterAll(() => {
    proc?.kill();
  });

  it('GET /health → 200 (public liveness, no auth)', async () => {
    const r = await httpReq('GET', '/health');
    expect(r.status).toBe(200);
  });

  it('POST / without API key → 401 (auth enforced, fail-closed)', async () => {
    const r = await httpReq('POST', '/', { 'Content-Type': 'application/json' },
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }));
    expect(r.status).toBe(401);
  });

  it('POST / initialize with API key → 200 + serverInfo + session id', async () => {
    const r = await httpReq('POST', '/', {
      'Content-Type': 'application/json',
      Accept: 'application/json,text/event-stream',
      Authorization: `Bearer ${API_KEY}`,
    }, JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'e2e', version: '1.0.0' } },
    }));
    expect(r.status).toBe(200);
    const body = JSON.parse(r.body);
    expect(body.result.serverInfo.name).toBe('evolith-mcp-server');
    expect(r.headers['mcp-session-id']).toBeTruthy();
  });
});
