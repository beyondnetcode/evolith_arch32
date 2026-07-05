import { Phase } from '../entities';
import { WorkflowDefinition, WorkflowTransition } from '../ports/workflow-definition.port';
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';

type RawPhase = {
  value: string;
  label: string;
  description: string;
  order: number;
  artifacts?: string[];
  gateChecks?: unknown[];
};

type RawTransition = {
  from: string;
  to: string;
  conditions?: string[];
};

type RawWorkflow = {
  name: string;
  description: string;
  phases: RawPhase[];
  transitions: RawTransition[];
};

export class DefaultWorkflowDefinition implements WorkflowDefinition {
  name: string;
  description: string;
  phases: Phase[];
  transitions: WorkflowTransition[];
  private phaseMap: Map<string, Phase>;

  constructor(raw: RawWorkflow) {
    this.name = raw.name;
    this.description = raw.description;
    this.phases = raw.phases.map(p => new Phase(p.value, p.label, p.description, [], p.artifacts || [], p.order));
    this.transitions = raw.transitions;
    this.phaseMap = new Map(this.phases.map(p => [p.value, p]));
  }

  getPhase(value: string): Phase | undefined {
    return this.phaseMap.get(value);
  }

  getAllPhases(): Phase[] {
    return [...this.phases];
  }

  canTransition(from: string, to: string): boolean {
    return this.transitions.some(t => t.from === from && t.to === to);
  }

  getNextPhase(current: string): Phase | undefined {
    const idx = this.phases.findIndex(p => p.value === current);
    if (idx === -1 || idx >= this.phases.length - 1) return undefined;
    const next = this.phases[idx + 1];
    return this.canTransition(current, next.value) ? next : undefined;
  }

  getPreviousPhase(current: string): Phase | undefined {
    const idx = this.phases.findIndex(p => p.value === current);
    if (idx <= 0) return undefined;
    return this.phases[idx - 1];
  }

  getPhaseIndex(value: string): number {
    const phase = this.phaseMap.get(value);
    return phase?.order ?? -1;
  }

  getPhaseLabel(value: string): string {
    return this.phaseMap.get(value)?.label || value;
  }

  getPhaseDescription(value: string): string {
    return this.phaseMap.get(value)?.description || '';
  }

  isValidPhase(value: string): boolean {
    return this.phaseMap.has(value);
  }
}

/**
 * Embedded canonical default workflow (GT-344). The published npm package ships
 * ruleset-free, so when no on-disk `rulesets/sdlc/default-workflow.yaml` is
 * resolvable (npm consumer, no WORKSPACE_ROOT, no monorepo checkout) the loader
 * must still succeed instead of throwing ENOENT at DI bootstrap. Keep this in
 * sync with `rulesets/sdlc/default-workflow.yaml`.
 */
const EMBEDDED_DEFAULT_WORKFLOW: RawWorkflow = {
  name: 'evolith-default',
  description: 'Default Evolith SDLC workflow — 6 sequential phases',
  phases: [
    { value: 'phase-0', label: 'Foundation', description: 'Repository initialized', order: 0, artifacts: [], gateChecks: [] },
    { value: 'phase-1', label: 'Structure', description: 'Project scaffolded', order: 1, artifacts: [], gateChecks: [] },
    { value: 'phase-2', label: 'Governance', description: 'Rulesets and ACL configured', order: 2, artifacts: [], gateChecks: [] },
    { value: 'phase-3', label: 'Architecture', description: 'ADRs and contexts defined', order: 3, artifacts: [], gateChecks: [] },
    { value: 'phase-4', label: 'Production', description: 'CI/CD and containers', order: 4, artifacts: [], gateChecks: [] },
    { value: 'phase-5', label: 'Observability', description: 'DORA metrics and dashboards', order: 5, artifacts: [], gateChecks: [] },
  ],
  transitions: [
    { from: 'phase-0', to: 'phase-1' },
    { from: 'phase-1', to: 'phase-2' },
    { from: 'phase-2', to: 'phase-3' },
    { from: 'phase-3', to: 'phase-4' },
    { from: 'phase-4', to: 'phase-5' },
  ],
};

export function loadDefaultWorkflow(): DefaultWorkflowDefinition {
  // Override order: explicit WORKSPACE_ROOT (Docker/runtime), then __dirname for
  // local monorepo development. GT-344: if neither resolves (the npm package is
  // ruleset-free), fall back to the embedded default so construction never throws.
  const candidates = [
    process.env.WORKSPACE_ROOT
      ? path.join(process.env.WORKSPACE_ROOT, 'rulesets', 'sdlc', 'default-workflow.yaml')
      : undefined,
    path.join(__dirname, '../../../rulesets', 'sdlc', 'default-workflow.yaml'),
  ].filter((p): p is string => Boolean(p));

  for (const candidate of candidates) {
    try {
      return new DefaultWorkflowDefinition(yaml.parse(fs.readFileSync(candidate, 'utf-8')));
    } catch {
      // try the next candidate, then the embedded fallback
    }
  }
  return new DefaultWorkflowDefinition(EMBEDDED_DEFAULT_WORKFLOW);
}
