/**
 * GT-590 end-to-end over the seams that already exist: an ADR-0111 provider proposes bindings with
 * a confidence, GT-584 rules the proposal inadmissible for blocking, a human confirms it at the
 * GT-608 HITL gate, and the confirmed correspondence replays deterministically.
 */

import {
  applyC4BindingMap,
  proposeC4Bindings,
} from '@beyondnet/evolith-core-domain/application/validators/enforcement/c4-binding';
import { compileC4ToBoundaryRules } from '@beyondnet/evolith-core-domain/application/validators/enforcement/c4-compiler';
import { evaluateEdit } from '@beyondnet/evolith-core-domain/application/validators/enforcement/edit-gate';
import { parseStructurizrDsl } from '@beyondnet/evolith-core-domain/application/validators/enforcement/structurizr-parser';
import {
  DEFAULT_EVIDENCE_ADMISSIBILITY_POLICY,
  admitEvidenceBlocking,
  type RepoFacts,
} from '@beyondnet/evolith-core-domain/evaluation/contracts';
import {
  C4BindingLedgerError,
  FileC4BindingMapStore,
  InMemoryC4BindingMapStore,
  type C4BindingStoreFsLike,
} from '../adapters/c4-binding';
import { PendingApprovalAdapter } from '../adapters/approval/pending-approval.adapter';
import {
  C4BindingConfirmationService,
  C4_BINDING_SUBJECT_KIND,
} from '../application/c4-binding-confirmation.service';
import {
  C4BindingCollectionError,
  C4BindingProposalProvider,
  C4_BINDING_DIMENSION,
  C4_BINDING_PROVIDER_ID,
} from '../application/c4-binding-proposal-provider';
import { TenantQualitySignalRegistry } from '../application/quality-signal-registry';
import type { AgentRuntimeRequest } from '../domain/contracts/agent-runtime-request';
import { C4BindingMapVersionError } from '../domain/ports/c4-binding-map.port';

const DSL = `
workspace "shop" {
  model {
    domain = container "Domain"
    infrastructure = container "Infrastructure"
    application = container "Application"

    application -> domain
    infrastructure -> domain
    infrastructure -> application
  }
}
`;

const FACTS: RepoFacts = {
  schemaVersion: '1.0.0',
  contentHash: 'sha256:facts-under-test',
  provenance: {
    extractedBy: 'evolith-repo-facts',
    extractorVersion: '1.0.0',
    indexer: 'typescript-compiler-api',
    indexerVersion: '6.0.3',
    extractedAt: '2026-07-30T00:00:00.000Z',
  },
  modules: [
    { id: 'src/domain/order.ts', layer: 'domain' },
    { id: 'src/domain/customer.ts', layer: 'domain' },
    { id: 'src/application/place-order.ts', layer: 'application' },
    { id: 'src/infrastructure/postgres-orders.ts', layer: 'infrastructure' },
  ],
  imports: [],
  symbols: [],
  references: [],
};

const NOW = () => '2026-07-30T12:00:00.000Z';
const MODEL = parseStructurizrDsl(DSL);

const REQUEST: AgentRuntimeRequest = {
  intent: 'confirm_c4_binding',
  context: { tenantId: 't-1', correlationId: 'corr-1' },
};

const target = { config: { dsl: DSL, repoFacts: FACTS } };
const ctx = { tenantId: 't-1', dimension: C4_BINDING_DIMENSION };

