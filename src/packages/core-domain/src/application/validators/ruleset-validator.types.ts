import { ILogger, IFileSystem, IConfigParser } from '../../domain/interfaces';
import { IRulesetRepository } from '../../domain/ports/ruleset-repository.port';
import { TopologyCatalogService } from '../services/topology-catalog.service';
import type { IProcessRunner } from './enforcement/enforcer.types';
import type { IEnforcerMetrics } from './enforcement/enforcer-metrics';

/**
 * GT-569 — the denominator a coverage claim is meaningless without.
 *
 * `rulesChecked` on its own says nothing: a corpus of 379 rules of which 108
 * are evaluated reports "111 checked" and reads as a full pass. These counters
 * make the shape of the run explicit, and they always satisfy
 * `rulesChecked + rulesSkipped + rulesErrored === rulesTotal`.
 */
export interface RuleCoverage {
  /** Rules the engine ACTUALLY evaluated (passed + failed). */
  rulesChecked: number;
  /** Rules not evaluated because no handler supports them / evidence is external. */
  rulesSkipped: number;
  /** Rules not evaluated because their handler threw. Never conflated with skipped. */
  rulesErrored: number;
  /** The denominator: every rule the engine was handed. */
  rulesTotal: number;
  /** Ids of the rules counted in `rulesSkipped`. */
  skippedRuleIds: string[];
  /** Ids of the rules counted in `rulesErrored`. */
  erroredRuleIds: string[];
}

export interface ValidationResult {
  status: 'passed' | 'failed' | 'warning';
  rulesChecked: number;
  /**
   * GT-569 coverage denominator. Declared OPTIONAL only so the wire envelope
   * stays additive and pre-existing producers of `ValidationResult` keep
   * compiling; `RulesetValidatorService.validate` always populates all six.
   */
  rulesSkipped?: number;
  rulesErrored?: number;
  rulesTotal?: number;
  skippedRuleIds?: string[];
  erroredRuleIds?: string[];
  issues: ValidationIssue[];
  coreRef: {
    version: string | null;
    path: string | null;
  };
  timestamp: string;
}

export interface ValidationIssue {
  ruleId: string;
  severity: 'MUST' | 'SHOULD' | 'COULD';
  category: string;
  title: string;
  description: string;
  file?: string;
  expected?: string;
  actual?: string;
  blocking: boolean;
}

export interface EvolithYaml {
  coreRef?: {
    version?: string;
    path?: string;
  };
  governance?: {
    version?: string;
    adrRegistry?: Array<{ id: string; status: string }>;
  };
  product?: {
    name?: string;
    type?: string;
  };
}

export interface ArchitectureValidationResult {
  status: 'passed' | 'failed' | 'warning';
  levels: string[];
  rulesChecked: number;
  /** GT-569 — same denominator contract as {@link ValidationResult}. */
  rulesSkipped?: number;
  rulesErrored?: number;
  rulesTotal?: number;
  skippedRuleIds?: string[];
  erroredRuleIds?: string[];
  issues: ValidationIssue[];
  timestamp: string;
}

export interface RulesetValidatorOptions {
  fileSystem?: IFileSystem;
  configParser?: IConfigParser;
  logger?: ILogger;
  engineType?: 'native' | 'opa';
  rulesetRepo?: IRulesetRepository;
  topologyCatalog?: TopologyCatalogService;
  /**
   * Optional process runner (e.g. the real `NodeProcessRunner`). When provided, the
   * validator wraps its strategy with the enforcer subsystem so `enforce:`-routed rules
   * run their external analyzers (GT-524 wiring). Absent ⇒ native/opa strategy only.
   */
  processRunner?: IProcessRunner;
  /**
   * Optional OTel metrics port for the enforcer subsystem (GT-519 · EAG-14 — AC3). When a
   * host wires a real `Meter`-backed {@link IEnforcerMetrics} adapter here, every enforcer
   * run emits duration/failure/timeout/violation telemetry through the {@link EnforcerEvaluator}
   * seam. Absent ⇒ the zero-cost `NoopEnforcerMetrics` default (behaviour-identical). Only
   * consulted when `processRunner` is also present (no enforcer subsystem ⇒ nothing to meter).
   */
  metrics?: IEnforcerMetrics;
  /**
   * GT-569 — optional coverage floor. When set to a fraction in `[0, 1]`, a run
   * whose UNEVALUATED fraction (`(rulesSkipped + rulesErrored) / rulesTotal`)
   * exceeds it emits the blocking `GOV-COVERAGE-THRESHOLD` issue, so the verdict
   * fails instead of signing off on a corpus that mostly did not run.
   *
   * Absent ⇒ no threshold is enforced (behaviour-identical to pre-GT-569): the
   * counters are still reported, they just do not gate.
   */
  maxSkippedFraction?: number;
}

export const RULESET_VALIDATOR_OPTIONS = 'RULESET_VALIDATOR_OPTIONS';
