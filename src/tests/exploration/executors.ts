import * as http from 'node:http';
import request from 'supertest';
import { CommandTestFactory } from 'nest-commander-testing';
import type { TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { RawResult, EnvelopeShape } from './types';

// -------------------------------------------------------------------------
// Envelope extraction — tolerant of CLI log noise around the JSON payload.
// -------------------------------------------------------------------------

export function extractEnvelope(text: string): EnvelopeShape | null {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;
  // Fast path: the whole output is JSON.
  const direct = tryParse(trimmed);
  if (direct) return direct;
  // Fallback: scan for a JSON object embedded in mixed output (last one wins).
  const start = trimmed.indexOf('{');
  if (start >= 0) {
    for (let end = trimmed.length; end > start; end--) {
      if (trimmed[end - 1] !== '}') continue;
      const candidate = tryParse(trimmed.slice(start, end));
      if (candidate) return candidate;
    }
  }
  return null;
}

function tryParse(s: string): EnvelopeShape | null {
  try {
    const o = JSON.parse(s);
    return o && typeof o === 'object' ? (o as EnvelopeShape) : null;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------------------
// CLI — in-process via nest-commander's CommandTestFactory.
// Note: process.exit must be neutralised by the caller (the gate/validate
// commands exit non-zero on a failed verdict); this executor only reads the
// ADR-0073 envelope printed to stdout.
// -------------------------------------------------------------------------

export class CliExecutor {
  constructor(private readonly module: TestingModule) {}

  async run(operationId: string, args: string[]): Promise<RawResult> {
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...a: unknown[]) => {
      logs.push(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
    };
    let transportError: string | undefined;
    try {
      await CommandTestFactory.run(this.module, args);
    } catch (e) {
      transportError = e instanceof Error ? e.message : String(e);
    } finally {
      console.log = orig;
    }
    const rawText = logs.join('\n');
    const envelope = extractEnvelope(rawText);
    return {
      surface: 'cli',
      operationId,
      ok: envelope != null || !transportError,
      envelope,
      rawText,
      transportError: envelope == null ? transportError : undefined,
    };
  }
}

// -------------------------------------------------------------------------
// REST — supertest against the bootstrapped Core API app.
// -------------------------------------------------------------------------

export class RestExecutor {
  constructor(private readonly app: INestApplication) {}

  async run(
    operationId: string,
    method: string,
    routePath: string,
    body?: unknown,
  ): Promise<RawResult> {
    try {
      // supertest's agent is dynamically keyed by HTTP verb; typing it loosely
      // keeps the executor surface-agnostic without fighting the supertest types.
      const agent = request(this.app.getHttpServer()) as unknown as Record<string, (p: string) => any>;
      let req = agent[method.toLowerCase()](routePath);
      if (body !== undefined) req = req.send(body as object);
      const res = await req;
      const envelope =
        res.body && typeof res.body === 'object'
          ? (res.body as EnvelopeShape)
          : extractEnvelope(res.text || '');
      return {
        surface: 'rest',
        operationId,
        ok: true,
        envelope,
        rawText: typeof res.text === 'string' ? res.text : JSON.stringify(res.body),
      };
    } catch (e) {
      return {
        surface: 'rest',
        operationId,
        ok: false,
        envelope: null,
        rawText: '',
        transportError: e instanceof Error ? e.message : String(e),
      };
    }
  }
}

// -------------------------------------------------------------------------
// MCP — StreamableHTTP JSON-RPC (initialize → notifications/initialized →
// tools/call), reusing the handshake proven in the contract suite.
// -------------------------------------------------------------------------

interface McpParsed {
  result?: { content?: Array<{ text: string }> };
  error?: { message: string };
}

export class McpExecutor {
  constructor(private readonly port: number) {}

  private post(
    payload: Record<string, unknown>,
    sessionId?: string,
  ): Promise<{ headers: http.IncomingHttpHeaders; body: string }> {
    const body = JSON.stringify(payload);
    const headers: Record<string, string | number> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'Content-Length': Buffer.byteLength(body),
    };
    if (sessionId) headers['mcp-session-id'] = sessionId;
    return new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: '127.0.0.1', port: this.port, path: '/mcp', method: 'POST', headers },
        (res) => {
          let data = '';
          res.on('data', (chunk: string) => {
            data += chunk;
          });
          res.on('end', () => resolve({ headers: res.headers, body: data }));
        },
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  private static parseBody(raw: string): McpParsed {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) return JSON.parse(trimmed) as McpParsed;
    const json = trimmed
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice('data:'.length).trim())
      .join('');
    return JSON.parse(json) as McpParsed;
  }

  /** List every registered tool with its inputSchema (for the how-to generator). */
  async listTools(): Promise<Record<string, unknown>> {
    const init = await this.post({
      jsonrpc: '2.0', id: 0, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'howto', version: '1.0.0' } },
    });
    const sessionId = init.headers['mcp-session-id'] as string | undefined;
    if (!sessionId) return {};
    await this.post({ jsonrpc: '2.0', method: 'notifications/initialized' }, sessionId);
    const res = await this.post({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }, sessionId);
    const parsed = McpExecutor.parseBody(res.body) as { result?: { tools?: Array<{ name: string; inputSchema: unknown }> } };
    const tools = parsed.result?.tools ?? [];
    return Object.fromEntries(tools.map((t) => [t.name, t.inputSchema]));
  }

  async run(
    operationId: string,
    tool: string,
    args: Record<string, unknown>,
  ): Promise<RawResult> {
    try {
      const init = await this.post({
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'exploration-agent', version: '1.0.0' },
        },
      });
      const sessionId = init.headers['mcp-session-id'] as string | undefined;
      if (!sessionId) {
        return {
          surface: 'mcp',
          operationId,
          ok: false,
          envelope: null,
          rawText: init.body,
          transportError: 'MCP did not mint a session id on initialize',
        };
      }
      await this.post({ jsonrpc: '2.0', method: 'notifications/initialized' }, sessionId);
      const call = await this.post(
        { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: tool, arguments: args } },
        sessionId,
      );
      const parsed = McpExecutor.parseBody(call.body);
      if (parsed.error) {
        return {
          surface: 'mcp',
          operationId,
          ok: true,
          envelope: { success: false, error: { message: parsed.error.message } },
          rawText: call.body,
        };
      }
      const text = parsed.result?.content?.[0]?.text;
      const envelope = text ? extractEnvelope(text) : null;
      return {
        surface: 'mcp',
        operationId,
        ok: true,
        envelope,
        rawText: text || call.body,
      };
    } catch (e) {
      return {
        surface: 'mcp',
        operationId,
        ok: false,
        envelope: null,
        rawText: '',
        transportError: e instanceof Error ? e.message : String(e),
      };
    }
  }
}