describe('AC1 — an ADR-0111 provider proposes bindings with a confidence per binding', () => {
  const provider = new C4BindingProposalProvider({ now: NOW });

  it('emits one finding per element, each naming a prefix and a confidence', async () => {
    const evidence = await provider.collect(target, ctx);
    expect(evidence.source).toBe(C4_BINDING_PROVIDER_ID);
    expect(evidence.dimension).toBe(C4_BINDING_DIMENSION);
    expect(evidence.findings).toHaveLength(3);
    expect(evidence.findings.map((f) => f.location).sort()).toEqual([
      'src/application',
      'src/domain',
      'src/infrastructure',
    ]);
    expect(evidence.findings[0].message).toMatch(/confidence 0\.\d+/);
  });

  it('carries provenance and a tamper-evident artifact hash over what it proposed', async () => {
    const evidence = await provider.collect(target, ctx);
    expect(evidence.provenance).toEqual({
      collectedBy: C4_BINDING_PROVIDER_ID,
      adapterVersion: '1.0.0',
      artifactHash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      timestamp: '2026-07-30T12:00:00.000Z',
    });
  });

  it('declares itself PROBABILISTIC and ships no calibration', async () => {
    const evidence = await provider.collect(target, ctx);
    expect(evidence.determinism).toBe('probabilistic');
    expect(evidence.calibration).toBeUndefined();
  });

  it('GT-584 rules the proposal INADMISSIBLE FOR BLOCKING until it is confirmed', async () => {
    const decision = admitEvidenceBlocking(
      await provider.collect(target, ctx),
      DEFAULT_EVIDENCE_ADMISSIBILITY_POLICY,
    );
    expect(decision.blocking).toBe(false);
    expect(decision.admissibility).toBe('advisory-uncalibrated');
    expect(decision.downgradedFromBlocking).toBe(true);
  });

  it('reports an element it could not guess, instead of staying silent about it', async () => {
    const evidence = await provider.collect(
      { config: { model: { elements: [{ id: 'telemetry', name: 'Telemetry' }], relationships: [] }, repoFacts: FACTS } },
      ctx,
    );
    expect(evidence.findings[0].code).toBe('c4-binding-unresolved');
    expect(evidence.metrics.elementsWithCandidate).toBe(0);
  });

  it('refuses to invent a fact base — the Core never runs an indexer (ADR-0101)', async () => {
    await expect(provider.collect({ config: { dsl: DSL } }, ctx)).rejects.toThrow(
      C4BindingCollectionError,
    );
    await expect(provider.collect({ config: { repoFacts: FACTS } }, ctx)).rejects.toThrow(
      /dsl.*or.*model/is,
    );
  });

  it('plugs into the tenant registry like any other quality-signal provider', async () => {
    const registry = new TenantQualitySignalRegistry().register(provider);
    const { evidence, outcomes } = await registry.collect(
      { tenantId: 't-1', providers: [{ id: C4_BINDING_PROVIDER_ID, enabled: true, config: target.config }] },
      {},
      ctx,
    );
    expect(outcomes[0]).toMatchObject({ providerId: C4_BINDING_PROVIDER_ID, ok: true });
    expect(evidence[0].determinism).toBe('probabilistic');
  });

  it('does not serve a dimension it has nothing to say about', () => {
    expect(provider.supports({ tenantId: 't-1', dimension: 'performance' })).toBe(false);
    expect(provider.supports({ tenantId: 't-1' })).toBe(true);
  });
});

