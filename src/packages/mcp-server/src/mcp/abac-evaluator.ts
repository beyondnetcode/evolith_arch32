import { Injectable } from '@nestjs/common';

export interface AbacUserInput {
  id: string;
  roles: string[];
  tenant: string;
}

export interface AbacInput {
  user: AbacUserInput;
  tool_name: string;
  resource_domain: string;
  environment: string;
}

export interface AbacDecision {
  allowed: boolean;
  violations: Array<{ id: string; message: string }>;
}

const DEVELOPER_ROLES = new Set(['developer', 'qa']);
const OPERATOR_ROLES = new Set(['operator', 'sre']);
const ARCHITECT_ROLES = new Set(['architect', 'admin']);

/** Verb class an ABAC decision is scoped against. */
export type ToolClass = 'read' | 'write' | 'deploy';

/**
 * Explicit ABAC classification for EVERY registered MCP tool.
 *
 * This is the source of truth the native evaluator consults BEFORE falling back
 * to name heuristics. The previous heuristic-only approach silently denied any
 * tool whose name lacked a magic substring (read/list/get/write/…), which left
 * governance-critical tools like `evolith-evaluate`, `evolith-drift-detect`,
 * `evolith-topology-recommend` and `evolith-phase-artifacts-evaluate`
 * unclassified → ABAC-03 → denied before OPA even ran.
 *
 * Keep this map in lockstep with the registered tool surface
 * (`tools.module.ts` / `tools-registration`). A guard test
 * (`abac-classification-coverage.spec.ts`) fails the build if a registered tool
 * has no entry here, so drift cannot silently reintroduce ABAC-03 denials.
 *
 * Verb rationale:
 * - read   → non-mutating: catalogs, status, evaluations, metrics, reports.
 * - write  → mutates repo/config/agents/satellites or advances phase/handoff.
 * - deploy → release/merge/deploy-class operations (none registered today, but
 *            reserved for the deploy tools the native rules gate in production).
 */
const TOOL_CLASSIFICATION: Record<string, ToolClass> = {
  // Core validation / evaluation (read: analysis, no mutation)
  'evolith-validate': 'read',
  'evolith-evaluate': 'read',
  'evolith-composable-validate': 'read',
  'evolith-architecture-validate': 'read',
  'evolith-drift-detect': 'read',
  'evolith-gate-evaluate': 'read',
  'evolith-phase-artifacts-evaluate': 'read',

  // Topology catalog / advisory (read)
  'evolith-topology-list': 'read',
  'evolith-topology-get': 'read',
  'evolith-topology-recommend': 'read',

  // Canonical pattern catalog (read: PAT-NNNN records, no mutation)
  'evolith-pattern-list': 'read',
  'evolith-pattern-get': 'read',
  'evolith-pattern-list-by-topology': 'read',

  // MoSCoW (create/update/remove/load mutate the backing file; the rest read)
  'evolith-moscow-create': 'write',
  'evolith-moscow-load': 'read',
  'evolith-moscow-update': 'write',
  'evolith-moscow-remove': 'write',
  'evolith-moscow-list': 'read',
  'evolith-moscow-validate': 'read',
  'evolith-moscow-report': 'read',

  // SDLC (status reads; handoff advances/mutates)
  'evolith-sdlc-status': 'read',
  'evolith-sdlc-handoff': 'write',

  // Metrics (read)
  'evolith-dora-metrics': 'read',
  'evolith-metrics': 'read',

  // Config (get reads; set mutates)
  'evolith-config-get': 'read',
  'evolith-config-set': 'write',

  // Auto-fix (mutating)
  'evolith-auto-fix': 'write',

  // Phase advance — GT-379: a NON-BINDING, read-only proposal. The handler
  // (ProposePhaseAdvanceUseCase) evaluates the current phase's exit criteria and
  // returns a recommendation WITHOUT mutating canonical state; it never advances
  // the phase. Classifying it `read` keeps ABAC consistent with the HITL gate
  // (GT-475): the dispatch requires { apply, approvalToken } for `mutative` tools,
  // and every ABAC-`write` tool MUST declare `mutative:true` — a read-only
  // proposal must be neither, so it is `read` (and carries no `mutative` flag).
  'evolith-phase-advance': 'read',

  // Agents (list/validate read; install/upgrade/remove/run mutate)
  'evolith-agent-list': 'read',
  'evolith-agent-validate': 'read',
  'evolith-agent-install': 'write',
  'evolith-agent-upgrade': 'write',
  'evolith-agent-remove': 'write',
  'evolith-agent-run': 'write',

  // Satellites (list/status read; create/adopt mutate)
  'evolith-satellite-list': 'read',
  'evolith-satellite-status': 'read',
  'evolith-satellite-create': 'write',
  'evolith-satellite-adopt': 'write',

  // MCP<->CLI parity tools (3-surface conformance audit, Waves 4/6).
  'evolith-adr-list': 'read',
  'evolith-adr-get': 'read',
  'evolith-adr-matrix': 'read',
  'evolith-adr-create': 'write',
  'evolith-adr-update': 'write',
  'evolith-docs-scaffold': 'write',
  'evolith-init-batch': 'write',
  'evolith-sdlc-generate': 'write',
  'evolith-upgrade-plan': 'read',
  'evolith-upgrade-apply': 'write',
  'evolith-fixtures': 'write',
  'evolith-scaffold': 'write',
};

