import type { RepoFacts } from '../../../evaluation/contracts/repo-facts';
import { compileC4ToBoundaryRules, type C4Model } from './c4-compiler';
import { evaluateEdit } from './edit-gate';
import { parseStructurizrDsl } from './structurizr-parser';
import {
  C4BindingConfirmationError,
  applyC4BindingMap,
  canonicalizeC4BindingMap,
  computeC4BindingMapHash,
  confirmC4Binding,
  emptyC4BindingMap,
  modulePrefixes,
  compileConfirmedC4Bindings,
  proposeC4Bindings,
  serializeConfirmedBoundaryRules,
  unboundC4Elements,
} from './c4-binding';

/**
 * The intended model, authored the way a real `.dsl` is: elements declare NO code mapping. This is
 * the state GT-590 describes — an intent that cannot be compared to an implementation.
 */
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

/** A structural fact base as GT-589's extractor produces it (delivered inline, never read here). */
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
    { id: 'src/infrastructure/http-client.ts', layer: 'infrastructure' },
  ],
  imports: [],
  symbols: [],
  references: [],
};

const MODEL: C4Model = parseStructurizrDsl(DSL);
const CONFIRMED_AT = '2026-07-30T12:00:00.000Z';

/** Confirm the top candidate for every element, as a human working the gate would. */
function confirmTopCandidates(approver: string) {
  const proposals = proposeC4Bindings(MODEL, FACTS);
  let map = emptyC4BindingMap(FACTS.contentHash);
  for (const proposal of proposals.proposals) {
    const top = proposal.candidates[0];
    if (!top) continue;
    map = confirmC4Binding(map, {
      elementId: proposal.elementId,
      modulePrefix: top.modulePrefix,
      confirmedBy: approver,
      confirmedAt: CONFIRMED_AT,
      approvalId: `appr-${proposal.elementId}`,
      proposedConfidence: top.confidence,
    });
  }
  return map;
}

describe('GT-590 — the gap this closes', () => {
  it('the parsed intent alone binds NOTHING, so the compiler yields no rule', () => {
    // Every element arrives with `path` undefined, so compileC4ToBoundaryRules skips all of them.
    expect(MODEL.elements.map((e) => e.path)).toEqual([undefined, undefined, undefined]);
    expect(compileC4ToBoundaryRules(MODEL)).toEqual([]);
  });
});

describe('modulePrefixes — the candidate module boundaries of a fact base', () => {
  it('counts modules under every directory prefix, filenames excluded', () => {
    const prefixes = modulePrefixes(FACTS.modules, 4);
    expect(prefixes.get('src')?.moduleCount).toBe(5);
    expect(prefixes.get('src/domain')?.moduleCount).toBe(2);
    expect(prefixes.get('src/infrastructure')?.moduleCount).toBe(2);
    expect(prefixes.has('src/domain/order.ts')).toBe(false);
  });

  it('honours the depth ceiling', () => {
    const deep: RepoFacts = { ...FACTS, modules: [{ id: 'a/b/c/d/e/f.ts' }] };
    expect([...modulePrefixes(deep.modules, 2).keys()]).toEqual(['a', 'a/b']);
  });
});

describe('AC1 — proposals carry a confidence per binding and are never certainties', () => {
  it('proposes a module prefix for each element, best first', () => {
    const set = proposeC4Bindings(MODEL, FACTS);
    const top = Object.fromEntries(
      set.proposals.map((p) => [p.elementId, p.candidates[0]?.modulePrefix]),
    );
    expect(top).toEqual({
      application: 'src/application',
      domain: 'src/domain',
      infrastructure: 'src/infrastructure',
    });
  });

  it('every candidate carries a confidence strictly inside [0,1)', () => {
    const set = proposeC4Bindings(MODEL, FACTS);
    const all = set.proposals.flatMap((p) => p.candidates);
    expect(all.length).toBeGreaterThan(0);
    for (const candidate of all) {
      expect(candidate.confidence).toBeGreaterThan(0);
      expect(candidate.confidence).toBeLessThan(1);
      expect(candidate.signals.length).toBeGreaterThan(0);
    }
  });

  it('labels itself probabilistic and links the fact base it scored against', () => {
    const set = proposeC4Bindings(MODEL, FACTS);
    expect(set.determinism).toBe('probabilistic');
    expect(set.factsContentHash).toBe('sha256:facts-under-test');
  });

  it('ranks a name+layer agreement above a bare interior-segment match', () => {
    const set = proposeC4Bindings(MODEL, FACTS);
    const domain = set.proposals.find((p) => p.elementId === 'domain')!;
    const best = domain.candidates[0];
    expect(best.modulePrefix).toBe('src/domain');
    expect(best.signals.map((s) => s.kind).sort()).toEqual(['layer-match', 'name-match']);
    const worse = domain.candidates.slice(1);
    for (const c of worse) expect(c.confidence).toBeLessThan(best.confidence);
  });

  it('is deterministic — the same inputs score identically, twice', () => {
    expect(JSON.stringify(proposeC4Bindings(MODEL, FACTS))).toBe(
      JSON.stringify(proposeC4Bindings(MODEL, FACTS)),
    );
  });

  it('proposes nothing for an element no prefix resembles', () => {
    const stranger: C4Model = {
      elements: [{ id: 'telemetry', name: 'Telemetry' }],
      relationships: [],
    };
    expect(proposeC4Bindings(stranger, FACTS).proposals[0].candidates).toEqual([]);
  });

  it('a proposal is NOT a map — it cannot be applied and yields no rule', () => {
    const empty = emptyC4BindingMap(FACTS.contentHash);
    expect(compileC4ToBoundaryRules(applyC4BindingMap(MODEL, empty))).toEqual([]);
    expect(unboundC4Elements(MODEL, empty)).toEqual(['application', 'domain', 'infrastructure']);
  });
});

