import * as path from 'path';
import { findCoreFromSatellite } from '../paths/rulesets-location';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { RulesetLoader } from './ruleset-loader';
import { EvidenceValidator } from './evidence-validator';
import { BlockingCriteriaValidator } from './blocking-criteria-validator';
import { GateRegistryService, GateDefinition } from '../services/gate-registry.service';
import { GateValidationResult, PhaseGateDefinition, PhaseGatesRuleset } from './phase-gate-validator.types';

// The contract shapes moved to ./phase-gate-validator.types so the collaborators
// this service constructs can import them without importing this module back.
export * from './phase-gate-validator.types';

/**
 * Maps a canonical GateDefinition (from GateRegistryService / gate-f*.json) to the
 * internal PhaseGateDefinition shape consumed by EvidenceValidator and
 * BlockingCriteriaValidator.  This bridge keeps all existing callers working while
 * GT-318 migrates the engine to the canonical source.
 */
function canonicalToPhaseGate(def: GateDefinition, phaseNumber: number): PhaseGateDefinition {
  return {
    phase: phaseNumber,
    name: def.name,
    description: def.description,
    mandatoryEvidence: def.requiredArtifacts.map(a => ({
      artifact: a.artifact,
      schemaRef: a.schemaRef,
      validation: a.validation,
    })),
    blockingCriteria: def.blockingCriteria.map(c => ({
      criterion: c.criterion,
      action: c.action,
    })),
    accountableRole: def.accountableRole ?? '',
    waiverAuthority: def.waiverAuthority ?? '',
    waiverRequiredFields: ['criterion', 'justification', 'risk', 'owner', 'expirationDate', 'mitigationPlan'],
  };
}

export class PhaseGateValidatorService {
  private readonly fs: IFileSystem;
  private readonly logger: ILogger;
  private readonly rulesetPath: string;
  private readonly rulesetLoader: RulesetLoader;
  private readonly evidenceValidator: EvidenceValidator;
  private readonly blockingCriteriaValidator: BlockingCriteriaValidator;
  private readonly gateRegistry: GateRegistryService;
  /** Absolute path to the Evolith Core repo root */
  private readonly resolvedCorePath: string;

  constructor(corePath?: string, options?: { fileSystem?: IFileSystem; logger?: ILogger }) {
    if (!options?.fileSystem || !options?.logger) {
      // Direct infra instantiations are removed to enforce strict boundaries.
      // Callers must provide fs and logger via DI.
      throw new Error("PhaseGateValidatorService requires fileSystem and logger to be injected.");
    }
    this.fs = options.fileSystem;
    this.logger = options.logger;

    this.resolvedCorePath = corePath || this.findCorePath(process.cwd());

    // Legacy path kept for backward compat (getRulesetVersion, schema validation).
    // NOTE: rulesets/phase-gates/phase-gates.rules.json is DEPRECATED as the primary
    // gate source. The canonical source is now reference/governance/sdlc/gates/gate-f*.json
    // loaded via GateRegistryService (GT-318).
    this.rulesetPath = path.join(this.resolvedCorePath, 'rulesets', 'sdlc', 'phase-gates.rules.json');

    this.rulesetLoader = new RulesetLoader(this.fs, this.logger, this.rulesetPath);
    this.evidenceValidator = new EvidenceValidator(this.fs, this.logger, this.rulesetPath, this.resolvedCorePath);
    this.blockingCriteriaValidator = new BlockingCriteriaValidator(this.fs, this.logger, this.evidenceValidator);

    // GT-318: canonical gate source — loads gate-f*.json files
    const sdlcGatesPath = path.join(this.resolvedCorePath, 'reference', 'governance', 'sdlc', 'gates');
    // GT-650 — the gates name which artifact they require; the registry says what it is.
    const artifactRegistryPath = path.join(
      this.resolvedCorePath, 'src', 'rulesets', 'sdlc', 'artifact-registry.json',
    );
    this.gateRegistry = new GateRegistryService(sdlcGatesPath, this.fs, this.logger, artifactRegistryPath);
  }

  /**
   * Load all gates from the canonical source (gate-f*.json).
   * Falls back to the legacy phase-gates.rules.json only if the canonical source
   * returns no gates (backward compat).
   */
  async loadRuleset(): Promise<PhaseGatesRuleset> {
    const canonicalGates = await this.gateRegistry.loadAll();

    if (canonicalGates.length > 0) {
      // Map canonical gate IDs to phase numbers: gate-f1→1, gate-f2→2, …
      const gates: PhaseGateDefinition[] = canonicalGates.map(def => {
        const phaseNumber = parseInt(def.phase.replace('f', ''), 10);
        return canonicalToPhaseGate(def, phaseNumber);
      });
      return { version: '2.0.0', gates };
    }

    // Fallback: legacy source
    this.logger.warn('PhaseGateValidatorService: canonical gate-f*.json not found, falling back to phase-gates.rules.json');
    return this.rulesetLoader.loadRuleset();
  }

  /** Version of the loaded phase-gates ruleset, required by the ADR-0073 GateEvidence contract. */
  async getRulesetVersion(): Promise<string> {
    const ruleset = await this.loadRuleset();
    return ruleset.version ?? '0.0.0';
  }