const READ_TOOLS = new Set([
  'evolith-ping',
  'evolith-echo',
  'evolith-read-gap-tracking',
  'evolith-read-file',
  'evolith-list-dir',
  'evolith-gate-status',
  'read-tool',
]);

const WRITE_TOOLS = new Set([
  'evolith-write-file',
  'evolith-replace-file',
  'evolith-run-command',
  'write-tool',
]);

const DEPLOY_TOOLS = new Set([
  'evolith-deploy',
  'evolith-merge-branch',
  'evolith-publish-release',
]);

@Injectable()
export class AbacEvaluator {
  // GT-348: cache compiled OPA policies by wasm path, invalidated on file mtime
  // change. AbacEvaluator is a singleton, so this persists across dispatches.
  private readonly policyCache = new Map<string, { mtimeMs: number; policy: any }>();

  /** All tool names with an explicit ABAC classification (guard-test surface). */
  static classifiedToolNames(): string[] {
    return Object.keys(TOOL_CLASSIFICATION);
  }

  /**
   * Resolve a tool's verb class. Consults the explicit {@link TOOL_CLASSIFICATION}
   * map first (authoritative for the registered surface), then falls back to the
   * legacy static sets and name heuristics for out-of-band names (e.g. test
   * fixtures, ping/echo). Returns `undefined` when the tool cannot be classified
   * at all → ABAC-03.
   */
  classifyTool(tool_name: string): ToolClass | undefined {
    const explicit = TOOL_CLASSIFICATION[tool_name];
    if (explicit) return explicit;

    if (DEPLOY_TOOLS.has(tool_name) || tool_name.includes('deploy') || tool_name.includes('publish') || tool_name.includes('merge')) {
      return 'deploy';
    }
    if (WRITE_TOOLS.has(tool_name) || tool_name.includes('write') || tool_name.includes('replace') || tool_name.includes('run') || tool_name.includes('fix') || tool_name.includes('advance')) {
      return 'write';
    }
    if (READ_TOOLS.has(tool_name) || !tool_name.startsWith('evolith-') || tool_name.includes('read') || tool_name.includes('list') || tool_name.includes('get')) {
      return 'read';
    }
    return undefined;
  }

