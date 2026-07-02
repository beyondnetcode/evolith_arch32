/**
 * Builds the Agent Runtime from environment variables. Policy enforcement is
 * real OPA by default; stub policy mode must be requested explicitly for local
 * offline/test deployments.
 */

import {
  createAgentRuntime,
  HarnessProcessAdapter,
  OpaCliPolicyValidationAdapter,
  StubPolicyValidationAdapter,
  HttpTrackerTraceAdapter,
  HttpCoreEvaluationAdapter,
  FileMemoryAdapter,
  type AgentRuntimeBundle,
  type AgentRuntimeOverrides,
} from '@evolith/agent-runtime';

import * as path from 'node:path';

export const AGENT_RUNTIME_BUNDLE = 'AGENT_RUNTIME_BUNDLE';

function bool(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

/** Read process.env and assemble the runtime bundle. */
export function createRuntimeFromEnv(env: NodeJS.ProcessEnv = process.env): AgentRuntimeBundle {
  let overrides: AgentRuntimeOverrides = {};

  // .harness — real process executor when a checkout/corpus is mounted.
  const harnessRoot = env.AGENT_RUNTIME_HARNESS_ROOT;
  if (harnessRoot) {
    overrides = {
      ...overrides,
      harness: new HarnessProcessAdapter({
        harnessRoot,
        cwd: env.AGENT_RUNTIME_WORKSPACE_ROOT ?? undefined,
      }),
    };
  }

  // OPA — shell out to the bundled binary by default. Stubs are explicit only,
  // so hosted runtime deployments fail closed instead of silently bypassing
  // runtime policy enforcement (GT-412).
  const policyMode = env.AGENT_RUNTIME_POLICY_MODE ?? (env.AGENT_RUNTIME_OPA_ENABLED === '0' || env.AGENT_RUNTIME_OPA_ENABLED === 'false' ? 'stub' : 'opa');
  if (policyMode === 'stub') {
    overrides = {
      ...overrides,
      policy: new StubPolicyValidationAdapter(),
    };
  } else {
    overrides = {
      ...overrides,
      policy: new OpaCliPolicyValidationAdapter({
        opaPath: env.AGENT_RUNTIME_OPA_PATH,
        policyDir: env.AGENT_RUNTIME_OPA_POLICY_DIR,
        cwd: env.AGENT_RUNTIME_WORKSPACE_ROOT ?? undefined,
      }),
    };
  }

  // Core evaluation — call the real stateless Core over HTTP (Core API
  // `/api/v1/evaluate`) instead of the deterministic stub. Without this the
  // runtime governs over a simulated Core (see GT-384).
  const coreEndpoint = env.AGENT_RUNTIME_CORE_ENDPOINT;
  if (coreEndpoint) {
    const headers: Record<string, string> = {};
    if (env.AGENT_RUNTIME_CORE_TOKEN) {
      headers.authorization = `Bearer ${env.AGENT_RUNTIME_CORE_TOKEN}`;
    }
    overrides = {
      ...overrides,
      coreEvaluation: new HttpCoreEvaluationAdapter({ endpoint: coreEndpoint, headers }),
    };
  }

  // Tracker — publish trazability events to a live Evolith Tracker over HTTP.
  const trackerEndpoint = env.AGENT_RUNTIME_TRACKER_ENDPOINT;
  if (trackerEndpoint) {
    const headers: Record<string, string> = {};
    if (env.AGENT_RUNTIME_TRACKER_TOKEN) {
      headers.authorization = `Bearer ${env.AGENT_RUNTIME_TRACKER_TOKEN}`;
    }
    overrides = {
      ...overrides,
      tracker: new HttpTrackerTraceAdapter({ endpoint: trackerEndpoint, headers }),
    };
  }

  // Durable state — persist the runtime's working memory to disk so it survives
  // a restart (GT-386). Point at a mounted volume in production; unset keeps the
  // volatile in-memory default (tests, first boot). The scheduler is not part of
  // the runtime bundle — a host scheduling loop drives `FileSchedulerAdapter`.
  const stateDir = env.AGENT_RUNTIME_STATE_DIR;
  if (stateDir) {
    overrides = {
      ...overrides,
      memory: new FileMemoryAdapter({ filePath: path.join(stateDir, 'memory.json') }),
    };
  }

  return createAgentRuntime(overrides);
}
