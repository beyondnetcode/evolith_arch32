import type { Admissibility, SignalDeterminism } from './signal-admissibility';

export interface ImportNode {
  file: string;
  imports: string[];
  layer?: string;
  context?: string;
}

/**
 * GT-584 — what every finding from this analyzer must now say about its own
 * evidence, so a consumer can tell a measurement from a guess without reading
 * the detector.
 */
export interface SignalProvenance {
  /** `probabilistic` for anything inferred (layer from a path, context from a directory name). */
  determinism: SignalDeterminism;
  /** How the detector reached this conclusion, in reviewable words. */
  detectionMethod: string;
  /** Whether the signal was admitted as blocking, and why not when it was not. */
  admissibility: Admissibility;
  /** Declared true-positive rate, when the detector has been measured. */
  confidence?: number;
  /** True when the detector INTENDED to block and admissibility refused. */
  downgradedFromBlocking: boolean;
  /** The admissibility decision in one sentence, safe to show a user. */
  rationale: string;
}

export interface LayerViolation extends SignalProvenance {
  ruleId: string;
  fromLayer: string;
  toLayer: string;
  fromFile: string;
  toFile: string;
  severity: 'MUST' | 'SHOULD' | 'MAY';
  blocking: boolean;
}

export interface ContextViolation extends SignalProvenance {
  ruleId: string;
  fromContext: string;
  toContext: string;
  fromFile: string;
  toFile: string;
  severity: 'MUST' | 'SHOULD' | 'MAY';
  blocking: boolean;
}

export interface CouplingMetrics {
  afferentCoupling: Record<string, number>;
  efferentCoupling: Record<string, number>;
  instability: Record<string, number>;
}

export interface DependencyInversionIssue extends SignalProvenance {
  ruleId: string;
  file: string;
  issue: string;
  severity: 'MUST' | 'SHOULD' | 'MAY';
  blocking: boolean;
}

export interface ArchitectureDepth {
  layerViolations: LayerViolation[];
  contextViolations: ContextViolation[];
  couplingMetrics: CouplingMetrics;
  dependencyInversionIssues: DependencyInversionIssue[];
}

export const LAYER_ORDER = ['domain', 'application', 'infrastructure', 'presentation'];

export const LAYER_PATTERNS: Record<string, RegExp[]> = {
  domain: [
    /\/domain\//,
    /\/entities\//,
    /\/value-objects\//,
    /\/aggregates\//,
    /\/domain-services\//,
    /\/repositories\/(interfaces|ports)\//,
  ],
  application: [
    /\/application\//,
    /\/use-cases\//,
    /\/services\//,
    /\/commands\//,
    /\/queries\//,
    /\/handlers\//,
  ],
  infrastructure: [
    /\/infrastructure\//,
    /\/adapters\//,
    /\/persistence\//,
    /\/external\//,
    /\/database\//,
    /\/repositories\/(impl|implementations)\//,
  ],
  presentation: [
    /\/presentation\//,
    /\/api\//,
    /\/controllers\//,
    /\/routes\//,
    /\/graphql\//,
    /\/rest\//,
  ],
};
