/**
 * Builds the Agent Runtime from environment variables.
 *
 * ── Production vs dev profile (GT-438) ───────────────────────────────────────
 * A single switch — `AGENT_RUNTIME_PROFILE` — governs the whole adapter set:
 *
 *   dev (default, and `test`/`development`/`local`)
 *     The deterministic stubs + in-memory state are the explicit default, so
 *     the runtime boots offline with no live Core, no engine and no volume.
 *     Any real adapter is still opt-in per env var (endpoint, engine, …).
 *
 *   production
 *     The real adapters are mandatory and the factory FAILS LOUD instead of
 *     silently degrading to a stub:
 *       · Core evaluation MUST be the real HTTP Core — `AGENT_RUNTIME_CORE_ENDPOINT`
 *         (+ `AGENT_RUNTIME_CORE_TOKEN`, since the Core API is authenticated).
 *       · Working memory MUST be durable — `AGENT_RUNTIME_STATE_DIR` on a mounted
 *         volume (the same dir also backs the durable `FileSchedulerAdapter`
 *         driven by the host scheduling loop).
 *       · Policy validation MUST be real OPA — an explicit stub request is refused.
 *     The reasoning engine (Hermes/Swarms/routing/Cowork) is wired by
 *     `AGENT_RUNTIME_ENGINE` where a client is available; it stays GT-385-gated,
 *     so an unset engine keeps the deterministic stub in EVERY profile.
 *
 * Regardless of profile, setting a real adapter's env var always graduates that
 * one port (e.g. `AGENT_RUNTIME_CORE_ENDPOINT` under dev still uses the HTTP Core),
 * which keeps the endpoint-driven local-kind wiring backward compatible.
 */

import {
  createAgentRuntime,
  HarnessProcessAdapter,
  OpaCliPolicyValidationAdapter,
  StubPolicyValidationAdapter,
  HttpTrackerTraceAdapter,
  CompositeTrackerTraceAdapter,
  OpenTelemetryTrackerTraceAdapter,
  FileTrackerTraceAdapter,
  HttpCoreEvaluationAdapter,
  FileMemoryAdapter,
  HermesAgentAdapter,
  SwarmsAgentAdapter,
  CoworkAgentEngineAdapter,
  type AgentRuntimeBundle,
  type AgentRuntimeOverrides,
  type EngineRouterConfig,
} from '@beyondnet/evolith-agent-runtime';

import * as path from 'node:path';
import { trace } from '@opentelemetry/api';

export const AGENT_RUNTIME_BUNDLE = 'AGENT_RUNTIME_BUNDLE';

export type RuntimeProfile = 'production' | 'dev';

