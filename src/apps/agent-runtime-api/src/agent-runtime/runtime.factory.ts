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
  FsWorkspaceContextAdapter,
  FileMemoryAdapter,
  HermesAgentAdapter,
  SwarmsAgentAdapter,
  CoworkAgentEngineAdapter,
  InMemoryKnowledgeAdapter,
  PgVectorKnowledgeAdapter,
  PGVECTOR_KNOWLEDGE_DIM,
  TrackerApprovalAdapter,
  TrackerApprovalHttpClient,
  CircuitBreaker,
  type EmbedQuery,
  type AgentRuntimeBundle,
  type AgentRuntimeOverrides,
  type EngineRouterConfig,
  type IKnowledgePort,
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

/**
 * Build an `EmbedQuery` seam that calls the GT-539 on-perimeter Qwen3 inference
 * sidecar over HTTP. Model-agnostic: the endpoint and model id are env-driven so
 * a model swap is config, not code (ADR-0090 §3 / ADR-0112 §1,§4). Accepts the
 * OpenAI-style `{data:[{embedding}]}`, TEI-style `[[...]]`, or `{embeddings}`
 * response shapes — the same shapes the write-side embedder tolerates.
 */
export function makeSidecarEmbedder(url: string, model?: string): EmbedQuery {
  return async (text: string): Promise<number[]> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input: [text], model }),
    });
    if (!res.ok) {
      throw new Error(
        `[agent-runtime] RAG embed sidecar ${url} returned ${res.status} ${res.statusText}`,
      );
    }
    const body: any = await res.json();
    const pick = (e: any) => (Array.isArray(e) ? e : e && e.embedding);
    let vec: unknown;
    if (Array.isArray(body)) vec = pick(body[0]);
    else if (Array.isArray(body?.data)) vec = pick(body.data[0]);
    else if (Array.isArray(body?.embeddings)) vec = pick(body.embeddings[0]);
    if (!Array.isArray(vec)) {
      throw new Error(
        `[agent-runtime] RAG embed sidecar ${url} returned an unparseable embedding body`,
      );
    }
    return vec as number[];
  };
}

/**
 * Build the ADR-0011 breaker guarding one outbound dependency (GT-443).
 *
 * Defaults are deliberately conservative for a service-to-service call inside a
 * cluster: 5 consecutive failures trip it, a 10 s per-call ceiling turns a hang
 * into a fast failure, and a 30 s cooldown admits a single trial call. Tunable
 * per deployment; `AGENT_RUNTIME_BREAKER_ENABLED=false` opts out entirely (the
 * adapters then behave exactly as they did before this gap).
 *
 * State is PROCESS-LOCAL — see the deviation note in `circuit-breaker.ts`.
 */
