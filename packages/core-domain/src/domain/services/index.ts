import { Phase, GateResult } from '../entities';
import { IPhaseGates, GateResult as IGateResult } from '../interfaces';
import { WorkflowDefinition } from '../ports/workflow-definition.port';

export class WorkflowEngine implements IPhaseGates {
  constructor(private readonly workflow: WorkflowDefinition) {}

  getPhase(value: string): Phase | undefined {
    return this.workflow.getPhase(value);
  }

  getAllPhases(): Phase[] {
    return this.workflow.getAllPhases();
  }

  canTransition(from: string, to: string): boolean {
    return this.workflow.canTransition(from, to);
  }

  getNextPhase(current: string): Phase | undefined {
    return this.workflow.getNextPhase(current);
  }

  getPreviousPhase(current: string): Phase | undefined {
    return this.workflow.getPreviousPhase(current);
  }

  async validate(_phase: string, _cwd: string): Promise<IGateResult[]> {
    return [];
  }

  getPhaseLabel(phaseValue: string): string {
    return this.workflow.getPhaseLabel(phaseValue);
  }

  getPhaseDescription(phaseValue: string): string {
    return this.workflow.getPhaseDescription(phaseValue);
  }

  isValidPhase(value: string): boolean {
    return this.workflow.isValidPhase(value);
  }

  getPhaseIndex(value: string): number {
    return this.workflow.getPhaseIndex(value);
  }
}

export class ToolSelectionService {
  private readonly defaultToolsByPhase: Record<string, string[]> = {
    'phase-1': ['package-json', 'typescript', 'eslint', 'prettier', 'jest'],
    'phase-2': ['acl-schema-validator', 'adr-registry', 'husky', 'validate-docs'],
    'phase-3': ['context-mapper', 'adr-create', 'contract-registry', 'event-schema-registry'],
    'phase-4': ['dockerfile', 'github-actions', 'otel-instrumentation', 'env-secrets'],
    'phase-5': ['jaeger', 'prometheus', 'loki', 'grafana', 'dora-metrics'],
  };

  getDefaultTools(phase: string): string[] {
    return this.defaultToolsByPhase[phase] || [];
  }

  validateSelection(phase: string, tools: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!this.isValidToolForPhase(phase, tools)) {
      errors.push(`Invalid tool selected for ${phase}`);
    }
    return { valid: errors.length === 0, errors };
  }

  private isValidToolForPhase(phase: string, tools: string[]): boolean {
    const validTools = this.getDefaultTools(phase);
    return tools.every(t => validTools.includes(t) || t.startsWith('all-'));
  }

  filterByConvention(tools: string[]): string[] {
    return tools.filter(t => !t.startsWith('all-'));
  }

  expandAllTools(allTag: string, phase: string): string[] {
    if (allTag !== 'all-gov' && allTag !== 'all-arch' && allTag !== 'all-prod' && allTag !== 'all-obs') {
      return [allTag];
    }
    const expansions: Record<string, string[]> = {
      'all-gov': ['acl', 'adr', 'hooks', 'bilingual'],
      'all-arch': ['context-map', 'adr-create', 'contract-reg', 'event-schema'],
      'all-prod': ['docker', 'github-actions', 'otel', 'openbao'],
      'all-obs': ['jaeger', 'prometheus', 'loki', 'grafana', 'dora'],
    };
    return expansions[allTag] || [allTag];
  }
}

export class PhaseService extends WorkflowEngine {
  constructor() {
    const { loadDefaultWorkflow } = require('./default-workflow-definition');
    super(loadDefaultWorkflow());
  }
}

export class PlatformDetectionService {
  private readonly checks: Map<string, () => Promise<boolean>> = new Map();

  registerCheck(tool: string, checkFn: () => Promise<boolean>): void {
    this.checks.set(tool, checkFn);
  }

  async isAvailable(tool: string): Promise<boolean> {
    const checkFn = this.checks.get(tool);
    if (!checkFn) return false;
    return checkFn();
  }

  async detectAll(tools: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    await Promise.all(
      tools.map(async (tool) => {
        results[tool] = await this.isAvailable(tool);
      })
    );
    return results;
  }
}
