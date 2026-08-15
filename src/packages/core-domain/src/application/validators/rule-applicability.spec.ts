/**
 * GT-571 — applicability is a pure decision.
 *
 * The integration half of this gap — the REAL init scaffolder validated against
 * the REAL corpus — lives in `infra-providers`, where the disk adapters it needs
 * are declared. It was here originally and imported
 * `../../../../infra-providers/src/...` across a package boundary, which broke
 * core-domain's own CI job (the subpath resolves through dist) and inverted the
 * hexagonal direction this product exists to enforce. The boundary guard did not
 * catch it because every boundaries config excludes spec files.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ApplicabilityContext,
  notApplicableReason,
  readSatelliteDeclaration,
  resolveApplicabilityContext,
} from './rule-applicability';

describe('GT-571 · applicability is a pure decision with permissive defaults', () => {
  const satellite: ApplicabilityContext = {
    audience: 'satellite', declaredTopologies: [], sdlcPhase: 0,
  };

  it('applies an unannotated rule to everything', () => {
    expect(notApplicableReason(undefined, satellite)).toBeUndefined();
    expect(notApplicableReason({ audience: 'both' }, satellite)).toBeUndefined();
  });

  it('excludes on audience, topology and phase — and names which', () => {
    expect(notApplicableReason({ audience: 'core' }, satellite)).toBe('audience');
    expect(notApplicableReason({ audience: 'both', topologies: ['serverless'] }, satellite)).toBe('topology');
    expect(notApplicableReason({ audience: 'both', appliesFromSdlcPhase: 3 }, satellite)).toBe('sdlc-phase');
  });

  it('keeps a topology rule when the repository declares that topology', () => {
    const declared: ApplicabilityContext = {
      audience: 'satellite', declaredTopologies: ['serverless'], sdlcPhase: 3,
    };
    expect(notApplicableReason({ audience: 'both', topologies: ['serverless'] }, declared)).toBeUndefined();
    expect(notApplicableReason({ audience: 'both', topologies: ['event-driven'] }, declared)).toBe('topology');
  });

  it('does not gate on a phase the repository never declared (fail-open)', () => {
    const undeclared: ApplicabilityContext = {
      audience: 'satellite', declaredTopologies: [], sdlcPhase: undefined,
    };
    expect(notApplicableReason({ audience: 'both', appliesFromSdlcPhase: 5 }, undeclared)).toBeUndefined();
  });
});

describe('GT-571 · reading the declaration out of both manifest shapes', () => {
  it('reads the canonical satellite contract', () => {
    const decl = readSatelliteDeclaration({
      apiVersion: 'evolith.dev/v1',
      kind: 'Satellite',
      metadata: { name: 'evolith', phase: 'F1', architectureVersion: '0.1.0' },
      spec: {
        sdlc: { currentPhase: 3, gates: {} },
        design: { topology: { confirmed: ['event-driven'] } },
      },
    });

    expect(decl.sdlcPhase).toBe(3);
    expect(new Set(decl.topologies)).toEqual(new Set(['modular-monolith', 'event-driven']));
  });

  it('reads the shape `evolith init` actually writes today', () => {
    // This is the manifest the scaffolder emits — NOT the canonical contract.
    // Ignoring it would have fixed nothing, since it is the very repository the
    // acceptance criterion is about.
    const decl = readSatelliteDeclaration({
      coreRef: { version: '1.0.0', path: '../evolith' },
      governance: { version: '1.0.0' },
      product: { name: 'my-sat', type: 'enterprise-application', phase: 'phase-0' },
    });

    expect(decl.sdlcPhase).toBe(0);
    expect(decl.topologies).toEqual([]);
    expect(decl.audience).toBeUndefined();
  });

  it('honours an explicit audience override', () => {
    expect(readSatelliteDeclaration({ metadata: { audience: 'core' } }).audience).toBe('core');
  });

  it('survives a manifest it cannot make sense of', () => {
    expect(readSatelliteDeclaration(null)).toEqual({ topologies: [] });
    expect(readSatelliteDeclaration('not an object')).toEqual({ topologies: [] });
  });
});

/**
 * GT-571 criterion 2 — the regression guard for "a freshly initialized repo
 * returns 0 blocking findings".
 *
 * Measured against the published 1.2.1 on 2026-07-28, a fresh satellite reported
 * 91 blocking findings. Every one came from a GENERATED ADR-conformance ruleset
 * and none from a hand-authored rule, so the repository had nothing wrong with
 * it: those rules assert, among other things, that the decision record they cite
 * EXISTS under `reference/core/architecture/adrs/`, a tree only the Core has.
 *
 * These tests read the REAL corpus rather than a fixture, because the failure
 * mode is someone regenerating it without the audience — at which point the file
 * on disk is what decides, not a fixture that agrees with us.
 */
