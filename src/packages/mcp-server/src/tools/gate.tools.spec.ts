import * as path from 'node:path';
import { NodeFileSystemProvider, NoOpLoggerProvider } from '@evolith/infra-providers';
import { createGateTools } from './gate.tools';
import { createPhaseAdvanceTools } from './phase-advance.tools';
import { McpTool } from '../mcp/tool.interface';

const noopWebhook = { notify: async () => undefined };
const fs = new NodeFileSystemProvider().createFileSystem();
const logger = new NoOpLoggerProvider().createLogger('test');
const REPO_ROOT = path.resolve(__dirname, '../../../..');

function tool(tools: McpTool[]): McpTool {
  return tools[0];
}

describe('gate + phase-advance tools (raw payloads, server-wrapped envelope)', () => {
  it('throws PHASE_INVALID for an unknown gate phase', async () => {
    await expect(
      tool(createGateTools(noopWebhook, fs, logger)).execute({ phase: 'nope', projectPath: '/r' }),
    ).rejects.toMatchObject({ code: 'PHASE_INVALID' });
  });

  it('throws IO_ERROR when projectPath is missing for a valid phase', async () => {
    await expect(
      tool(createGateTools(noopWebhook, fs, logger)).execute({ phase: 'discovery', projectPath: '' }),
    ).rejects.toMatchObject({ code: 'IO_ERROR' });
  });

  it('throws PHASE_INVALID for an unknown phase-advance fromPhase', async () => {
    await expect(
      tool(createPhaseAdvanceTools(noopWebhook, fs, logger)).execute({
        fromPhase: 'bogus',
        toPhase: 'design',
        projectPath: '/r',
      }),
    ).rejects.toMatchObject({ code: 'PHASE_INVALID' });
  });

  it('evaluates a real gate and returns raw GateEvidence', async () => {
    const res = (await tool(createGateTools(noopWebhook, fs, logger)).execute({
      phase: 'discovery',
      projectPath: REPO_ROOT,
      corePath: REPO_ROOT,
      evidenceMode: 'summary',
    })) as { phase: string; verdict: string; summary: { errors: number; warnings: number } };
    expect(res.phase).toBe('discovery');
    expect(typeof res.verdict).toBe('string');
    expect(res.summary).toBeDefined();
  });

  it('proposes a real phase advance and returns a raw proposal', async () => {
    const res = (await tool(createPhaseAdvanceTools(noopWebhook, fs, logger)).execute({
      fromPhase: 'discovery',
      toPhase: 'design',
      projectPath: REPO_ROOT,
      corePath: REPO_ROOT,
    })) as Record<string, unknown>;
    expect(res).toBeDefined();
    expect(typeof res).toBe('object');
  });
});
