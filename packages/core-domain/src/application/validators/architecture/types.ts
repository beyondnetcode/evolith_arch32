export interface ImportNode {
  file: string;
  imports: string[];
  layer?: string;
  context?: string;
}

export interface LayerViolation {
  ruleId: string;
  fromLayer: string;
  toLayer: string;
  fromFile: string;
  toFile: string;
  severity: 'MUST' | 'SHOULD' | 'MAY';
  blocking: boolean;
}

export interface ContextViolation {
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

export interface DependencyInversionIssue {
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
