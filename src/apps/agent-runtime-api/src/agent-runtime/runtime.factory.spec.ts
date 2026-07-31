import {
  StubCoreEvaluationAdapter,
  HttpCoreEvaluationAdapter,
  StubAgentEngineAdapter,
  HermesAgentAdapter,
  SwarmsAgentAdapter,
  CoworkAgentEngineAdapter,
  RoutingAgentAdapter,
  InMemoryMemoryAdapter,
  FileMemoryAdapter,
  StubPolicyValidationAdapter,
  OpaCliPolicyValidationAdapter,
  InMemoryKnowledgeAdapter,
  PgVectorKnowledgeAdapter,
  FsWorkspaceContextAdapter,
  HttpTrackerTraceAdapter,
  CircuitBreaker,
} from '@beyondnet/evolith-agent-runtime';
import { resolve } from 'node:path';

import { createRuntimeFromEnv, resolveProfile, resolveKnowledgeAdapter } from './runtime.factory';

/**
 * GT-438 — the factory's profile selection matrix. A single switch
 * (`AGENT_RUNTIME_PROFILE`) governs the whole adapter set: dev keeps the
 * deterministic stubs + in-memory state; production mandates the real adapters
 * and FAILS LOUD instead of silently degrading to a stub.
 */
describe('createRuntimeFromEnv — profile selection matrix (GT-438)', () => {
  const PROD_CORE = {
    AGENT_RUNTIME_CORE_ENDPOINT: 'https://core.example/api/v1/evaluate',
    AGENT_RUNTIME_CORE_TOKEN: 'prod-token',
    AGENT_RUNTIME_STATE_DIR: '/var/lib/evolith-runtime',
  } as const;

  describe('profile resolution', () => {
    it('defaults to dev when AGENT_RUNTIME_PROFILE is unset', () => {
      expect(resolveProfile({})).toBe('dev');
    });

    it.each(['dev', 'development', 'local', 'test', 'DEV'])('maps %s to dev', (v) => {
      expect(resolveProfile({ AGENT_RUNTIME_PROFILE: v })).toBe('dev');
    });

    it.each(['production', 'prod', 'PRODUCTION'])('maps %s to production', (v) => {
      expect(resolveProfile({ AGENT_RUNTIME_PROFILE: v })).toBe('production');
    });

    it('throws on an unrecognized profile (no silent downgrade)', () => {
      expect(() => resolveProfile({ AGENT_RUNTIME_PROFILE: 'prd' })).toThrow(/unknown AGENT_RUNTIME_PROFILE/);
    });
  });

  describe('dev profile ⇒ stubs + in-memory (explicit default)', () => {
    it('wires the stub Core, stub engine and in-memory state', () => {
      const { deps } = createRuntimeFromEnv({});
      expect(deps.coreEvaluation).toBeInstanceOf(StubCoreEvaluationAdapter);
      expect(deps.engine).toBeInstanceOf(StubAgentEngineAdapter);
      expect(deps.memory).toBeInstanceOf(InMemoryMemoryAdapter);
      // Policy stays real OPA by default even under dev (GT-412), opt into the stub.
      expect(deps.policy).toBeInstanceOf(OpaCliPolicyValidationAdapter);
    });

    it('uses the stub policy only when explicitly requested', () => {
      const { deps } = createRuntimeFromEnv({ AGENT_RUNTIME_POLICY_MODE: 'stub' });
      expect(deps.policy).toBeInstanceOf(StubPolicyValidationAdapter);
    });

    it('still graduates the Core port when the endpoint is set (endpoint-driven, backward compatible)', () => {
      const { deps } = createRuntimeFromEnv({
        AGENT_RUNTIME_CORE_ENDPOINT: 'https://core.example/api/v1/evaluate',
      });
      expect(deps.coreEvaluation).toBeInstanceOf(HttpCoreEvaluationAdapter);
      // Token stays optional under dev.
      expect(deps.memory).toBeInstanceOf(InMemoryMemoryAdapter);
    });
  });

  describe('production profile + endpoint set ⇒ real adapters', () => {
    it('wires the HTTP Core, durable memory and real OPA', () => {
      const { deps } = createRuntimeFromEnv({
        AGENT_RUNTIME_PROFILE: 'production',
        ...PROD_CORE,
      });
      expect(deps.coreEvaluation).toBeInstanceOf(HttpCoreEvaluationAdapter);
      expect(deps.memory).toBeInstanceOf(FileMemoryAdapter);
      expect(deps.policy).toBeInstanceOf(OpaCliPolicyValidationAdapter);
      // No engine configured ⇒ stub stays (GT-385-gated) even under production.
      expect(deps.engine).toBeInstanceOf(StubAgentEngineAdapter);
    });
  });

  /**
   * GT-443 — the breaker must be WIRED, not merely available. GT-560 deleted the
   * previous breaker precisely because it was registered and injected nowhere;
   * these assertions are what stop that from recurring here.
   */
  describe('outbound calls run under a circuit breaker (GT-443 / ADR-0011)', () => {
    const breakerOf = (adapter: unknown) => (adapter as { options: { breaker?: unknown } }).options.breaker;

    it('guards the mandatory Core evaluate call by default', () => {
      const { deps } = createRuntimeFromEnv({ AGENT_RUNTIME_PROFILE: 'production', ...PROD_CORE });
      expect(breakerOf(deps.coreEvaluation)).toBeInstanceOf(CircuitBreaker);
    });

    it('guards the Tracker publish call by default', () => {
      const { deps } = createRuntimeFromEnv({
        AGENT_RUNTIME_PROFILE: 'production',
        ...PROD_CORE,
        AGENT_RUNTIME_TRACKER_ENDPOINT: 'https://tracker.example/api/v1/traces',
      });
      // The tracker is wrapped in a composite; reach the HTTP leg.
      const legs = (deps.tracker as unknown as { adapters?: unknown[] }).adapters ?? [deps.tracker];
      const httpLeg = legs.find((a) => a instanceof HttpTrackerTraceAdapter);
      expect(httpLeg).toBeDefined();
      expect(breakerOf(httpLeg)).toBeInstanceOf(CircuitBreaker);
    });

    it('can be opted out of explicitly', () => {
      const { deps } = createRuntimeFromEnv({
        AGENT_RUNTIME_PROFILE: 'production',
        ...PROD_CORE,
        AGENT_RUNTIME_BREAKER_ENABLED: 'false',
      });
      expect(breakerOf(deps.coreEvaluation)).toBeUndefined();
    });
  });

  describe('production profile ⇒ fail loud (no silent stub fallback)', () => {
    it('throws when AGENT_RUNTIME_CORE_ENDPOINT is missing', () => {
      expect(() => createRuntimeFromEnv({ AGENT_RUNTIME_PROFILE: 'production' })).toThrow(
        /requires AGENT_RUNTIME_CORE_ENDPOINT/,
      );
    });

    it('throws when the Core endpoint is set but the token is missing', () => {
      expect(() =>
        createRuntimeFromEnv({
          AGENT_RUNTIME_PROFILE: 'production',
          AGENT_RUNTIME_CORE_ENDPOINT: 'https://core.example/api/v1/evaluate',
          AGENT_RUNTIME_STATE_DIR: '/var/lib/evolith-runtime',
        }),
      ).toThrow(/requires AGENT_RUNTIME_CORE_TOKEN/);
    });

    it('throws when durable state dir is missing', () => {
      expect(() =>
        createRuntimeFromEnv({
          AGENT_RUNTIME_PROFILE: 'production',
          AGENT_RUNTIME_CORE_ENDPOINT: 'https://core.example/api/v1/evaluate',
          AGENT_RUNTIME_CORE_TOKEN: 'prod-token',
        }),
      ).toThrow(/requires AGENT_RUNTIME_STATE_DIR/);
    });

    it('refuses an explicit stub policy under production', () => {
      expect(() =>
        createRuntimeFromEnv({
          AGENT_RUNTIME_PROFILE: 'production',
          ...PROD_CORE,
          AGENT_RUNTIME_POLICY_MODE: 'stub',
        }),
      ).toThrow(/stub policy validation is refused/);
    });
  });

  describe('engine selection by config (GT-385, where available)', () => {
    it('wires Hermes when AGENT_RUNTIME_ENGINE=hermes', () => {
      const { deps } = createRuntimeFromEnv({ AGENT_RUNTIME_ENGINE: 'hermes' });
      expect(deps.engine).toBeInstanceOf(HermesAgentAdapter);
    });

    it('wires Swarms when AGENT_RUNTIME_ENGINE=swarms', () => {
      const { deps } = createRuntimeFromEnv({ AGENT_RUNTIME_ENGINE: 'swarms' });
      expect(deps.engine).toBeInstanceOf(SwarmsAgentAdapter);
    });

    it('wires Cowork when AGENT_RUNTIME_ENGINE=cowork', () => {
      const { deps } = createRuntimeFromEnv({ AGENT_RUNTIME_ENGINE: 'cowork' });
      expect(deps.engine).toBeInstanceOf(CoworkAgentEngineAdapter);
    });

    it('wires a Router from AGENT_RUNTIME_ENGINE_ROUTER JSON', () => {
      const { deps } = createRuntimeFromEnv({
        AGENT_RUNTIME_ENGINE: 'routing',
        AGENT_RUNTIME_ENGINE_ROUTER: JSON.stringify({ defaultEngine: 'stub', routes: [] }),
      });
      expect(deps.engine).toBeInstanceOf(RoutingAgentAdapter);
    });

    it('throws for routing without a router config', () => {
      expect(() => createRuntimeFromEnv({ AGENT_RUNTIME_ENGINE: 'routing' })).toThrow(
        /requires AGENT_RUNTIME_ENGINE_ROUTER/,
      );
    });

    it('throws for invalid router JSON', () => {
      expect(() =>
        createRuntimeFromEnv({ AGENT_RUNTIME_ENGINE: 'routing', AGENT_RUNTIME_ENGINE_ROUTER: '{not json' }),
      ).toThrow(/not valid JSON/);
    });

    it('throws for an unknown engine name', () => {
      expect(() => createRuntimeFromEnv({ AGENT_RUNTIME_ENGINE: 'gpt' })).toThrow(/unknown AGENT_RUNTIME_ENGINE/);
    });

    it("treats 'stub' as the deterministic default", () => {
      const { deps } = createRuntimeFromEnv({ AGENT_RUNTIME_ENGINE: 'stub' });
      expect(deps.engine).toBeInstanceOf(StubAgentEngineAdapter);
    });
  });

  /**
   * GT-540 — read-side knowledge/RAG adapter selection. Token-overlap in-memory
   * is the explicit default in EVERY profile; the pgvector production adapter is
   * selected explicitly or when a store URL is configured, and fails loud when
   * selected without its store connection + embedder sidecar.
   */
  describe('knowledge/RAG adapter selection (GT-540)', () => {
    const PG = { EVOLITH_RAG_PG_URL: 'postgres://db/evolith', EVOLITH_RAG_EMBED_URL: 'http://sidecar:8080/embed' } as const;

    it('defaults to the in-memory token adapter when nothing is configured', () => {
      expect(resolveKnowledgeAdapter({})).toBeInstanceOf(InMemoryKnowledgeAdapter);
    });

    it('auto-selects pgvector when a store URL is configured with an embedder sidecar', () => {
      expect(resolveKnowledgeAdapter({ ...PG })).toBeInstanceOf(PgVectorKnowledgeAdapter);
    });

    it('selects pgvector explicitly via AGENT_RUNTIME_KNOWLEDGE_MODE=pgvector', () => {
      expect(
        resolveKnowledgeAdapter({ AGENT_RUNTIME_KNOWLEDGE_MODE: 'pgvector', ...PG }),
      ).toBeInstanceOf(PgVectorKnowledgeAdapter);
    });

    it('keeps in-memory explicitly even when a store URL is present', () => {
      expect(
        resolveKnowledgeAdapter({ AGENT_RUNTIME_KNOWLEDGE_MODE: 'in-memory', ...PG }),
      ).toBeInstanceOf(InMemoryKnowledgeAdapter);
    });

    it('fails loud when pgvector is selected without a store connection', () => {
      expect(() =>
        resolveKnowledgeAdapter({ AGENT_RUNTIME_KNOWLEDGE_MODE: 'pgvector', EVOLITH_RAG_EMBED_URL: 'http://sidecar/embed' }),
      ).toThrow(/requires a store connection/);
    });

    it('fails loud when pgvector is selected without an embedder sidecar', () => {
      expect(() =>
        resolveKnowledgeAdapter({ AGENT_RUNTIME_KNOWLEDGE_MODE: 'pgvector', EVOLITH_RAG_PG_URL: 'postgres://db/evolith' }),
      ).toThrow(/requires an embedder sidecar/);
    });

    it('throws on an unknown knowledge mode', () => {
      expect(() => resolveKnowledgeAdapter({ AGENT_RUNTIME_KNOWLEDGE_MODE: 'faiss' })).toThrow(
        /unknown AGENT_RUNTIME_KNOWLEDGE_MODE/,
      );
    });

    it('is wired onto the bundle by createRuntimeFromEnv (in-memory by default)', () => {
      const { deps } = createRuntimeFromEnv({});
      expect(deps.knowledge).toBeInstanceOf(InMemoryKnowledgeAdapter);
    });
  });

  describe('workspace-context assembler wiring (GT-438)', () => {
    it('leaves workspaceContext unset when no corpus root is configured', () => {
      const { deps } = createRuntimeFromEnv({});
      expect(deps.workspaceContext).toBeUndefined();
    });

    it('wires the FS assembler from a dedicated AGENT_RUNTIME_WORKSPACE_CONTEXT_ROOT', () => {
      const { deps } = createRuntimeFromEnv({ AGENT_RUNTIME_WORKSPACE_CONTEXT_ROOT: '/app/corpus' });
      expect(deps.workspaceContext).toBeInstanceOf(FsWorkspaceContextAdapter);
    });

    // Regression guard: this used to FALL BACK to AGENT_RUNTIME_WORKSPACE_ROOT.
    // That variable predates the feature, means "where the mounted corpus lives"
    // for the .harness/OPA seams, and the service image hard-codes it
    // (`ENV AGENT_RUNTIME_WORKSPACE_ROOT=/repo/corpus`). The fallback therefore
    // switched whole-corpus inlining ON in every containerised deployment: the
    // runtime inlined the entire bundled corpus into one evaluate request, the
    // Core rejected the oversized body before its audit interceptor (invisible in
    // logs), and the governed chain died on an opaque "HTTP 500". Inlining must be
    // opt-in through its OWN variable only.
    it('does NOT activate from AGENT_RUNTIME_WORKSPACE_ROOT alone (that var is the .harness/OPA corpus root)', () => {
      const { deps } = createRuntimeFromEnv({ AGENT_RUNTIME_WORKSPACE_ROOT: '/app/corpus' });
      expect(deps.workspaceContext).toBeUndefined();
    });

    it('still activates when both are set, honouring the dedicated variable', () => {
      const { deps } = createRuntimeFromEnv({
        AGENT_RUNTIME_WORKSPACE_ROOT: '/repo/corpus',
        AGENT_RUNTIME_WORKSPACE_CONTEXT_ROOT: '/app/satellite',
      });
      expect(deps.workspaceContext).toBeInstanceOf(FsWorkspaceContextAdapter);
    });
  });

  /**
   * GT-608 — the catalogue the DEPLOYED service routes on.
   *
   * The HITL seam had never executed because nothing the runtime could route
   * required approval: the factory seeded the hardcoded 7-skill table and never
   * read the manifest, so `requiresApproval: true` in `.harness/manifest.yaml`
   * governed nothing at runtime. These two tests are the CI-runnable guard on
   * that wiring — the full Runtime↔Tracker integration needs a live Tracker and
   * skips without one, so without this a regression here would be silent.
   */
  describe('skill catalogue is derived from the mounted manifest (GT-608)', () => {
    const HARNESS_ROOT = resolve(__dirname, '../../../../..', '.harness');

    it('routes a manifest capability, with the manifest’s approval posture', async () => {
      const { deps } = createRuntimeFromEnv({
        AGENT_RUNTIME_HARNESS_ROOT: HARNESS_ROOT,
        AGENT_RUNTIME_POLICY_MODE: 'stub',
      });
      const skill = await deps.skillRegistry.resolve('self_improving_loop');
      expect(skill?.id).toBe('self-improving-loop');
      // Load-bearing: this is the flag that makes step 4 of the pipeline run at all.
      expect(skill?.requiresApproval).toBe(true);
    });

    it('keeps the hardcoded catalogue when no .harness is mounted (design rule #5)', async () => {
      const { deps } = createRuntimeFromEnv({ AGENT_RUNTIME_POLICY_MODE: 'stub' });
      expect(await deps.skillRegistry.resolve('self_improving_loop')).toBeUndefined();
    });
  });
});