  evaluateNative(input: AbacInput): AbacDecision {
    const { user, tool_name, environment } = input;
    const roles = user?.roles || [];
    const violations: Array<{ id: string; message: string }> = [];

    // ABAC-02: No roles present
    if (roles.length === 0) {
      return {
        allowed: false,
        violations: [{ id: 'ABAC-02', message: 'No roles present on user context; all tool calls denied' }],
      };
    }

    // ABAC-03: Unknown tool. Explicit classification wins; heuristics are fallback.
    const toolClass = this.classifyTool(tool_name);
    const isRead = toolClass === 'read';
    const isWrite = toolClass === 'write';
    const isDeploy = toolClass === 'deploy';

    if (!toolClass) {
      return {
        allowed: false,
        violations: [{ id: 'ABAC-03', message: 'Unknown tool requested; not in any known classification' }],
      };
    }

    const hasRole = (roleSet: Set<string>) => roles.some(role => roleSet.has(role));

    let allowed = false;
    let denied = false;

    // Allow read tools for ALL authenticated users with roles
    if (isRead && roles.length > 0) {
      allowed = true;
    }

    // Allow write tools for operator and architect roles
    if (isWrite && (hasRole(OPERATOR_ROLES) || hasRole(ARCHITECT_ROLES))) {
      allowed = true;
    }

    // Allow write tools in non-production environments for developers
    if (isWrite && hasRole(DEVELOPER_ROLES) && environment !== 'production') {
      allowed = true;
    }

    // Allow deploy tools ONLY for architects and operators
    if (isDeploy && (hasRole(ARCHITECT_ROLES) || hasRole(OPERATOR_ROLES))) {
      allowed = true;
    }

    // Block ALL deploy tools in production unless user is architect
    if (isDeploy && environment === 'production' && !hasRole(ARCHITECT_ROLES)) {
      denied = true;
    }

    if (denied) {
      violations.push({
        id: 'ABAC-01',
        message: `Tool '${tool_name}' explicitly denied for user '${user.id}' with roles [${roles.join(', ')}] in environment '${environment}'`,
      });
    } else if (!allowed) {
      violations.push({
        id: 'ABAC-01',
        message: `Tool '${tool_name}' not allowed for user '${user.id}' with roles [${roles.join(', ')}] in environment '${environment}'`,
      });
    }

    return {
      allowed: allowed && !denied,
      violations,
    };
  }

  async evaluateOpa(input: AbacInput, corePath: string): Promise<AbacDecision> {
    try {
      // Use node:fs/promises (not fs-extra): under the runtime's ESM build
      // (module: nodenext) `await import('fs-extra')` returns a namespace whose
      // CJS members live on `.default`, so `fs.stat` would be undefined and throw
      // "fs.stat is not a function", crashing the OPA policy load for every call.
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      // @ts-ignore: opa-wasm lacks types
      const { loadPolicy } = await import('@open-policy-agent/opa-wasm');
      
      const wasmPath = path.join(corePath, 'sdk', 'cli', 'rulesets', 'opa', 'policy.wasm');

      // GT-348/349: stat the policy directly (no check-then-use TOCTOU race). A
      // missing policy surfaces as ENOENT and is handled fail-closed below.
      let stat;
      try {
        stat = await fs.stat(wasmPath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
          // GT-349: never fail open. A missing ABAC policy must NOT silently grant
          // the OPA decision (which could bypass rules OPA enforces beyond native).
          // In production this is a hard deny (fail-closed). In non-production the
          // OPA layer abstains and the native policy — also enforced by the caller
          // (native AND opa) — governs, so access is still gated.
          if (input.environment === 'production') {
            return {
              allowed: false,
              violations: [{
                id: 'ABAC_POLICY_MISSING',
                message: `ABAC policy not found at ${wasmPath}; denying in production (fail-closed). Compile the OPA policy (.rego -> policy.wasm).`,
              }],
            };
          }
          return { allowed: true, violations: [] };
        }
        throw err;
      }

      // GT-348: reuse the compiled policy; only reload when the wasm changes.
      let cached = this.policyCache.get(wasmPath);
      if (!cached || cached.mtimeMs !== stat.mtimeMs) {
        const wasmBuffer = await fs.readFile(wasmPath);
        const policy = await loadPolicy(wasmBuffer);
        cached = { mtimeMs: stat.mtimeMs, policy };
        this.policyCache.set(wasmPath, cached);
      }

      const resultSet = cached.policy.evaluate(input, 'evolith/abac/violations');
      const violationsList = (resultSet && resultSet[0] && Array.isArray(resultSet[0].result))
        ? resultSet[0].result
        : [];
      
      return {
        allowed: violationsList.length === 0,
        violations: violationsList.map((v: any) => ({ id: v.id, message: v.message })),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        allowed: false,
        violations: [{ id: 'OPA_ERROR', message: `OPA Engine Error: ${msg}` }],
      };
    }
  }
}