describe('GT-571 — the generated ADR corpus is addressed to the Core', () => {
  const generatedDir = path.resolve(__dirname, '../../../../../rulesets/adr/generated');

  const rulesets = (): { file: string; doc: Record<string, unknown> }[] =>
    fs
      .readdirSync(generatedDir)
      .filter((f) => f.endsWith('.rules.json'))
      .map((file) => ({
        file,
        doc: JSON.parse(fs.readFileSync(path.join(generatedDir, file), 'utf8')) as Record<string, unknown>,
      }));

  it('finds the corpus at all — a zero-file scan is not a pass', () => {
    expect(fs.existsSync(generatedDir)).toBe(true);
    expect(rulesets().length).toBeGreaterThan(100);
  });

  it('every generated ruleset declares `audience: core`', () => {
    const undeclared = rulesets()
      .filter(({ doc }) => doc.audience !== 'core')
      .map(({ file, doc }) => `${file} (audience=${JSON.stringify(doc.audience)})`);

    // The message carries the whole list: regenerating without the audience
    // reintroduces all of them at once, and naming one would hide the scale.
    expect(undeclared).toEqual([]);
  });

  it('a satellite excludes them, and the Core does not', () => {
    // The two halves that make this a filter rather than an off-switch. Verified
    // end to end the same day: a fresh satellite went 91 blocking -> 0, while the
    // Core still evaluated all 133 and still blocked.
    const rule = { audience: 'core' } as const;
    expect(
      notApplicableReason(rule, { audience: 'satellite', declaredTopologies: [] }),
    ).toBe('audience');
    expect(
      notApplicableReason(rule, { audience: 'core', declaredTopologies: [] }),
    ).toBeUndefined();
  });
});


/**
 * GT-688 — the inline composition must ADD to what the repository declares, and
 * must never be able to take anything away.
 *
 * ADR-0101 makes the caller stateless: a Tracker/REST consumer has no
 * `evolith.yaml` on disk, so the read below finds nothing and EVERY
 * topology-scoped rule was silently excluded. `overrides.declaredTopologies` is
 * how a declared composition reaches rule SELECTION at all.
 */
