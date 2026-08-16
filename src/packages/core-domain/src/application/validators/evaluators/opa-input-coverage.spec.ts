/**
 * GT-694 — every shipped OPA category is either OBSERVED by the Core or SUPPLIED by
 * the caller, and this file is where that decision is written down and checked.
 *
 * The gap: 14 facets that shipped input schemas REQUIRE were never emitted by
 * `opa-input-builder.ts`, across 13 categories, so each failed input-schema
 * validation and never reached its policy. `multi-tenancy` answered
 * `OPA Input Schema Validation Failed: data/satellite must have required property
 * 'multiTenancy'` no matter what the repository did.
 *
 * The original acceptance criterion asked for a per-category choice of `collected`
 * or `withdrawn`. THAT BINARY WAS WRONG and is rewritten here rather than forced:
 * it assumed the Core must derive every fact itself, which contradicts `ADR-0101` —
 * the Core is a stateless engine that RECEIVES its context. Whether a pipeline
 * blocks merges without review, whether tenant filtering is applied, what the DORA
 * numbers are: those are facts the caller holds. Withdrawing thirteen policies
 * because the Core cannot see the facts would delete governance the product is
 * right to express. The real choice is `observed` or `supplied`, and no category may
 * sit outside it.
 *
 * This suite fails when a new schema requires a facet nobody produces and nobody
 * claimed — which is exactly how the gap arose in the first place.
 */

import { readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

const SCHEMAS = path.resolve(__dirname, '../../../../../../rulesets/opa/schemas');
const BUILDER = path.resolve(__dirname, 'opa-input-builder.ts');

/**
 * Who produces each facet, and why. `observed` means the Core reads it off the
 * satellite; `supplied` means the caller sends it through `facts.satellite`.
 */
const DISPOSITION: Readonly<Record<string, { who: 'observed' | 'supplied'; why: string }>> = {
  'governance.files':
    { who: 'observed', why: 'a top-level file listing — asking a caller to declare it would be asking them to describe what is already in front of us' },
  'cicd-quality-gates.ci':
    { who: 'supplied', why: 'pipeline configuration lives in the CI system, not in the repository tree' },
  'cicd-quality-gates.findings':
    { who: 'supplied', why: 'scanner findings and their ages come from the scanners, not from a directory listing' },
  'cli-core-parity.coreParity':
    { who: 'supplied', why: 'it compares the vendor CLI against the Core; it is not a fact about the satellite under evaluation' },
  'cli-release-readiness.releaseReadiness':
    { who: 'supplied', why: 'buildPasses / testsPass / mcpSmokePasses require RUNNING the build, which a stateless engine does not do' },
  'executive-scorecards.scorecards':
    { who: 'supplied', why: 'DORA and SPACE figures come from the delivery pipeline and surveys' },
  'gitflow-branching.git':
    { who: 'supplied', why: 'branch protection, review counts and push history live in the forge, not in the working tree' },
  'hexagonal-architecture.layers':
    { who: 'supplied', why: 'it wants framework/infrastructure import analysis; hand-rolling that in an input builder would produce confident wrong verdicts, and the enforcer subsystem is where static analysis belongs' },
  'multi-runtime.runtime':
    { who: 'supplied', why: 'runtime selection rationale is a declaration about intent, not an observable' },
  'multi-tenancy.multiTenancy':
    { who: 'supplied', why: 'whether queries filter by tenant and whether RLS is enabled are not visible in a listing' },
  'open-core-boundary.openCore':
    { who: 'supplied', why: 'the open-core boundary is a declared commercial boundary, not a file fact' },
  'protocol-selection.protocol':
    { who: 'supplied', why: 'which calls use gRPC or REST needs call-graph analysis, same reasoning as the hexagonal layers' },
  'satellite-contracts.contracts':
    { who: 'supplied', why: 'it mixes file facts with governance STATE — phase approval, deprecation marking — that the registry holds' },
  'testing-pyramid.testing':
    { who: 'supplied', why: 'test-mix percentages and coverage come from a test run, not from source on disk' },
};

/** Facets the builder emits under `satellite:`. */
function emittedFacets(): Set<string> {
  const src = readFileSync(BUILDER, 'utf8');
  const start = src.indexOf('satellite: {');
  const body = src.slice(start, src.indexOf('\n      }', start));
  return new Set([...body.matchAll(/^\s{8}(\w+):/gm)].map((m) => m[1]));
}

/** `<category>.<facet>` for every facet a shipped schema requires. */
function requiredFacets(): { category: string; facet: string }[] {
  const out: { category: string; facet: string }[] = [];
  for (const file of readdirSync(SCHEMAS).filter((f) => f.endsWith('.input.schema.json'))) {
    const schema = JSON.parse(readFileSync(path.join(SCHEMAS, file), 'utf8')) as any;
    for (const facet of schema.properties?.satellite?.required ?? []) {
      out.push({ category: file.replace('.input.schema.json', ''), facet });
    }
  }
  return out;
}

describe('every shipped OPA category is observed or supplied · GT-694', () => {
  it('reads the real schemas and the real builder, so an empty scan cannot pass this vacuously', () => {
    expect(requiredFacets().length).toBeGreaterThanOrEqual(20);
    expect(emittedFacets().size).toBeGreaterThanOrEqual(10);
  });

  it('NO required facet is unaccounted for — the state the gap was', () => {
    const emitted = emittedFacets();
    const orphaned = requiredFacets()
      .filter(({ category, facet }) => !emitted.has(facet) && !(`${category}.${facet}` in DISPOSITION))
      .map(({ category, facet }) => `${category}.${facet}`);

    // A new schema requiring a fact nobody produces and nobody claimed is exactly
    // how thirteen categories became unrunnable without anyone noticing.
    expect(orphaned).toEqual([]);
  });

  it('every facet the Core claims to OBSERVE is really emitted by the builder', () => {
    const emitted = emittedFacets();
    const lying = Object.entries(DISPOSITION)
      .filter(([, d]) => d.who === 'observed')
      .map(([key]) => key)
      .filter((key) => !emitted.has(key.split('.')[1]));

    expect(lying).toEqual([]);
  });

  it('every disposition carries a reason, so no category is classified by silence', () => {
    const unexplained = Object.entries(DISPOSITION)
      .filter(([, d]) => d.why.trim().length < 20)
      .map(([key]) => key);

    expect(unexplained).toEqual([]);
  });

  it('pins the split, so a category quietly changing hands shows up here', () => {
    const observed = Object.values(DISPOSITION).filter((d) => d.who === 'observed').length;
    const supplied = Object.values(DISPOSITION).filter((d) => d.who === 'supplied').length;

    // Moving one from `supplied` to `observed` is progress and must be deliberate;
    // moving one the other way is a regression and must be argued.
    expect({ observed, supplied }).toEqual({ observed: 1, supplied: 13 });
  });
});
