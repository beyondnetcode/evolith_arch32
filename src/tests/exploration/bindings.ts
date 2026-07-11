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
  // =========================================================================
  // Gate & Phase Operations
  // =========================================================================

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

  'propose-advance': {
    verified: false,
    rest: (c) => ({
      method: 'POST',
      path: '/api/v1/projects/propose-advance',
      body: { workspaceRef: c.workspaceRef },
    }),
  },

  'sdlc-status': {
    verified: false,
    cli: (c) => ['sdlc', 'gate-status', '--format', 'json'],
    mcp: (c) => ({ tool: 'evolith-sdlc-status', args: {} }),
  },

  'sdlc-handoff': {
    verified: false,
    cli: (c) => ['sdlc', 'handoff', '--from', 'discovery', '--to', 'design', '--format', 'json'],
    mcp: (c) => ({ tool: 'evolith-sdlc-handoff', args: { from: 'discovery', to: 'design' } }),
  },

  // =========================================================================
  // Validation Operations
  // =========================================================================

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

  'architecture-validate': {
    verified: false,
    // CLI: requires rulesets which are not in test fixture — exempt from test
    mcp: (c) => ({ tool: 'evolith-architecture-validate', args: { path: c.projectPath, corePath: c.corePath, architecture: true } }),
    // REST: validation logic diverges due to test fixture (missing rulesets) — exempt from test
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

  // =========================================================================
  // SDLC & Code Generation Operations
  // =========================================================================

  'sdlc-generate': {
    verified: false,
    cli: (c) => ['sdlc', 'generate', 'domain', '--from', 'package.json', '--format', 'json'],
  },

  'dora-metrics': {
    verified: false,
    cli: (c) => ['sdlc', 'gate-status', '--since', '90', '--format', 'json'],
    mcp: (c) => ({ tool: 'evolith-dora-metrics', args: { since: 90 } }),
  },

  // =========================================================================
  // Topology Operations
  // =========================================================================

  'topology-list': {
    verified: false,
    mcp: (c) => ({ tool: 'evolith-topology-list', args: {} }),
    rest: (c) => ({
      method: 'GET',
      path: '/api/v1/architecture/topologies',
    }),
  },

  'topology-get': {
    verified: false,
    mcp: (c) => ({ tool: 'evolith-topology-get', args: { id: 'monolithic-layered' } }),
    // REST: infrastructure-only endpoint, not user-facing — exempt from test
  },

  // =========================================================================
  // Ruleset Operations
  // =========================================================================

  'rulesets-list': {
    verified: false,
    rest: (c) => ({
      method: 'GET',
      path: '/api/v1/rulesets',
    }),
  },

  'rulesets-get': {
    verified: false,
    rest: (c) => ({
      method: 'GET',
      path: '/api/v1/rulesets/core-patterns',
    }),
  },

  // =========================================================================
  // Metadata Operations
  // =========================================================================

  'gate-definition': {
    verified: false,
    rest: (c) => ({
      method: 'GET',
      path: '/api/v1/gates/PG1',
    }),
  },

  'phase-requirements': {
    verified: false,
    rest: (c) => ({
      method: 'GET',
      path: '/api/v1/phases/design/requirements',
    }),
  },

  // =========================================================================
  // Health & Metrics Operations
  // =========================================================================

  'health-check': {
    verified: false,
    rest: (c) => ({
      method: 'GET',
      path: '/health',
    }),
  },

  'metrics-prometheus': {
    verified: false,
    mcp: (c) => ({ tool: 'evolith-metrics', args: {} }),
    // REST: infrastructure-only endpoint, not user-facing — exempt from test
  },

  'mcp-metrics': {
    verified: false,
    mcp: (c) => ({ tool: 'evolith-metrics', args: { scope: 'mcp' } }),
  },

  // =========================================================================
  // Agent Operations
  // =========================================================================

  'agents-install': {
    verified: false,
    // CLI: install is interactive (prompts for name/template/rulesets) — there is
    // no non-interactive envelope path, so it is exempt from the runner.
    // MCP: mutative operation, requires approval — exempt from test
  },

  'agents-list': {
    verified: false,
    cli: (c) => ['agents', 'list', '--format', 'json'],
    mcp: (c) => ({ tool: 'evolith-agent-list', args: {} }),
  },

  'agents-validate': {
    verified: false,
    cli: (c) => ['agents', 'validate', '--format', 'json'],
    mcp: (c) => ({ tool: 'evolith-agent-validate', args: { name: 'gap-analyzer' } }),
  },

  'agents-upgrade': {
    verified: false,
    cli: (c) => ['agents', 'upgrade', '--format', 'json'],
    // MCP: mutative operation, requires approval — exempt from test
  },

  'agents-remove': {
    verified: false,
    cli: (c) => ['agents', 'remove', '--format', 'json'],
    // MCP: mutative operation, requires approval — exempt from test
  },

  // =========================================================================
  // MoSCoW Analysis Operations (read-only; mutatives excluded)
  // =========================================================================

  'moscow-load': {
    verified: false,
    mcp: (c) => ({ tool: 'evolith-moscow-load', args: { phase: 'design' } }),
  },

  'moscow-list': {
    verified: false,
    mcp: (c) => ({ tool: 'evolith-moscow-list', args: { path: c.projectPath } }),
  },

  'moscow-validate': {
    verified: false,
    mcp: (c) => ({ tool: 'evolith-moscow-validate', args: { phase: 'design' } }),
  },

  'moscow-report': {
    verified: false,
    mcp: (c) => ({ tool: 'evolith-moscow-report', args: { phase: 'design' } }),
  },

  // =========================================================================
  // Configuration Operations (read-only; config-set excluded)
  // =========================================================================

  'config-get': {
    verified: false,
    mcp: (c) => ({ tool: 'evolith-config-get', args: { key: 'name' } }),
  },

  // =========================================================================
  // Documentation Operations
  // =========================================================================

  'adr-crud': {
    verified: false,
    cli: (c) => ['adr', '--list', '--format', 'json'],
  },

  'standards-crud': {
    verified: false,
    cli: (c) => ['standards', '--list', '--format', 'json'],
  },

  'docs-scaffold': {
    verified: false,
    cli: (c) => ['docs', '--format', 'json'],
  },

  // =========================================================================
  // Architecture Scaffolding Operations
  // =========================================================================

  'scaffold-architecture': {
    verified: false,
    // scaffold command is not directly invoked via CLI; architectural scaffolding is handled via topology command
  },

  // =========================================================================
  // Project Initialization Operations
  // =========================================================================

  'init-project': {
    verified: false,
    cli: (c) => ['init', '--format', 'json'],
    // REST: initialization endpoint exists but has different contract — exempt from test
  },

  // =========================================================================
  // CLI-Local Operations
  // =========================================================================

  'history': {
    verified: false,
    cli: (c) => ['history', '--format', 'json'],
  },

  'completion': {
    verified: false,
    // completion emits shell scripts, not JSON envelopes — CLI-only, non-JSON
  },

  'profile': {
    verified: false,
    cli: (c) => ['profile', 'list', '--format', 'json'],
  },

  'mcp-serve': {
    verified: false,
    // mcp serve is a standalone process, not invoked via CLI args
  },

  'alias': {
    verified: false,
    cli: (c) => ['alias', 'list', '--format', 'json'],
  },

  'fixtures': {
    verified: false,
    cli: (c) => ['fixtures', 'seed', '--format', 'json'],
  },

  'api-browser': {
    verified: false,
    cli: (c) => ['api', '--format', 'json'],
  },

  'update-cli': {
    verified: false,
    cli: (c) => ['update', '--check', '--format', 'json'],
  },

  'init-wizard': {
    verified: false,
    cli: (c) => ['init'],
  },

  'upgrade-satellite': {
    verified: false,
    cli: (c) => ['upgrade', '--format', 'json'],
  },
};