describe('GT-688 · resolveApplicabilityContext unions the declared composition', () => {
  /** A memfs-ish stub: one file, at the satellite root. */
  const depsWith = (manifest?: string) => ({
    fs: {
      exists: async (p: string) => manifest !== undefined && p === '/sat/evolith.yaml',
      readFile: async () => manifest ?? '',
      readdir: async () => [],
      readdirNames: async () => [],
      stat: async () => ({ isDirectory: () => false, isFile: () => true }),
    } as never,
    configParser: {
      parse: (raw: string) => JSON.parse(raw) as Record<string, unknown>,
    } as never,
  });

  // The declaration shape `readSatelliteDeclaration` reads. Parsed as JSON here
  // because the stub parser is JSON — the YAML reader is exercised elsewhere.
  const declaring = (topologies: string[]) =>
    JSON.stringify({ spec: { design: { topology: { confirmed: topologies } } } });

  it('unions the override with the disk declaration, never substituting it', async () => {
    const ctx = await resolveApplicabilityContext(
      depsWith(declaring(['modular-monolith'])),
      '/sat',
      '/core',
      '/',
      { declaredTopologies: ['agentic-ai'] },
    );
    expect([...ctx.declaredTopologies].sort()).toEqual(['agentic-ai', 'modular-monolith']);
  });

  it('an EMPTY override leaves the disk declaration standing', async () => {
    const ctx = await resolveApplicabilityContext(
      depsWith(declaring(['modular-monolith'])),
      '/sat',
      '/core',
      '/',
      { declaredTopologies: [] },
    );
    expect(ctx.declaredTopologies).toEqual(['modular-monolith']);
  });

  it('carries the composition for a satellite with NO evolith.yaml at all', async () => {
    // The ADR-0101 case: this used to yield `[]`, i.e. every topology rule excluded.
    const ctx = await resolveApplicabilityContext(depsWith(undefined), '/sat', '/core', '/', {
      declaredTopologies: ['modular-monolith', 'agentic-ai'],
    });
    expect([...ctx.declaredTopologies].sort()).toEqual(['agentic-ai', 'modular-monolith']);
  });

  it('de-duplicates an override that repeats a disk-declared topology', async () => {
    const ctx = await resolveApplicabilityContext(
      depsWith(declaring(['modular-monolith'])),
      '/sat',
      '/core',
      '/',
      { declaredTopologies: ['modular-monolith'] },
    );
    expect(ctx.declaredTopologies).toEqual(['modular-monolith']);
  });

  it('omitting the override is exactly the pre-GT-688 behaviour', async () => {
    const ctx = await resolveApplicabilityContext(depsWith(declaring(['microservices'])), '/sat', '/core', '/');
    expect(ctx.declaredTopologies).toEqual(['microservices']);
  });
});

/**
 * GT-688 AC6 — the refusal has to live where EVERY surface passes, and the
 * criterion names that seam explicitly: `RulesetValidatorService.validate`,
 * which takes no `kinds` argument at all.
 *
 * The reason the criterion is written that way: `evolith evaluate` builds its
 * context with `kinds: ['gate','compliance']`, so a refusal expressed only in
 * the `topology` kind evaluator is bypassed by the enforcement path itself —
 * with `MM-R*` and `MS-R*` both in scope and no `TOPOLOGY_COMPOSITION_CONFLICT`
 * anywhere in the verdict.
 *
 * Measured through the CLI while closing this row: `evolith evaluate
 * -t modular-monolith -t microservices` DOES carry the refusal. This pins the
 * seam itself so the runtime behaviour cannot regress unnoticed.
 */
describe('GT-688 AC6 · the progressive-axis refusal is raised on the validator seam', () => {
  // `compositionConflictIssue` is private; the seam is reached through `validate`,
  // which is the point of the criterion — a caller cannot opt out of it.
  const { RulesetValidatorService } = require('./ruleset-validator.service');

  function validatorRefusing(declaredTopologies: string[]) {
    const service = new RulesetValidatorService({
      fileSystem: { exists: async () => false, readFile: async () => '', readdirNames: async () => [] } as never,
      logger: { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined, success: () => undefined } as never,
      configParser: { parse: () => ({}) } as never,
      rulesetRepo: { loadAllRulesets: async () => [] } as never,
    });
    return (service as any).compositionConflictIssue(declaredTopologies);
  }

  it('REFUSES two progressive-axis members', () => {
    const issue = validatorRefusing(['modular-monolith', 'microservices']);
    expect(issue?.ruleId).toBe('TOPOLOGY_COMPOSITION_CONFLICT');
    expect(issue?.blocking).toBe(true);
    // The message must name both, or the operator cannot act on it.
    expect(issue?.description).toMatch(/modular-monolith/);
    expect(issue?.description).toMatch(/microservices/);
  });

  it('is SILENT for a composition that mixes dimensions, which is the whole point of ADR-0079', () => {
    expect(validatorRefusing(['modular-monolith', 'agentic-ai', 'event-driven'])).toBeUndefined();
  });

  it('is SILENT for a single topology and for none at all', () => {
    expect(validatorRefusing(['microservices'])).toBeUndefined();
    expect(validatorRefusing([])).toBeUndefined();
  });
});
