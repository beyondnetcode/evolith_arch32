import * as path from 'node:path';
import { createGateTools } from './gate.tools';
import { createPhaseAdvanceTools } from './phase-advance.tools';
import { McpTool } from '../mcp/tool.interface';

const noopWebhook = { notify: async () => undefined };
const REPO_ROOT = path.resolve(__dirname, '../../../..');

function tool(tools: McpTool[]): McpTool {
  return tools[0];
}

describe('gate + phase-advance tools (validation envelopes)', () => {
  it('returns INVALID_PHASE for an unknown gate phase', async () => {
    const res = (await tool(createGateTools(noopWebhook)).execute({ phase: 'nope', projectPath: '/r' })) as {
      success: boolean;
      error: { code: string };
    };
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('INVALID_PHASE');
  });

  it('returns IO_ERROR when projectPath is missing for a valid phase', async () => {
    const res = (await tool(createGateTools(noopWebhook)).execute({ phase: 'discovery', projectPath: '' })) as {
      error: { code: string };
    };
    expect(res.error.code).toBe('IO_ERROR');
  });

  it('returns INVALID_PHASE for an unknown phase-advance fromPhase', async () => {
    const res = (await tool(createPhaseAdvanceTools(noopWebhook)).execute({
      fromPhase: 'bogus',
      toPhase: 'design',
      projectPath: '/r',
    })) as { error: { code: string } };
    expect(res.error.code).toBe('INVALID_PHASE');
  });

  it('evaluates a real gate and returns an envelope with meta', async () => {
    const res = (await tool(createGateTools(noopWebhook)).execute({
      phase: 'discovery',
      projectPath: REPO_ROOT,
      corePath: REPO_ROOT,
      evidenceMode: 'summary',
    })) as { success: boolean; meta: { correlationId: string } };
    expect(typeof res.success).toBe('boolean');
    expect(res.meta.correlationId).toBeDefined();
  });

  it('proposes a real phase advance and returns an envelope with meta', async () => {
    const res = (await tool(createPhaseAdvanceTools(noopWebhook)).execute({
      fromPhase: 'discovery',
      toPhase: 'design',
      projectPath: REPO_ROOT,
      corePath: REPO_ROOT,
    })) as { success: boolean; meta: { correlationId: string } };
    expect(typeof res.success).toBe('boolean');
    expect(res.meta.correlationId).toBeDefined();
  });
});
