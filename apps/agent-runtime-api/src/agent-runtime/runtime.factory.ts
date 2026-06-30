/**
 * Builds the Agent Runtime from environment variables, choosing real or stub
 * adapters per deployment. Defaults are safe stubs so the service boots and
 * answers requests out of the box; setting the env vars graduates each port to
 * its real adapter — with no change to the runtime or this service's logic.
 */

import {
  createAgentRuntime,
  HarnessProcessAdapter,
  OpaCliPolicyValidationAdapter,
  HttpTrackerTraceAdapter,
  HttpCoreEvaluationAdapter,
  type AgentRuntimeBundle,
  type AgentRuntimeOverrides,
} from '@evolith/agent-runtime';

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

  // OPA — shell out to the bundled binary when enabled.
  if (bool(env.AGENT_RUNTIME_OPA_ENABLED)) {
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

  return createAgentRuntime(overrides);
}