describe('AC2 — confirmation happens at the HITL gate and the result is versioned', () => {
  const proposals = proposeC4Bindings(MODEL, FACTS);

  function seam() {
    const approval = new PendingApprovalAdapter();
    const store = new InMemoryC4BindingMapStore();
    const service = new C4BindingConfirmationService({ approval, store, now: NOW });
    return { approval, store, service };
  }

  it('a proposal alone confirms NOTHING — the gate leaves it pending and the map stays at 0', async () => {
    const { store, service } = seam();
    const result = await service.confirm('shop', proposals, [{ elementId: 'domain' }], REQUEST);
    expect(result.outcomes[0]).toMatchObject({ confirmed: false, reason: 'Awaiting human approval.' });
    expect(result.map.version).toBe(0);
    expect((await store.head('shop'))!.bindings).toEqual([]);
  });

  it('puts the SPECIFIC binding in front of the human, not just a capability id', async () => {
    const { approval, service } = seam();
    await service.confirm('shop', proposals, [{ elementId: 'domain' }], REQUEST);
    const [pending] = await approval.list('pending');
    expect(pending.subject).toMatchObject({
      kind: C4_BINDING_SUBJECT_KIND,
      ref: 'shop:domain',
      summary: expect.stringContaining("'src/domain'"),
    });
    expect(pending.subject!.confidence).toBeGreaterThan(0);
    expect(pending.subject!.payload).toMatchObject({ factsContentHash: 'sha256:facts-under-test' });
  });

  it('keeps two bindings under one correlation id apart, so approving one is not approving both', async () => {
    const { approval, service } = seam();
    await service.confirm(
      'shop',
      proposals,
      [{ elementId: 'domain' }, { elementId: 'application' }],
      REQUEST,
    );
    const pending = await approval.list('pending');
    expect(new Set(pending.map((r) => r.id)).size).toBe(2);
  });

  it('mints a version per granted confirmation, each superseding the last', async () => {
    const { approval, store, service } = seam();
    await service.confirm('shop', proposals, [{ elementId: 'domain' }], REQUEST);
    const [pending] = await approval.list('pending');
    await approval.approve(pending.id, 'aarroyo');

    const result = await service.confirm('shop', proposals, [{ elementId: 'domain' }], REQUEST);
    expect(result.outcomes[0]).toMatchObject({ confirmed: true, approver: 'aarroyo' });
    expect(result.map.version).toBe(1);
    expect(result.map.bindings[0]).toMatchObject({
      elementId: 'domain',
      modulePrefix: 'src/domain',
      confirmedBy: 'aarroyo',
      confirmedAt: '2026-07-30T12:00:00.000Z',
    });

    const history = await store.history('shop');
    expect(history.map((m) => m.version)).toEqual([0, 1]);
    expect(history[1].supersedes).toBe(history[0].contentHash);
  });

  it('does NOT confirm on a rejection', async () => {
    const { approval, service } = seam();
    await service.confirm('shop', proposals, [{ elementId: 'domain' }], REQUEST);
    const [pending] = await approval.list('pending');
    await approval.reject(pending.id, 'wrong directory');

    const result = await service.confirm('shop', proposals, [{ elementId: 'domain' }], REQUEST);
    expect(result.outcomes[0]).toMatchObject({ confirmed: false, reason: 'wrong directory' });
    expect(result.map.version).toBe(0);
  });

  it('does NOT confirm a grant that names no human', async () => {
    const { store, service } = seam();
    const alwaysGrants = {
      requireApproval: async () => ({ granted: true, approvalId: 'a-1' }),
    };
    const svc = new C4BindingConfirmationService({
      approval: alwaysGrants,
      store,
      now: NOW,
    });
    void service;
    const result = await svc.confirm('shop', proposals, [{ elementId: 'domain' }], REQUEST);
    expect(result.outcomes[0]).toMatchObject({ confirmed: false });
    expect(result.outcomes[0].reason).toMatch(/named no approver/);
    expect(result.map.version).toBe(0);
  });

  it('records a human OVERRIDE of the scorer as a 0-confidence confirmation', async () => {
    const { approval, service } = seam();
    const override = [{ elementId: 'domain', modulePrefix: 'src/core/domain' }];
    await service.confirm('shop', proposals, override, REQUEST);
    const [pending] = await approval.list('pending');
    await approval.approve(pending.id, 'aarroyo');

    const result = await service.confirm('shop', proposals, override, REQUEST);
    expect(result.map.bindings[0]).toMatchObject({
      modulePrefix: 'src/core/domain',
      proposedConfidence: 0,
      confirmedBy: 'aarroyo',
    });
  });
});

