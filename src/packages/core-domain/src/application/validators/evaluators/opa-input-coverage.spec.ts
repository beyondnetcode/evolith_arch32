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

/**
 * GT-695 — a policy may not read a field its own schema does not declare.
 *
 * The input schema is the only document a caller reads to learn what an evaluation
 * wants. When a policy reads a field the schema never mentions, a caller who
 * satisfies the published contract IN FULL still fails, and the remedy is named
 * nowhere they can look. That is worse than a rule that fails loudly: the verdict
 * is indistinguishable from a real violation.
 *
 * Measured 2026-08-15: 21 such fields across 10 categories. Found the way a customer
 * would find it — supplying every field `multi-tenancy.input.schema.json` declares
 * and watching `MTN-06`/`MTN-07` fire anyway, because the policy reads
 * `tenantAuditTrailEnabled` and `tenantMigrationPathDefined` and the schema
 * mentioned neither.
 *
 * `additionalProperties` is undefined on these schemas, so the undeclared fields
 * were always ACCEPTED — the defect was discoverability, never rejection. Declaring
 * them therefore changes no verdict; it makes the contract truthful. They are added
 * to `properties` and NOT to `required`, deliberately: in Rego an absent field makes
 * `not input.x.y` true, so absence already means "not done", and making them
 * required would turn a legible violation into a schema error.
 */
describe('a policy reads nothing its schema fails to declare · GT-695', () => {
  const OPA = path.resolve(SCHEMAS, '..');

  /** `<category>.<facet>.<field>` for every field a policy reads and no schema declares. */
  function undeclaredReads(): string[] {
    const out: string[] = [];
    for (const file of readdirSync(SCHEMAS).filter((f) => f.endsWith('.input.schema.json'))) {
      const category = file.replace('.input.schema.json', '');
      const rego = path.join(OPA, `${category}.rego`);
      let source: string;
      try {
        source = readFileSync(rego, 'utf8');
      } catch {
        continue; // a schema with no policy beside it is a different gap
      }
      const declared = (JSON.parse(readFileSync(path.join(SCHEMAS, file), 'utf8')) as any)
        .properties?.satellite?.properties ?? {};

      for (const [, facet, field] of source.matchAll(/input\.satellite\.(\w+)\.(\w+)/g)) {
        if (!declared[facet]?.properties) continue; // the facet itself is GT-694's concern
        if (!(field in declared[facet].properties)) out.push(`${category}.${facet}.${field}`);
      }
      for (const [, field] of source.matchAll(/input\.satellite\.(\w+)(?![\w.])/g)) {
        if (!(field in declared)) out.push(`${category}.${field}`);
      }
    }
    return [...new Set(out)].sort();
  }

  it('reads the real policies, so an empty scan cannot pass this vacuously', () => {
    const anyRead = readFileSync(path.join(OPA, 'multi-tenancy.rego'), 'utf8');
    expect([...anyRead.matchAll(/input\.satellite\./g)].length).toBeGreaterThan(5);
  });

  it('EVERY field a policy reads is declared in its schema', () => {
    expect(undeclaredReads()).toEqual([]);
  });

  it("the tenancy schema declares the two fields that made MTN-06/07 unsatisfiable", () => {
    const declared = (JSON.parse(
      readFileSync(path.join(SCHEMAS, 'multi-tenancy.input.schema.json'), 'utf8'),
    ) as any).properties.satellite.properties.multiTenancy.properties;

    expect(Object.keys(declared)).toEqual(expect.arrayContaining([
      'tenantAuditTrailEnabled',
      'tenantMigrationPathDefined',
    ]));
    // Declared, NOT required: absence already means "not done" to the policy, and
    // requiring them would turn a legible violation into a schema error.
    const required = (JSON.parse(
      readFileSync(path.join(SCHEMAS, 'multi-tenancy.input.schema.json'), 'utf8'),
    ) as any).properties.satellite.properties.multiTenancy.required;
    expect(required).not.toContain('tenantAuditTrailEnabled');
  });

  it('the SPACE-03 field is spelled the way its own message spells it', () => {
    const rego = readFileSync(path.join(OPA, 'executive-scorecards.rego'), 'utf8');
    // The message says "Team cognitive load survey"; the field used to say `cognitiv`.
    expect(rego).toContain('cognitiveLoadSurveyCompleted');
    expect(rego).not.toContain('cognitivLoad');
  });
});