  async validateGate(phaseNumber: number, projectPath: string): Promise<GateValidationResult> {
    // GT-318: route by stable gate ID, not substring
    const stableGateId = `gate-f${phaseNumber}`;
    const canonicalDef = await this.gateRegistry.getGate(stableGateId);

    let gate: PhaseGateDefinition;
    let canonicalGateId: string | undefined;
    let opaRules: string[] | undefined;

    if (canonicalDef) {
      gate = canonicalToPhaseGate(canonicalDef, phaseNumber);
      canonicalGateId = canonicalDef.id;
      opaRules = await this.gateRegistry.getOpaRulesForGate(stableGateId);
    } else {
      // Fallback to legacy ruleset
      const ruleset = await this.rulesetLoader.loadRuleset();
      const legacyGate = ruleset.gates.find(g => g.phase === phaseNumber);
      if (!legacyGate) {
        throw new Error(`Phase gate ${phaseNumber} not defined in ruleset`);
      }
      gate = legacyGate;
    }

    const evidenceResults = await this.evidenceValidator.validateEvidence(gate, projectPath);
    const blockingChecks = await this.blockingCriteriaValidator.checkBlockingCriteria(gate, projectPath, evidenceResults);

    const allEvidencePassed = evidenceResults.every(e => e.passed || !e.required);
    const noBlocking = blockingChecks.every(b => !b.triggered);

    return {
      gateId: `PG-${gate.phase}`,
      phase: gate.phase,
      name: gate.name,
      passed: allEvidencePassed && noBlocking,
      evidenceResults,
      blockingChecks,
      waiverAvailable: true,
      accountableRole: gate.accountableRole,
      waiverAuthority: gate.waiverAuthority,
      canonicalGateId,
      opaRules,
    };
  }

  async validateAllGates(projectPath: string): Promise<GateValidationResult[]> {
    const ruleset = await this.loadRuleset();
    const results: GateValidationResult[] = [];

    for (const gate of ruleset.gates) {
      const result = await this.validateGate(gate.phase, projectPath);
      results.push(result);
    }

    return results;
  }

  async getGateStatus(projectPath: string): Promise<{
    currentPhase: number;
    gatesPassed: number;
    gatesFailed: number;
    gatesPending: number;
    results: GateValidationResult[];
  }> {
    const results = await this.validateAllGates(projectPath);

    let currentPhase = 0;
    let gatesPassed = 0;
    let gatesFailed = 0;
    let gatesPending = 0;

    for (const result of results) {
      if (result.passed) {
        gatesPassed++;
        currentPhase = result.phase;
      } else {
        const hasRequiredFailures = result.evidenceResults.some(e => !e.passed && e.required);
        if (hasRequiredFailures) {
          gatesFailed++;
          if (currentPhase === result.phase - 1) {
            break;
          }
        } else {
          gatesPending++;
        }
      }
    }

    return {
      currentPhase,
      gatesPassed,
      gatesFailed,
      gatesPending: results.length - gatesPassed - gatesFailed,
      results,
    };
  }

  /**
   * Locate the Evolith Core repository root at or above `projectPath`.
   *
   * GT-572 — the probe used to look for `rulesets/` only. The `src/` refactor
   * moved that directory to `<root>/src/rulesets`, while the gate definitions
   * this service actually loads stayed at
   * `<root>/reference/governance/sdlc/gates`. Walking up for `rulesets` therefore
   * stopped ONE LEVEL TOO DEEP — at `<root>/src` — and every gate evaluation that
   * did not pass `corePath` explicitly failed with `RULESET_NOT_FOUND`.
   *
   * That was not hypothetical: the MCP stdio smoke has been receiving exactly
   * that error and printing `tools/call OK`, because its only assertion was that
   * the envelope carried a `success` field. Same family as GT-632 — a joined path
   * the refactor left behind, kept invisible by an oracle that could not fail.
   *
   * The probe now leads with the artefact this service consumes, and keeps the
   * `rulesets` probe behind it for satellite/legacy layouts that have no
   * `reference/` tree. Markers are tried one at a time, each walking the full
   * ancestry, so a shallow `rulesets` never wins over a correct `reference` root.
   */
  /**
   * GT-705 — no name-shaped fallback, and content-qualified.
   *
   * This ended `return path.join(projectPath, '..', 'evolith')` — a sibling directory
   * named after the vendor's own monorepo. Measured on the published MCP server:
   * 50 tools announced, RULESET_NOT_FOUND on every corpus-dependent one, because
   * nobody looked where the corpus lives. The walk also qualified by EXISTENCE,
   * which is GT-566's defect: `rulesets/agents` shares the name and holds no rules.
   *
   * Returning the satellite itself when nothing is found is deliberate: the
   * repository then reports "no corpus under <a real path>" instead of naming a
   * directory that never existed.
   */
  /**
   * GT-705 — no name-shaped fallback, and content-qualified.
   *
   * This ended `return path.join(projectPath, '..', 'evolith')` — a sibling
   * directory named after the vendor's own monorepo — and qualified candidates by
   * EXISTENCE, which is GT-566's defect: `rulesets/agents` shares the name and
   * holds no rules.
   *
   * The GATE tree is probed FIRST and that ordering is load-bearing, not tidiness.
   * This repository keeps the corpus at `<root>/src/rulesets` and the gate
   * definitions at `<root>/reference/governance/sdlc/gates`; a corpus-only walk
   * stops at `<root>/src`, which holds rules and no gates, and every gate
   * evaluation then fails looking for them. GT-572 is the record of that.
   */
  private findCorePath(projectPath: string): string {
    const gates = path.join('reference', 'governance', 'sdlc', 'gates');
    const parts = projectPath.split(path.sep);
    while (parts.length > 0) {
      parts.pop();
      const root = parts.join(path.sep);
      if (root && this.fs.existsSync(path.join(root, gates))) return root;
    }
    return findCoreFromSatellite(projectPath, { existsSync: (p) => this.fs.existsSync(p) }, path.sep)
      ?? projectPath;
  }
}
