import {
  TenantQualitySignalRegistry,
  type TenantQualitySignalConfig,
} from '../application/quality-signal-registry';
import type {
  CollectionContext,
  CollectionTarget,
  Evidence,
  IQualitySignalProvider,
} from '../domain/ports/quality-signal-provider.port';

/** Minimal test provider that emits deterministic evidence for one dimension. */
function makeProvider(
  id: string,
  dimension: string,
  overrides: Partial<IQualitySignalProvider> = {},
): IQualitySignalProvider {
  return {
    id,
    supports: (ctx: CollectionContext) => ctx.dimension === undefined || ctx.dimension === dimension,
    collect: async (_target: CollectionTarget, ctx: CollectionContext): Promise<Evidence> => ({
      source: id,
      dimension,
      metrics: { score: 1 },
      findings: [],
      determinism: 'deterministic',
      provenance: {
        collectedBy: id,
        adapterVersion: '1.0.0',
        artifactHash: `hash-${id}`,
        timestamp: '2026-07-13T00:00:00.000Z',
      },
    }),
    ...overrides,
  };
}

const ctx: CollectionContext = { tenantId: 't-1' };
const target: CollectionTarget = { url: 'https://example.test' };

describe('TenantQualitySignalRegistry (GT-533 · ADR-0111)', () => {
  it('runs only providers the tenant enabled (declarative opt-in)', async () => {
    const registry = new TenantQualitySignalRegistry()
      .register(makeProvider('lighthouse', 'performance'))
      .register(makeProvider('testsprite', 'testing'));

    const config: TenantQualitySignalConfig = {
      tenantId: 't-1',
      providers: [
        { id: 'lighthouse', enabled: true },
        { id: 'testsprite', enabled: false }, // cloud/proprietary → opt-in, off
      ],
    };

    const { evidence, outcomes } = await registry.collect(config, target, ctx);

    expect(evidence.map((e) => e.source)).toEqual(['lighthouse']);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({ providerId: 'lighthouse', ok: true });
  });

  it('activeProviders excludes disabled and unknown ids', () => {
    const registry = new TenantQualitySignalRegistry().register(makeProvider('lighthouse', 'performance'));

    const active = registry.activeProviders({
      tenantId: 't-1',
      providers: [
        { id: 'lighthouse', enabled: true },
        { id: 'ghost', enabled: true }, // not registered
        { id: 'lighthouse-off', enabled: false },
      ],
    });

    expect(active.map((p) => p.id)).toEqual(['lighthouse']);
  });

  it('collects nothing when every provider is disabled', async () => {
    const registry = new TenantQualitySignalRegistry().register(makeProvider('lighthouse', 'performance'));

    const { evidence } = await registry.collect(
      { tenantId: 't-1', providers: [{ id: 'lighthouse', enabled: false }] },
      target,
      ctx,
    );

    expect(evidence).toEqual([]);
  });

  it('skips providers that do not support the requested context', async () => {
    const registry = new TenantQualitySignalRegistry()
      .register(makeProvider('lighthouse', 'performance'))
      .register(makeProvider('review', 'code-quality'));

    const { evidence } = await registry.collect(
      { tenantId: 't-1', providers: [{ id: 'lighthouse', enabled: true }, { id: 'review', enabled: true }] },
      target,
      { tenantId: 't-1', dimension: 'performance' },
    );

    expect(evidence.map((e) => e.source)).toEqual(['lighthouse']);
  });

  it('isolates a throwing provider without aborting the batch', async () => {
    const boom = makeProvider('boom', 'performance', {
      collect: async () => {
        throw new Error('provider exploded');
      },
    });
    const registry = new TenantQualitySignalRegistry()
      .register(boom)
      .register(makeProvider('review', 'code-quality'));

    const { evidence, outcomes } = await registry.collect(
      { tenantId: 't-1', providers: [{ id: 'boom', enabled: true }, { id: 'review', enabled: true }] },
      target,
      ctx,
    );

    expect(evidence.map((e) => e.source)).toEqual(['review']);
    expect(outcomes.find((o) => o.providerId === 'boom')).toMatchObject({ ok: false, error: 'provider exploded' });
  });

  it('re-normalizes adapter output through the canonical ACL (enforces provenance)', async () => {
    const bad = makeProvider('bad', 'performance', {
      // Adapter returns evidence missing mandatory provenance.collectedBy.
      collect: async () =>
        ({
          source: 'bad',
          dimension: 'performance',
          metrics: {},
          findings: [],
          determinism: 'deterministic',
          provenance: { adapterVersion: '1', artifactHash: 'h', timestamp: 'now' },
        }) as unknown as Evidence,
    });
    const registry = new TenantQualitySignalRegistry().register(bad);

    const { evidence, outcomes } = await registry.collect(
      { tenantId: 't-1', providers: [{ id: 'bad', enabled: true }] },
      target,
      ctx,
    );

    expect(evidence).toEqual([]);
    expect(outcomes[0]).toMatchObject({ providerId: 'bad', ok: false });
    expect(outcomes[0].error).toMatch(/provenance/);
  });
});
