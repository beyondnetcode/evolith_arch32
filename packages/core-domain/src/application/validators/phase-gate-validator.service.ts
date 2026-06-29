import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { RulesetLoader } from './ruleset-loader';
import { EvidenceValidator } from './evidence-validator';
import { BlockingCriteriaValidator } from './blocking-criteria-validator';
import { GateRegistryService, GateDefinition } from '../services/gate-registry.service';

export interface PhaseGateDefinition {
  phase: number;
  name: string;
  description: string;
  mandatoryEvidence: EvidenceRequirement[];
  blockingCriteria: BlockingCriterion[];
  accountableRole: string;
  waiverAuthority: string;
  waiverRequiredFields: string[];
}

export interface EvidenceRequirement {
  artifact: string;
  schemaRef?: string;
  status?: string;
  validation: string;
}

export interface BlockingCriterion {
  criterion: string;
  action: string;
}

export interface GateValidationResult {
  gateId: string;
  phase: number;
  name: string;
  passed: boolean;
  evidenceResults: EvidenceValidationResult[];
  blockingChecks: BlockingCheckResult[];
  waiverAvailable: boolean;
  accountableRole: string;
  waiverAuthority: string;
  /** Stable canonical gate ID from GateRegistryService, e.g. "gate-f1" (GT-318) */
  canonicalGateId?: string;
  /** .rego rule paths cited in the canonical gate definition (GT-318) */
  opaRules?: string[];
}

export interface EvidenceValidationResult {
  artifact: string;
  passed: boolean;
  found: boolean;
  schemaValid: boolean;
  validationMessage: string;
  required: boolean;
}

export interface BlockingCheckResult {
  criterion: string;
  triggered: boolean;
  action: string;
}

export interface PhaseGatesRuleset {
  version?: string;
  gates: PhaseGateDefinition[];
}

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
    this.gateRegistry = new GateRegistryService(sdlcGatesPath, this.fs, this.logger);
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

  private findCorePath(projectPath: string): string {
    const parts = projectPath.split(path.sep);
    while (parts.length > 0) {
      parts.pop();
      const candidate = path.join(parts.join(path.sep), 'rulesets');
      if (this.fs.existsSync(candidate)) {
        return parts.join(path.sep);
      }
    }
    return path.join(projectPath, '..', 'evolith');
  }
}
