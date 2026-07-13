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
} from '@beyondnet/evolith-agent-runtime';
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
});
