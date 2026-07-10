import { BindingCtx } from './types';

// -------------------------------------------------------------------------
// Per-operation invocation builders for the cross-surface triangle.
//
// `verified: true` means the three invocations are KNOWN to be semantically
// equivalent (so a verdict divergence is a CONFIRMED finding). Only
// `gate-evaluate` is verified today — it is the operation the contract suite
// (src/tests/contract/roundtrip-gate-evaluate.spec.ts) already proves equivalent
// across CLI/MCP/REST. The rest run in HYPOTHESIS mode: divergences are reported
// with low confidence until their argument equivalence is validated and promoted.
//
// Mutative operations (satellite-create/adopt, moscow-*, config-set, auto-fix)
// are intentionally NOT bound here — the default runner is read-only/safe.
// -------------------------------------------------------------------------

export interface Binding {
  verified: boolean;
  cli?: (ctx: BindingCtx) => string[];
  mcp?: (ctx: BindingCtx) => { tool: string; args: Record<string, unknown> };
  rest?: (ctx: BindingCtx) => { method: string; path: string; body?: unknown };
}

export const BINDINGS: Record<string, Binding> = {
  'gate-evaluate': {
    verified: true,
    cli: (c) => [
      'gate', 'evaluate',
      '--phase', 'discovery',
      '--project', c.projectPath,
      '--core', c.corePath,
      '--evaluated-by', 'ci',
      '--format', 'json',
    ],
    mcp: (c) => ({
      tool: 'evolith-gate-evaluate',
      args: { phase: 'discovery', projectPath: c.projectPath, corePath: c.corePath, evaluatedBy: 'ci' },
    }),
    rest: (c) => ({
      method: 'POST',
      path: '/api/v1/gates/PG1/evaluate',
      body: { workspaceRef: c.workspaceRef, evaluatedBy: 'ci' },
    }),
  },

  'detect-drift': {
    verified: false,
    cli: (c) => ['drift', '--path', c.projectPath, '--format', 'json'],
    mcp: (c) => ({ tool: 'evolith-drift-detect', args: { path: c.projectPath, corePath: c.corePath } }),
    rest: (c) => ({
      method: 'POST',
      path: '/api/v1/architecture/detect-drift',
      body: { workspaceRef: c.workspaceRef },
    }),
  },

  'validate-satellite': {
    verified: false,
    cli: (c) => ['validate', '--satellite', c.projectPath, '--core', c.corePath, '--format', 'json'],
    mcp: (c) => ({ tool: 'evolith-validate', args: { path: c.projectPath, corePath: c.corePath } }),
    rest: (c) => ({
      method: 'POST',
      path: '/api/v1/architecture/validate-satellite',
      body: { workspaceRef: c.workspaceRef },
    }),
  },

  'phase-advance': {
    verified: false,
    cli: (c) => [
      'phase', 'advance',
      '--from', 'discovery', '--to', 'design',
      '--satellite', c.projectPath, '--core', c.corePath,
      '--evaluated-by', 'ci', '--format', 'json',
    ],
    mcp: (c) => ({
      tool: 'evolith-phase-advance',
      args: { fromPhase: 'discovery', toPhase: 'design', projectPath: c.projectPath, evaluatedBy: 'ci' },
    }),
    rest: (c) => ({
      method: 'POST',
      path: '/api/v1/phases/transition',
      body: { from: 'discovery', to: 'design', tools: [], workspaceRef: c.workspaceRef },
    }),
  },
};
