import { Phase } from '../entities';

export interface WorkflowTransition {
  from: string;
  to: string;
  conditions?: string[];
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  phases: Phase[];
  transitions: WorkflowTransition[];
  getPhase(value: string): Phase | undefined;
  getAllPhases(): Phase[];
  canTransition(from: string, to: string): boolean;
  getNextPhase(current: string): Phase | undefined;
  getPreviousPhase(current: string): Phase | undefined;
  getPhaseIndex(value: string): number;
  getPhaseLabel(value: string): string;
  getPhaseDescription(value: string): string;
  isValidPhase(value: string): boolean;
}

export interface IWorkflowDefinitionProvider {
  getWorkflow(tenant?: string): WorkflowDefinition;
}
