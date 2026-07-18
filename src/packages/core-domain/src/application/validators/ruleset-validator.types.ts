import { ILogger, IFileSystem, IConfigParser } from '../../domain/interfaces';
import { IRulesetRepository } from '../../domain/ports/ruleset-repository.port';
import { TopologyCatalogService } from '../services/topology-catalog.service';
import type { IProcessRunner } from './enforcement/enforcer.types';
import type { IEnforcerMetrics } from './enforcement/enforcer-metrics';

export interface ValidationResult {
  status: 'passed' | 'failed' | 'warning';
  rulesChecked: number;
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
}

export const RULESET_VALIDATOR_OPTIONS = 'RULESET_VALIDATOR_OPTIONS';