function makeBreaker(name: string, env: NodeJS.ProcessEnv): CircuitBreaker | undefined {
  const flag = (env.AGENT_RUNTIME_BREAKER_ENABLED ?? '').trim().toLowerCase();
  if (flag === 'false' || flag === '0') return undefined;

  const num = (raw: string | undefined, fallback: number): number => {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  return new CircuitBreaker({
    name,
    timeoutMs: num(env.AGENT_RUNTIME_BREAKER_TIMEOUT_MS, 10_000),
    failureThreshold: num(env.AGENT_RUNTIME_BREAKER_FAILURE_THRESHOLD, 5),
    resetTimeoutMs: num(env.AGENT_RUNTIME_BREAKER_RESET_MS, 30_000),
    onStateChange: (from, to, circuit) => {
      // eslint-disable-next-line no-console -- the factory runs before Nest's logger exists.
      console.warn(`[agent-runtime] circuit '${circuit}' ${from} -> ${to}`);
    },
  });
}

/**
 * Select the read-side knowledge/RAG adapter (GT-540).
 *
 * The token-overlap `InMemoryKnowledgeAdapter` (GT-408) is the explicit default
 * in EVERY profile. The production pgvector adapter is selected when
 * `AGENT_RUNTIME_KNOWLEDGE_MODE=pgvector` — or implicitly when a store URL
 * (`EVOLITH_RAG_PG_URL` / `AGENT_RUNTIME_KNOWLEDGE_PG_URL`) is configured. When
 * pgvector is selected, the store connection AND the embedder sidecar are
 * MANDATORY: the factory FAILS LOUD rather than silently degrading grounded
 * retrieval to token-overlap. Mirrors the read-side of the GT-538 store env
 * conventions (`EVOLITH_RAG_PG_URL`, `EVOLITH_RAG_EMBED_URL`).
 */
export function resolveKnowledgeAdapter(env: NodeJS.ProcessEnv = process.env): IKnowledgePort {
  // Only an EXPLICIT RAG store URL enables pgvector — never the generic
  // DATABASE_URL, which commonly points at an unrelated app DB and would
  // silently (and wrongly) mis-target grounded retrieval / fail loud.
  const pgUrl = env.AGENT_RUNTIME_KNOWLEDGE_PG_URL ?? env.EVOLITH_RAG_PG_URL;
  const rawMode = (env.AGENT_RUNTIME_KNOWLEDGE_MODE ?? '').trim().toLowerCase();

  let mode: 'pgvector' | 'in-memory';
  switch (rawMode) {
    case 'pgvector':
      mode = 'pgvector';
      break;
    case 'in-memory':
    case 'inmemory':
    case 'memory':
      mode = 'in-memory';
      break;
    case '':
      // Auto: graduate to pgvector only when a store URL is actually configured.
      mode = pgUrl ? 'pgvector' : 'in-memory';
      break;
    default:
      throw new Error(
        `[agent-runtime] unknown AGENT_RUNTIME_KNOWLEDGE_MODE '${env.AGENT_RUNTIME_KNOWLEDGE_MODE}'. ` +
          "Use 'pgvector' or 'in-memory'.",
      );
  }

  if (mode === 'in-memory') {
    return new InMemoryKnowledgeAdapter();
  }

  // pgvector selected — connection + embedder are mandatory, fail loud.
  if (!pgUrl) {
    throw new Error(
      '[agent-runtime] AGENT_RUNTIME_KNOWLEDGE_MODE=pgvector requires a store connection ' +
        '(AGENT_RUNTIME_KNOWLEDGE_PG_URL or EVOLITH_RAG_PG_URL — the GT-538 pgvector store).',
    );
  }
  const embedUrl = env.AGENT_RUNTIME_KNOWLEDGE_EMBED_URL ?? env.EVOLITH_RAG_EMBED_URL;
  if (!embedUrl) {
    throw new Error(
      '[agent-runtime] AGENT_RUNTIME_KNOWLEDGE_MODE=pgvector requires an embedder sidecar ' +
        '(AGENT_RUNTIME_KNOWLEDGE_EMBED_URL or EVOLITH_RAG_EMBED_URL — the GT-539 Qwen3 sidecar). ' +
        'Refusing to run semantic retrieval without a query embedder.',
    );
  }
  const embedModel = env.AGENT_RUNTIME_KNOWLEDGE_EMBED_MODEL ?? env.EVOLITH_RAG_EMBED_MODEL;
  const corpusVersion = env.AGENT_RUNTIME_KNOWLEDGE_CORPUS_VERSION ?? env.EVOLITH_RAG_CORPUS_VERSION;

  // Dimension is fixed by ADR-0112 §2 (vector(1024)); the adapter asserts it per
  // query and fails closed on any mismatch. Referenced here for provenance.
  void PGVECTOR_KNOWLEDGE_DIM;

  return new PgVectorKnowledgeAdapter({
    embed: makeSidecarEmbedder(embedUrl, embedModel),
    connectionString: pgUrl,
    corpusVersion: corpusVersion || undefined,
  });
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
      coreEvaluation: new HttpCoreEvaluationAdapter({
        endpoint: coreEndpoint,
        headers,
        // GT-443 / ADR-0011: the one outbound call the production profile makes
        // mandatory is also the one that could stall every governed request.
        // ON BY DEFAULT — a breaker nobody opts into protects nothing (GT-560).
        breaker: makeBreaker('core-evaluation', env),
      }),
    };
  } else if (isProd) {
    throw new Error(
      '[agent-runtime] AGENT_RUNTIME_PROFILE=production requires AGENT_RUNTIME_CORE_ENDPOINT ' +
        '(the real Core API /api/v1/evaluate). Refusing to fall back to StubCoreEvaluationAdapter in production.',
    );
  }

  // Workspace context (GT-438) — assemble the REAL workspace so the stateless
  // Core evaluates actual content INLINE (`evaluationInput.files`) instead of an
  // empty context (which yields GOV-000 "nothing to evaluate").
  //
  // STRICTLY opt-in via its OWN variable. It deliberately does NOT fall back to
  // AGENT_RUNTIME_WORKSPACE_ROOT: that variable predates this feature, means
  // "where the mounted corpus lives" for the .harness/OPA seams, and the service
  // image hard-codes it (`ENV AGENT_RUNTIME_WORKSPACE_ROOT=/repo/corpus`). Reusing
  // it silently turned whole-corpus inlining ON in every containerised deployment:
  // the runtime inlined the entire bundled corpus into one evaluate request, the
  // Core rejected the oversized body BEFORE its audit interceptor (so the failure
  // never even appeared in the logs), and the governed chain died on an opaque
  // `Core evaluation failed: HTTP 500`. Unset ⇒ the prior workspaceRef-only flow.
  const trimmed = (v: string | undefined): string | undefined => (v && v.trim() ? v.trim() : undefined);
  const workspaceContextRoot = trimmed(env.AGENT_RUNTIME_WORKSPACE_CONTEXT_ROOT);
  if (workspaceContextRoot) {
    overrides = {
      ...overrides,
      workspaceContext: new FsWorkspaceContextAdapter({ root: workspaceContextRoot }),
    };
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

  // Runtime HITL approval — route sensitive-capability approvals to the Tracker
  // (GT-441). The package default is a local fail-closed PendingApprovalAdapter;
  // wiring the Tracker makes the human decision happen THERE, per ADR-0101 (the
  // Core asks; the Tracker decides, persists and audits, with per-tenant approver
  // config). Opt-in via AGENT_RUNTIME_APPROVAL_TRACKER_URL (the BFF base including
  // /api/v1). The CoreMachine key (AGENT_RUNTIME_APPROVAL_TRACKER_KEY) is what the
  // Tracker binds to a tenant; under production it is MANDATORY alongside the URL —
  // the approval endpoint is machine-authenticated, so an unauthenticated call is
  // refused and would deny every governed request as unavailable. Unset ⇒ the local
  // PendingApprovalAdapter default stays in every profile.
  const approvalTrackerUrl = trimmed(env.AGENT_RUNTIME_APPROVAL_TRACKER_URL);
  if (approvalTrackerUrl) {
    const approvalKey = trimmed(env.AGENT_RUNTIME_APPROVAL_TRACKER_KEY);
    if (isProd && !approvalKey) {
      throw new Error(
        '[agent-runtime] AGENT_RUNTIME_PROFILE=production requires AGENT_RUNTIME_APPROVAL_TRACKER_KEY ' +
          'alongside AGENT_RUNTIME_APPROVAL_TRACKER_URL — the Tracker approval endpoint is machine-authenticated ' +
          'and derives the tenant from the key; without it every governed request is denied as unavailable.',
      );
    }
    const approvalTimeoutMs = Number(env.AGENT_RUNTIME_APPROVAL_TRACKER_TIMEOUT_MS) || undefined;
    overrides = {
      ...overrides,
      approval: new TrackerApprovalAdapter({
        client: new TrackerApprovalHttpClient({
          baseUrl: approvalTrackerUrl,
          apiKey: approvalKey,
          timeoutMs: approvalTimeoutMs,
        }),
        timeoutMs: approvalTimeoutMs,
      }),
    };
  }

  // Tracker — publish trazability events to multiple destinations (Tracker HTTP, File JSONL, OTel).
  const trackerAdapters: any[] = [];
  
  const trackerEndpoint = env.AGENT_RUNTIME_TRACKER_ENDPOINT;
  if (trackerEndpoint) {
    const headers: Record<string, string> = {};
    if (env.AGENT_RUNTIME_TRACKER_TOKEN) {
      headers.authorization = `Bearer ${env.AGENT_RUNTIME_TRACKER_TOKEN}`;
    }
    trackerAdapters.push(
      new HttpTrackerTraceAdapter({
        endpoint: trackerEndpoint,
        headers,
        breaker: makeBreaker('tracker-trace', env),
      }),
    );
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

  // Knowledge / RAG read-side (GT-540) — token-overlap in-memory by default in
  // every profile; the pgvector production adapter is selected via
  // AGENT_RUNTIME_KNOWLEDGE_MODE / a configured store URL. Selecting pgvector
  // without a store connection + embedder sidecar fails loud (see selector).
  overrides = {
    ...overrides,
    knowledge: resolveKnowledgeAdapter(env),
  };

  return createAgentRuntime(overrides);
}
