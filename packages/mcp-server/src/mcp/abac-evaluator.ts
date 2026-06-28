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

const READ_TOOLS = new Set([
  'evolith-ping',
  'evolith-echo',
  'evolith-read-gap-tracking',
  'evolith-read-file',
  'evolith-list-dir',
  'evolith-gate-evaluate',
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

    // ABAC-03: Unknown tool
    const isRead = READ_TOOLS.has(tool_name) || !tool_name.startsWith('evolith-') || tool_name.includes('read') || tool_name.includes('list') || tool_name.includes('get');
    const isWrite = WRITE_TOOLS.has(tool_name) || tool_name.includes('write') || tool_name.includes('replace') || tool_name.includes('run') || tool_name.includes('fix') || tool_name.includes('advance');
    const isDeploy = DEPLOY_TOOLS.has(tool_name) || tool_name.includes('deploy') || tool_name.includes('publish') || tool_name.includes('merge');

    const classified = isRead || isWrite || isDeploy;
    if (!classified) {
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
      const fs = await import('fs-extra');
      const path = await import('node:path');
      const { loadPolicy } = await import('@open-policy-agent/opa-wasm');
      
      const wasmPath = path.join(corePath, 'sdk', 'cli', 'rulesets', 'opa', 'policy.wasm');
      if (!await fs.pathExists(wasmPath)) {
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
      
      const wasmBuffer = await fs.readFile(wasmPath);
      const policy = await loadPolicy(wasmBuffer);
      
      const resultSet = policy.evaluate(input, 'evolith/abac/violations');
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
