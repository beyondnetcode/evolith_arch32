/* eslint-disable boundaries/element-types */
import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';
import { RulesetLoader } from './ruleset-loader';
import { EvidenceValidator } from './evidence-validator';
import { BlockingCriteriaValidator } from './blocking-criteria-validator';

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

export class PhaseGateValidatorService {
  private readonly fs: IFileSystem;
  private readonly logger: ILogger;
  private readonly rulesetPath: string;
  private readonly rulesetLoader: RulesetLoader;
  private readonly evidenceValidator: EvidenceValidator;
  private readonly blockingCriteriaValidator: BlockingCriteriaValidator;

  constructor(corePath?: string, options?: { fileSystem?: IFileSystem; logger?: ILogger }) {
    if (!options?.fileSystem || !options?.logger) {
      // Direct infra instantiations are removed to enforce strict boundaries.
      // Callers must provide fs and logger via DI.
      throw new Error("PhaseGateValidatorService requires fileSystem and logger to be injected.");
    }
    this.fs = options.fileSystem;
    this.logger = options.logger;

    const resolvedCorePath = corePath || this.findCorePath(process.cwd());
    this.rulesetPath = path.join(resolvedCorePath, 'rulesets', 'sdlc', 'phase-gates.rules.json');
    
    this.rulesetLoader = new RulesetLoader(this.fs, this.logger, this.rulesetPath);
    this.evidenceValidator = new EvidenceValidator(this.fs, this.logger, this.rulesetPath);
    this.blockingCriteriaValidator = new BlockingCriteriaValidator(this.fs, this.logger, this.evidenceValidator);
  }

  async loadRuleset(): Promise<PhaseGatesRuleset> {
    return this.rulesetLoader.loadRuleset();
  }

  /** Version of the loaded phase-gates ruleset, required by the ADR-0073 GateEvidence contract. */
  async getRulesetVersion(): Promise<string> {
    return this.rulesetLoader.getRulesetVersion();
  }

  async validateGate(phaseNumber: number, projectPath: string): Promise<GateValidationResult> {
    const ruleset = await this.loadRuleset();
    const gate = ruleset.gates.find(g => g.phase === phaseNumber);

    if (!gate) {
      throw new Error(`Phase gate ${phaseNumber} not defined in ruleset`);
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
