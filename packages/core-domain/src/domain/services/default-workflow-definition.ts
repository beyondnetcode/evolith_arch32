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

export function loadDefaultWorkflow(): DefaultWorkflowDefinition {
  const content = fs.readFileSync(path.join(__dirname, '../../../../../rulesets/sdlc/default-workflow.yaml'), 'utf-8');
  return new DefaultWorkflowDefinition(yaml.parse(content));
}