describe('AC2 — a confirmed correspondence is versioned', () => {
  it('starts at version 0 with a hash and no bindings', () => {
    const zero = emptyC4BindingMap(FACTS.contentHash);
    expect(zero.version).toBe(0);
    expect(zero.bindings).toEqual([]);
    expect(zero.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(zero.supersedes).toBeUndefined();
  });

  it('mints a new version per confirmation and links the one it supersedes', () => {
    const zero = emptyC4BindingMap(FACTS.contentHash);
    const one = confirmC4Binding(zero, {
      elementId: 'domain',
      modulePrefix: 'src/domain',
      confirmedBy: 'aarroyo',
      confirmedAt: CONFIRMED_AT,
      proposedConfidence: 0.72,
    });
    expect(one.version).toBe(1);
    expect(one.supersedes).toBe(zero.contentHash);
    expect(one.contentHash).not.toBe(zero.contentHash);
    // The earlier version is untouched — history is append-only by construction.
    expect(zero.bindings).toEqual([]);
  });

  it('records WHO confirmed, WHEN, the approval id, and the confidence they saw', () => {
    const map = confirmC4Binding(emptyC4BindingMap(FACTS.contentHash), {
      elementId: 'domain',
      modulePrefix: 'src/domain/',
      confirmedBy: 'aarroyo',
      confirmedAt: CONFIRMED_AT,
      approvalId: 'appr-1',
      proposedConfidence: 0.72,
    });
    expect(map.bindings[0]).toEqual({
      elementId: 'domain',
      modulePrefix: 'src/domain',
      importPrefix: 'src/domain',
      confirmedBy: 'aarroyo',
      confirmedAt: CONFIRMED_AT,
      approvalId: 'appr-1',
      proposedConfidence: 0.72,
    });
  });

  it('REFUSES a confirmation with no named human — the Core does not invent an approver', () => {
    expect(() =>
      confirmC4Binding(emptyC4BindingMap(FACTS.contentHash), {
        elementId: 'domain',
        modulePrefix: 'src/domain',
        confirmedBy: '   ',
        confirmedAt: CONFIRMED_AT,
        proposedConfidence: 0.72,
      }),
    ).toThrow(C4BindingConfirmationError);
  });

  it('REFUSES a confirmation cited against a different fact base', () => {
    expect(() =>
      confirmC4Binding(
        emptyC4BindingMap(FACTS.contentHash),
        {
          elementId: 'domain',
          modulePrefix: 'src/domain',
          confirmedBy: 'aarroyo',
          confirmedAt: CONFIRMED_AT,
          proposedConfidence: 0.72,
        },
        'sha256:some-other-tree',
      ),
    ).toThrow(/facts/);
  });

  it('re-confirming an element replaces its binding instead of duplicating it', () => {
    const one = confirmC4Binding(emptyC4BindingMap(FACTS.contentHash), {
      elementId: 'domain',
      modulePrefix: 'src/domain',
      confirmedBy: 'aarroyo',
      confirmedAt: CONFIRMED_AT,
      proposedConfidence: 0.72,
    });
    const two = confirmC4Binding(one, {
      elementId: 'domain',
      modulePrefix: 'src/core-domain',
      confirmedBy: 'aarroyo',
      confirmedAt: CONFIRMED_AT,
      proposedConfidence: 0.4,
    });
    expect(two.version).toBe(2);
    expect(two.bindings).toHaveLength(1);
    expect(two.bindings[0].modulePrefix).toBe('src/core-domain');
  });

  it('hashes the canonical form, so key order and binding order cannot change the digest', () => {
    const map = confirmTopCandidates('aarroyo');
    const shuffled = { ...map, bindings: [...map.bindings].reverse() };
    expect(canonicalizeC4BindingMap(shuffled)).toBe(canonicalizeC4BindingMap(map));
    expect(computeC4BindingMapHash(shuffled)).toBe(map.contentHash);
  });

  it('changes the hash when a confirmed prefix changes', () => {
    const base = confirmC4Binding(emptyC4BindingMap(FACTS.contentHash), {
      elementId: 'domain',
      modulePrefix: 'src/domain',
      confirmedBy: 'aarroyo',
      confirmedAt: CONFIRMED_AT,
      proposedConfidence: 0.72,
    });
    const moved = computeC4BindingMapHash({
      ...base,
      bindings: [{ ...base.bindings[0], modulePrefix: 'src/elsewhere' }],
    });
    expect(moved).not.toBe(base.contentHash);
  });
});

describe('AC3 — a confirmed correspondence is a deterministic input to later evaluations', () => {
  it('projects confirmed prefixes onto the model, overriding the diagram hint', () => {
    const map = confirmTopCandidates('aarroyo');
    const bound = applyC4BindingMap(MODEL, map);
    expect(bound.elements.map((e) => [e.id, e.path])).toEqual([
      ['domain', 'src/domain'],
      ['infrastructure', 'src/infrastructure'],
      ['application', 'src/application'],
    ]);
    expect(unboundC4Elements(MODEL, map)).toEqual([]);
  });

  it('turns the previously-inert model into executable boundary rules', () => {
    const rules = compileC4ToBoundaryRules(applyC4BindingMap(MODEL, confirmTopCandidates('aarroyo')));
    // `infrastructure` declared a relationship to every other element, so the allowlist→denylist
    // transform leaves it nothing to forbid and it yields no rule. That is the model being obeyed,
    // not a binding that failed.
    expect(rules.map((r) => r.ruleId).sort()).toEqual(['C4-application', 'C4-domain']);
    const domainRule = rules.find((r) => r.ruleId === 'C4-domain')!;
    expect(domainRule.appliesTo).toBe('src/domain');
    expect(domainRule.forbiddenImports).toEqual(['src/application', 'src/infrastructure']);
  });

  it('BLOCKS a real edit that crosses a boundary the human confirmed', () => {
    const rules = compileC4ToBoundaryRules(applyC4BindingMap(MODEL, confirmTopCandidates('aarroyo')));
    const decision = evaluateEdit(
      {
        filePath: 'src/domain/order.ts',
        content: "import { pool } from 'src/infrastructure/postgres-orders';\n",
      },
      rules,
    );
    expect(decision.allow).toBe(false);
    expect(decision.violations[0].ruleId).toBe('C4-domain');
  });

  it('allows an edit the confirmed model declares legal', () => {
    const rules = compileC4ToBoundaryRules(applyC4BindingMap(MODEL, confirmTopCandidates('aarroyo')));
    const decision = evaluateEdit(
      {
        filePath: 'src/application/place-order.ts',
        content: "import { Order } from 'src/domain/order';\n",
      },
      rules,
    );
    expect(decision.allow).toBe(true);
  });

  it('replays byte-identically — no scorer is in the loop after confirmation', () => {
    const map = confirmTopCandidates('aarroyo');
    const once = JSON.stringify(compileC4ToBoundaryRules(applyC4BindingMap(MODEL, map)));
    const twice = JSON.stringify(compileC4ToBoundaryRules(applyC4BindingMap(MODEL, map)));
    expect(once).toBe(twice);
    // …and identically from a map rebuilt from its serialized form: only the map, not the run.
    const rehydrated = JSON.parse(JSON.stringify(map));
    expect(JSON.stringify(compileC4ToBoundaryRules(applyC4BindingMap(MODEL, rehydrated)))).toBe(once);
  });

  it('compileConfirmedC4Bindings is the one-call replay path, and matches the long form', () => {
    const map = confirmTopCandidates('aarroyo');
    expect(compileConfirmedC4Bindings(MODEL, map)).toEqual(
      compileC4ToBoundaryRules(applyC4BindingMap(MODEL, map)),
    );
  });

  it('serializes into the envelope the CLI edit-hook already loads, with provenance', () => {
    const map = confirmTopCandidates('aarroyo');
    const file = JSON.parse(serializeConfirmedBoundaryRules(MODEL, map));
    // The shape `loadBoundaryRules` accepts.
    expect(Array.isArray(file.boundaryRules)).toBe(true);
    expect(file.boundaryRules.map((r: { ruleId: string }) => r.ruleId).sort()).toEqual([
      'C4-application',
      'C4-domain',
    ]);
    // …and enough provenance to tell a generated ruleset from a hand-edited one.
    expect(file.generatedFrom).toEqual({
      producer: 'c4-binding',
      schemaVersion: '1.0.0',
      bindingMapVersion: 3,
      bindingMapContentHash: map.contentHash,
      factsContentHash: 'sha256:facts-under-test',
      unboundElements: [],
    });
  });

  it('a PARTIALLY confirmed map enforces only what a human actually confirmed', () => {
    const map = confirmC4Binding(emptyC4BindingMap(FACTS.contentHash), {
      elementId: 'domain',
      modulePrefix: 'src/domain',
      confirmedBy: 'aarroyo',
      confirmedAt: CONFIRMED_AT,
      proposedConfidence: 0.72,
    });
    const rules = compileC4ToBoundaryRules(applyC4BindingMap(MODEL, map));
    // Only `domain` has a path, and nothing else has an importPrefix to forbid — so no rule at all.
    expect(rules).toEqual([]);
    expect(unboundC4Elements(MODEL, map)).toEqual(['application', 'infrastructure']);
  });
});
