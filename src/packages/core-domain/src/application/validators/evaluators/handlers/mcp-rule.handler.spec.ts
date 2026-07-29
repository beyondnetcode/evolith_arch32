import * as path from 'path';
import { McpRuleHandler } from './mcp-rule.handler';
import { NormalizedRule } from '../../../../domain/models/normalized-rule';

const CORE = '/core';
const ctx = { satellitePath: '/sat', corePath: CORE };
const evDir = path.join(CORE, '.harness', 'evidence');

function fsMock(cfg: { existing?: string[]; dirs?: Record<string, string[]>; files?: Record<string, string> } = {}) {
  const existing = new Set(cfg.existing ?? []);
  return {
    exists: jest.fn(async (p: string) => existing.has(p)),
    readdirNames: jest.fn(async (p: string) => cfg.dirs?.[p] ?? []),
    readFile: jest.fn(async (p: string) => cfg.files?.[p] ?? ''),
  } as unknown;
}

function rule(id: string): NormalizedRule {
  return { id, severity: 'MUST', category: 'mcp', title: 't', description: 'd', blocking: true, sourceFile: 's' };
}

describe('McpRuleHandler', () => {
  it('canHandle matches MCP- prefix', () => {
    expect(new McpRuleHandler(fsMock()).canHandle(rule('MCP-01'))).toBe(true);
    expect(new McpRuleHandler(fsMock()).canHandle(rule('DEP-01'))).toBe(false);
  });

  it('skips when no mcp smoke evidence exists', async () => {
    const h = new McpRuleHandler(fsMock({ existing: [evDir], dirs: { [evDir]: ['other.json'] } }));
    expect((await h.evaluate(rule('MCP-01'), ctx)).result).toBe('skipped');
  });

  it('MCP-01 fails when initialize is missing and passes when present', async () => {
    const file = path.join(evDir, 'mcp-smoke.json');
    const fail = new McpRuleHandler(fsMock({
      existing: [evDir], dirs: { [evDir]: ['mcp-smoke.json'] }, files: { [file]: JSON.stringify({ results: {} }) },
    }));
    expect((await fail.evaluate(rule('MCP-01'), ctx)).result).toBe('failed');

    const pass = new McpRuleHandler(fsMock({
      existing: [evDir], dirs: { [evDir]: ['mcp-smoke.json'] }, files: { [file]: JSON.stringify({ results: { initialize: {} } }) },
    }));
    expect((await pass.evaluate(rule('MCP-01'), ctx)).result).toBe('passed');
  });

  it('fails when the evidence has no results field', async () => {
    const file = path.join(evDir, 'mcp-smoke.json');
    const h = new McpRuleHandler(fsMock({
      existing: [evDir], dirs: { [evDir]: ['mcp-smoke.json'] }, files: { [file]: JSON.stringify({}) },
    }));
    expect((await h.evaluate(rule('MCP-02'), ctx)).result).toBe('failed');
  });

  it('MCP-04 checks the server transport for an apiKey/local restriction', async () => {
    const server = path.join(CORE, 'src', 'packages', 'mcp-server', 'src', 'mcp', 'mcp-server.service.ts');
    const skip = new McpRuleHandler(fsMock());
    expect((await skip.evaluate(rule('MCP-04'), ctx)).result).toBe('skipped');

    const pass = new McpRuleHandler(fsMock({ existing: [server], files: { [server]: 'const apiKey = process.env.KEY' } }));
    expect((await pass.evaluate(rule('MCP-04'), ctx)).result).toBe('passed');

    const fail = new McpRuleHandler(fsMock({ existing: [server], files: { [server]: 'const open = true' } }));
    expect((await fail.evaluate(rule('MCP-04'), ctx)).result).toBe('failed');
  });

  it('skips unhandled MCP rules', async () => {
    expect((await new McpRuleHandler(fsMock()).evaluate(rule('MCP-99'), ctx)).result).toBe('skipped');
  });
});
