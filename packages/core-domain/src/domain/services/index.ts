import { Phase, GateResult } from '../entities';
import { IPhaseGates, GateResult as IGateResult } from '../interfaces';


export class PhaseService implements IPhaseGates {
  private readonly phases: Phase[];

  constructor() {
    this.phases = [
      new Phase('phase-0', 'Foundation', 'Repository initialized', [], [], 0),
      new Phase('phase-1', 'Structure', 'Project scaffolded', [], [], 1),
      new Phase('phase-2', 'Governance', 'Rulesets and ACL configured', [], [], 2),
      new Phase('phase-3', 'Architecture', 'ADRs and contexts defined', [], [], 3),
      new Phase('phase-4', 'Production', 'CI/CD and containers', [], [], 4),
      new Phase('phase-5', 'Observability', 'DORA metrics and dashboards', [], [], 5),
    ];
  }

  getPhase(value: string): Phase | undefined {
    return Phase.fromValue(value, this.phases);
  }

  getAllPhases(): Phase[] {
    return [...this.phases];
  }

  canTransition(from: string, to: string): boolean {
    const fromPhase = this.getPhase(from);
    const toPhase = this.getPhase(to);

    if (!fromPhase || !toPhase) {
      return false;
    }

    return toPhase.order === fromPhase.order + 1;
  }

  getNextPhase(current: string): Phase | undefined {
    const phase = this.getPhase(current);
    if (!phase) return undefined;
    return this.phases.find(p => p.order === phase.order + 1);
  }

  getPreviousPhase(current: string): Phase | undefined {
    const phase = this.getPhase(current);
    if (!phase) return undefined;
    return this.phases.find(p => p.order === phase.order - 1);
  }

  async validate(_phase: string, _cwd: string): Promise<IGateResult[]> {
    return [];
  }

  getPhaseLabel(phaseValue: string): string {
    const phase = this.getPhase(phaseValue);
    return phase?.label || phaseValue;
  }

  getPhaseDescription(phaseValue: string): string {
    const phase = this.getPhase(phaseValue);
    return phase?.description || '';
  }

  isValidPhase(value: string): boolean {
    return this.phases.some(p => p.value === value);
  }

  getPhaseIndex(value: string): number {
    const phase = this.getPhase(value);
    return phase?.order ?? -1;
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

export class PlatformDetectionService {
  private readonly checks: Map<string, () => Promise<boolean>> = new Map();

  registerCheck(tool: string, checkFn: () => Promise<boolean>): void {
    this.checks.set(tool, checkFn);
  }

  async isAvailable(tool: string): Promise<boolean> {
    const checkFn = this.checks.get(tool);
    if (!checkFn) {
      return false;
    }
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