function bool(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

/**
 * Resolve the deployment profile from `AGENT_RUNTIME_PROFILE`. Unset (and the
 * dev-family aliases) keep the safe stub default; an unrecognized value fails
 * loud so a typo never silently downgrades a production deployment to dev.
 */
export function resolveProfile(env: NodeJS.ProcessEnv = process.env): RuntimeProfile {
  const raw = (env.AGENT_RUNTIME_PROFILE ?? '').trim().toLowerCase();
  switch (raw) {
    case 'production':
    case 'prod':
      return 'production';
    case '':
    case 'dev':
    case 'development':
    case 'local':
    case 'test':
      return 'dev';
    default:
      throw new Error(
        `[agent-runtime] unknown AGENT_RUNTIME_PROFILE '${env.AGENT_RUNTIME_PROFILE}'. Use 'production' or 'dev'.`,
      );
  }
}

/** Read process.env and assemble the runtime bundle. */
export function createRuntimeFromEnv(env: NodeJS.ProcessEnv = process.env): AgentRuntimeBundle {
  let overrides: AgentRuntimeOverrides = {};
  const profile = resolveProfile(env);
  const isProd = profile === 'production';

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
  // runtime policy enforcement (GT-412). Under the production profile a stub
  // request is refused outright (GT-438): production never runs on stub policy.
  const policyMode = env.AGENT_RUNTIME_POLICY_MODE ?? (env.AGENT_RUNTIME_OPA_ENABLED === '0' || env.AGENT_RUNTIME_OPA_ENABLED === 'false' ? 'stub' : 'opa');
  if (policyMode === 'stub') {
    if (isProd) {
      throw new Error(
        '[agent-runtime] stub policy validation is refused under AGENT_RUNTIME_PROFILE=production. ' +
          'Configure real OPA (leave AGENT_RUNTIME_POLICY_MODE unset and AGENT_RUNTIME_OPA_ENABLED unset/true).',
      );
    }
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
  // runtime governs over a simulated Core (see GT-384). Under the production
  // profile the endpoint (and its token) are MANDATORY: the factory fails loud
  // rather than silently governing over the stub Core (GT-438).
  const coreEndpoint = env.AGENT_RUNTIME_CORE_ENDPOINT;
  const coreToken = env.AGENT_RUNTIME_CORE_TOKEN;
  if (coreEndpoint) {
    if (isProd && !coreToken) {
      throw new Error(
        '[agent-runtime] AGENT_RUNTIME_PROFILE=production requires AGENT_RUNTIME_CORE_TOKEN alongside ' +
          'AGENT_RUNTIME_CORE_ENDPOINT — the real Core API is authenticated and must not be called unauthenticated.',
      );
    }
    const headers: Record<string, string> = {};
    if (coreToken) {
      headers.authorization = `Bearer ${coreToken}`;
    }
    overrides = {
      ...overrides,
      coreEvaluation: new HttpCoreEvaluationAdapter({ endpoint: coreEndpoint, headers }),
    };
  } else if (isProd) {
    throw new Error(
      '[agent-runtime] AGENT_RUNTIME_PROFILE=production requires AGENT_RUNTIME_CORE_ENDPOINT ' +
        '(the real Core API /api/v1/evaluate). Refusing to fall back to StubCoreEvaluationAdapter in production.',
    );
  }

  // Reasoning engine — Hermes/Swarms/Cowork/routing behind IAgentEnginePort,
  // wired by AGENT_RUNTIME_ENGINE where a client/module is available (GT-385).
  // Unset (or 'stub') keeps the deterministic StubAgentEngineAdapter in EVERY
  // profile: the real engine is decision-gated, so production does not fail loud
  // on it — it graduates only once an engine is genuinely configured.
  const engineName = (env.AGENT_RUNTIME_ENGINE ?? '').trim().toLowerCase();
  if (engineName && engineName !== 'stub') {
    switch (engineName) {
      case 'hermes':
        overrides = { ...overrides, engine: new HermesAgentAdapter() };
        break;
      case 'swarms':
        overrides = { ...overrides, engine: new SwarmsAgentAdapter() };
        break;
      case 'cowork':
        overrides = { ...overrides, engine: new CoworkAgentEngineAdapter() };
        break;
      case 'routing': {
        const rawRouter = env.AGENT_RUNTIME_ENGINE_ROUTER;
        if (!rawRouter) {
          throw new Error(
            "[agent-runtime] AGENT_RUNTIME_ENGINE=routing requires AGENT_RUNTIME_ENGINE_ROUTER " +
              '(a JSON EngineRouterConfig: {"defaultEngine":"stub","routes":[...]}).',
          );
        }
        let routerConfig: EngineRouterConfig;
        try {
          routerConfig = JSON.parse(rawRouter) as EngineRouterConfig;
        } catch (err) {
          throw new Error(
            `[agent-runtime] AGENT_RUNTIME_ENGINE_ROUTER is not valid JSON: ${(err as Error).message}`,
          );
        }
        overrides = { ...overrides, engineRouterConfig: routerConfig };
        break;
      }
      default:
        throw new Error(
          `[agent-runtime] unknown AGENT_RUNTIME_ENGINE '${env.AGENT_RUNTIME_ENGINE}'. ` +
            "Use 'hermes', 'swarms', 'cowork', 'routing' or 'stub'.",
        );
    }
  }

  // Tracker — publish trazability events to multiple destinations (Tracker HTTP, File JSONL, OTel).
  const trackerAdapters: any[] = [];
  
  const trackerEndpoint = env.AGENT_RUNTIME_TRACKER_ENDPOINT;
  if (trackerEndpoint) {
    const headers: Record<string, string> = {};
    if (env.AGENT_RUNTIME_TRACKER_TOKEN) {
      headers.authorization = `Bearer ${env.AGENT_RUNTIME_TRACKER_TOKEN}`;
    }
    trackerAdapters.push(new HttpTrackerTraceAdapter({ endpoint: trackerEndpoint, headers }));
  }

  // GT-420: Local file tracing (LLM Context)
  const auditDir = env.AGENT_RUNTIME_AUDIT_DIR;
  if (auditDir) {
    trackerAdapters.push(new FileTrackerTraceAdapter({ directory: auditDir }));
  }

  // GT-420: OpenTelemetry tracing (Grafana)
  if (bool(env.AGENT_RUNTIME_OTEL_ENABLED)) {
    const tracer = trace.getTracer('evolith-agent-runtime');
    trackerAdapters.push(new OpenTelemetryTrackerTraceAdapter({ tracer }));
  }

  if (trackerAdapters.length > 0) {
    overrides = {
      ...overrides,
      tracker: new CompositeTrackerTraceAdapter(trackerAdapters),
    };
  }

  // Durable state — persist the runtime's working memory to disk so it survives
  // a restart (GT-386). Point at a mounted volume in production; under dev an
  // unset dir keeps the volatile in-memory default (tests, first boot). Under
  // the production profile a durable dir is MANDATORY (GT-438): the factory
  // fails loud rather than running production on volatile memory. The same dir
  // also backs the durable `FileSchedulerAdapter` driven by the host scheduling
  // loop (the scheduler is not part of the runtime bundle).
  const stateDir = env.AGENT_RUNTIME_STATE_DIR;
  if (stateDir) {
    overrides = {
      ...overrides,
      memory: new FileMemoryAdapter({ filePath: path.join(stateDir, 'memory.json') }),
    };
  } else if (isProd) {
    throw new Error(
      '[agent-runtime] AGENT_RUNTIME_PROFILE=production requires AGENT_RUNTIME_STATE_DIR ' +
        '(durable memory + scheduler state on a mounted volume). Refusing to run production on volatile in-memory state.',
    );
  }

  return createAgentRuntime(overrides);
}
