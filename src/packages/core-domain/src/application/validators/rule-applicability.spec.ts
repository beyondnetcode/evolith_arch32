/**
 * GT-571 — a freshly initialized satellite must return ZERO blocking findings.
 *
 * The headline test here runs the REAL `evolith init` scaffolder into a real
 * temporary directory and validates it against the REAL rule corpus in
 * `src/rulesets`. Nothing is mocked, because the defect was not in a mock: the
 * first `evolith validate` of a brand-new repository returned 35 blocking
 * findings, of which every single one was addressed to somebody else —
 *
 *   CLI-RR-01  "dist/main.js not found — run npm run build in sdk/cli"
 *   TAX-05     "Missing top-level directories: rulesets, sdk"
 *   AAI-R01…09, DAM-R01…03, EC-R01…03, ED-R01…03, SV-R01…04, DM-R02…03, MM-R02…05
 *              (eight mutually exclusive topologies, all fired at once)
 *   TAX-06, DEP-01, DEP-10, CB-VAL-01
 *              (artifacts a `phase-0` scaffold does not have yet)
 *
 * Every assertion below fails against the pre-GT-571 code.
 */

import * as nodeFs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { RulesetValidatorService } from './ruleset-validator.service';
import { partitionByApplicability } from './rule-evaluation-engine';
import {
  ApplicabilityContext,
  RuleApplicabilityIndex,
  notApplicableReason,
  readSatelliteDeclaration,
} from './rule-applicability';
import { InitializeProjectUseCase } from '../use-cases/initialize-project.use-case';
import { NormalizedRule } from '../../domain/models/normalized-rule';
import { DiskRulesetRepository } from '../../../../infra-providers/src/disk-ruleset.repository';
import { NodeFileSystemProvider } from '../../../../infra-providers/src/node-filesystem.provider';
import { YamlConfigParserImpl } from '../../../../infra-providers/src/config-parser.provider';

/** The Evolith Core monorepo root — the corpus under test lives at `src/rulesets`. */
const CORE = path.resolve(__dirname, '../../../../../..');

const silentLogger = {
  info: () => undefined, warn: () => undefined, error: () => undefined,
  debug: () => undefined, success: () => undefined,
} as any;

const catalogStub = {
  loadRuntimeCatalog: () => [{ id: 'typescript' }],
  getMonorepoOptions: () => [{ id: 'nx' }],
  getArchitecturePatterns: () => [{ id: 'clean' }],
} as any;

function validatorFor(overrides: Record<string, unknown> = {}): RulesetValidatorService {
  const fs = new NodeFileSystemProvider() as any;
  return new RulesetValidatorService({
    fileSystem: fs,
    logger: silentLogger,
    configParser: new YamlConfigParserImpl() as any,
    rulesetRepo: new DiskRulesetRepository(fs, silentLogger) as any,
    ...overrides,
  });
}

/** Runs the real init use case and returns the scaffolded satellite root. */
async function freshlyInitializedSatellite(): Promise<string> {
  const cwd = nodeFs.mkdtempSync(path.join(os.tmpdir(), 'gt571-'));
  const useCase = new InitializeProjectUseCase(new NodeFileSystemProvider() as any, catalogStub);
  const result = await useCase.execute(
    {
      name: 'my-sat',
      runtime: 'typescript',
      monorepo: 'nx',
      architecture: 'clean',
      database: 'postgres',
      apiProtocol: 'rest',
      ciCd: 'github-actions',
      observability: 'otel',
      features: ['adr', 'hooks', 'acl'],
      agents: [],
    },
    cwd,
  );
  expect(result.success).toBe(true);
  return path.join(cwd, 'my-sat');
}

jest.setTimeout(120_000);