describe('the store is append-only, so a decision cannot be edited away', () => {
  it('rejects a version that is not the next link in the chain', async () => {
    const store = new InMemoryC4BindingMapStore();
    const zero = { schemaVersion: '1.0.0', version: 0, contentHash: 'sha256:a', factsContentHash: 'f', bindings: [] };
    await store.append('shop', zero);
    await expect(
      store.append('shop', { ...zero, version: 5, contentHash: 'sha256:b', supersedes: 'sha256:a' }),
    ).rejects.toThrow(C4BindingMapVersionError);
  });

  it('rejects a version confirmed from a stale ancestor, instead of dropping a decision', async () => {
    const store = new InMemoryC4BindingMapStore();
    const zero = { schemaVersion: '1.0.0', version: 0, contentHash: 'sha256:a', factsContentHash: 'f', bindings: [] };
    await store.append('shop', zero);
    await expect(
      store.append('shop', { ...zero, version: 1, contentHash: 'sha256:c', supersedes: 'sha256:not-the-head' }),
    ).rejects.toThrow(/current head/);
  });

  it('persists the chain as one JSONL line per version and reloads it', async () => {
    const files = new Map<string, string>();
    const fs: C4BindingStoreFsLike = {
      async readFile(file) {
        const found = files.get(file);
        if (found === undefined) throw new Error('ENOENT');
        return found;
      },
      async appendFile(file, data) {
        files.set(file, (files.get(file) ?? '') + data);
      },
      async mkdir() {
        return undefined;
      },
    };
    const store = new FileC4BindingMapStore({ directory: '/ledgers', fs });
    const zero = { schemaVersion: '1.0.0', version: 0, contentHash: 'sha256:a', factsContentHash: 'f', bindings: [] };
    await store.append('shop', zero);
    await store.append('shop', { ...zero, version: 1, contentHash: 'sha256:b', supersedes: 'sha256:a' });

    expect(files.get('/ledgers/shop.jsonl')!.trim().split('\n')).toHaveLength(2);
    const reloaded = new FileC4BindingMapStore({ directory: '/ledgers', fs });
    expect((await reloaded.history('shop')).map((m) => m.version)).toEqual([0, 1]);
    expect((await reloaded.head('shop'))!.contentHash).toBe('sha256:b');
  });

  it('REFUSES to present a corrupt ledger as a shorter valid one', async () => {
    const fs: C4BindingStoreFsLike = {
      async readFile() {
        return '{"version":0}\nnot json\n';
      },
      async appendFile() {},
      async mkdir() {
        return undefined;
      },
    };
    await expect(
      new FileC4BindingMapStore({ directory: '/ledgers', fs }).history('shop'),
    ).rejects.toThrow(C4BindingLedgerError);
  });
});

describe('AC3 — the confirmed correspondence is what later evaluations read', () => {
  it('propose → confirm → enforce: the same edit goes from allowed to blocked', async () => {
    const approval = new PendingApprovalAdapter();
    const store = new InMemoryC4BindingMapStore();
    const service = new C4BindingConfirmationService({ approval, store, now: NOW });
    const proposals = proposeC4Bindings(MODEL, FACTS);
    const wanted = [{ elementId: 'domain' }, { elementId: 'application' }, { elementId: 'infrastructure' }];

    const edit = {
      filePath: 'src/domain/order.ts',
      content: "import { pool } from 'src/infrastructure/postgres-orders';\n",
    };

    // Before any human decision: the intended model is inert, so nothing is enforced.
    const before = await service.confirm('shop', proposals, wanted, REQUEST);
    const beforeRules = compileC4ToBoundaryRules(applyC4BindingMap(MODEL, before.map));
    expect(beforeRules).toEqual([]);
    expect(evaluateEdit(edit, beforeRules).allow).toBe(true);

    for (const pending of await approval.list('pending')) {
      await approval.approve(pending.id, 'aarroyo');
    }

    const after = await service.confirm('shop', proposals, wanted, REQUEST);
    expect(after.outcomes.every((o) => o.confirmed)).toBe(true);
    expect(after.map.version).toBe(3);

    const afterRules = compileC4ToBoundaryRules(applyC4BindingMap(MODEL, after.map));
    const decision = evaluateEdit(edit, afterRules);
    expect(decision.allow).toBe(false);
    expect(decision.violations[0].ruleId).toBe('C4-domain');

    // Deterministic: replaying the stored head reproduces the rules byte for byte, with no
    // scorer, no provider and no approval in the loop.
    const head = (await store.head('shop'))!;
    expect(JSON.stringify(compileC4ToBoundaryRules(applyC4BindingMap(MODEL, head)))).toBe(
      JSON.stringify(afterRules),
    );
  });
});