describe('GT-571 · the first validate of a freshly initialized satellite', () => {
  let satellitePath: string;

  beforeAll(async () => {
    satellitePath = await freshlyInitializedSatellite();
  });

  it('returns ZERO blocking findings', async () => {
    const result = await validatorFor().validate(satellitePath, CORE);
    const blocking = result.issues.filter(i => i.blocking);

    expect(
      blocking.map(i => `${i.ruleId}: ${i.description}`),
    ).toEqual([]);
    expect(result.status).not.toBe('failed');
  });

  it('does not fire the vendor\'s own monorepo rules at a satellite', async () => {
    const result = await validatorFor().validate(satellitePath, CORE);
    const fired = new Set(result.issues.map(i => i.ruleId));

    // The two the audit named by hand, plus the rest of their families.
    for (const ruleId of ['CLI-RR-01', 'CLI-RR-02', 'CLI-PAR-01', 'TAX-05']) {
      expect(fired.has(ruleId)).toBe(false);
      expect(result.notApplicableRuleIds).toContain(ruleId);
    }
  });

  it('does not fire the rules of topologies the repository never declared', async () => {
    const result = await validatorFor().validate(satellitePath, CORE);
    const fired = new Set(result.issues.map(i => i.ruleId));

    // One representative per topology ruleset — a fresh scaffold declares none.
    for (const ruleId of ['AAI-R01', 'DAM-R01', 'EC-R01', 'ED-R01', 'SV-R01', 'DM-R02', 'MM-R02']) {
      expect(fired.has(ruleId)).toBe(false);
      expect(result.notApplicableRuleIds).toContain(ruleId);
    }
  });

  it('keeps the GT-569 denominator honest: not-applicable is NOT skipped', async () => {
    const result = await validatorFor().validate(satellitePath, CORE);

    // The GT-569 invariant still holds LITERALLY over the evaluated corpus…
    expect(result.rulesChecked + result.rulesSkipped! + result.rulesErrored!).toBe(result.rulesTotal);

    // …and the excluded rules are reported separately, over the full corpus.
    expect(result.rulesNotApplicable).toBeGreaterThan(0);
    expect(result.corpusTotal).toBe(result.rulesTotal! + result.rulesNotApplicable!);

    // Crucially: nothing excluded by applicability leaked into the skipped set,
    // which would have inflated the unevaluated fraction that `maxSkippedFraction`
    // gates on and failed a repository with nothing wrong with it.
    const skipped = new Set(result.skippedRuleIds);
    for (const id of result.notApplicableRuleIds!) expect(skipped.has(id)).toBe(false);
  });

  it('reports the exclusion instead of hiding it', async () => {
    const result = await validatorFor().validate(satellitePath, CORE);
    const advisory = result.issues.find(i => i.ruleId === 'GOV-RULE-NOT-APPLICABLE');

    expect(advisory).toBeDefined();
    expect(advisory!.blocking).toBe(false);
    expect(advisory!.description).toContain('excluded BEFORE evaluation');
  });

  it('still evaluates the whole corpus when a host opts out', async () => {
    const filtered = await validatorFor().validate(satellitePath, CORE);
    const unfiltered = await validatorFor({ applyRuleApplicability: false }).validate(satellitePath, CORE);

    expect(unfiltered.rulesNotApplicable).toBe(0);
    expect(unfiltered.rulesTotal).toBe(filtered.corpusTotal);
    // The escape hatch is only useful if it really restores the old behaviour.
    expect(unfiltered.issues.filter(i => i.blocking).length).toBeGreaterThan(0);
  });
});

describe('GT-571 · the Core monorepo keeps its own rules', () => {
  it('never filters a `core`-audience rule out of the Core itself', async () => {
    const fs = new NodeFileSystemProvider() as any;
    const rules = await new DiskRulesetRepository(fs, silentLogger).loadAllRulesets(CORE);
    const index = await RuleApplicabilityIndex.load(fs, CORE, path.sep);

    // The Core declares progressive phase F1 (⇒ modular-monolith) at SDLC phase 1.
    const asCore: ApplicabilityContext = {
      audience: 'core',
      declaredTopologies: ['modular-monolith'],
      sdlcPhase: 1,
    };
    const { notApplicable } = partitionByApplicability(rules as NormalizedRule[], { index, context: asCore });
    const excluded = new Set(notApplicable.map(n => n.rule.id));

    // Core-only rules stay in force against the Core…
    for (const ruleId of ['CLI-RR-01', 'CLI-PAR-01', 'TAX-05', 'TAX-11', 'OCB-01']) {
      expect(excluded.has(ruleId)).toBe(false);
    }
    // …as do the rules of the topology it declares, and its phase-1 artifacts.
    for (const ruleId of ['MM-R02', 'DEP-01', 'CB-VAL-01']) {
      expect(excluded.has(ruleId)).toBe(false);
    }
    // Only the seven topologies it did NOT declare, and the satellite-only rule.
    for (const ruleId of ['SV-R01', 'AAI-R01', 'MS-R01', 'TAX-06']) {
      expect(excluded.has(ruleId)).toBe(true);
    }
  });

  it('annotates the corpus families the audit named', async () => {
    const fs = new NodeFileSystemProvider() as any;
    const index = await RuleApplicabilityIndex.load(fs, CORE, path.sep);

    expect(index.get('CLI-RR-01')?.audience).toBe('core');
    expect(index.get('TAX-05')?.audience).toBe('core');
    expect(index.get('TAX-06')?.audience).toBe('satellite');
    expect(index.get('SV-R01')?.topologies).toEqual(['serverless']);
    expect(index.get('MM-R02')?.topologies).toEqual(['modular-monolith']);
    expect(index.get('DEP-01')?.appliesFromSdlcPhase).toBe(1);

    // An unannotated rule keeps the permissive default.
    expect(index.get('TAX-01')?.audience).toBe('both');
    expect(index.get('TAX-01')?.topologies).toBeUndefined();
    expect(index.get('TAX-01')?.appliesFromSdlcPhase).toBeUndefined();
  });
});

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
