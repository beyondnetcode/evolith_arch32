import { Runtime, MonorepoOption, ArchitecturePattern, GateCheck } from '../interfaces';

export class Phase {
  constructor(
    public readonly value: string,
    public readonly label: string,
    public readonly description: string,
    public readonly gateChecks: GateCheck[],
    public readonly artifacts: string[],
    public readonly order: number
  ) {}

  canTransitionTo(other: Phase): boolean {
    return other.order === this.order + 1;
  }

  static fromValue(value: string, phases: Phase[]): Phase | undefined {
    return phases.find(p => p.value === value);
  }

  static readonly ORDER: Record<string, number> = {
    'phase-0': 0,
    'phase-1': 1,
    'phase-2': 2,
    'phase-3': 3,
    'phase-4': 4,
    'phase-5': 5,
  };
}

export class Project {
  public readonly id: string;
  public phase: string;
  public readonly createdAt: Date;
  public config: ProjectConfigData;

  constructor(
    name: string,
    runtime: Runtime,
    monorepo: MonorepoOption,
    architecture: ArchitecturePattern,
    phase: string = 'phase-0'
  ) {
    this.id = this.generateId(name);
    this.phase = phase;
    this.createdAt = new Date();
    this.config = {
      name,
      runtimeId: runtime.id,
      monorepoId: monorepo.id,
      architectureId: architecture.id,
      database: 'postgresql',
      apiProtocol: 'rest',
      ciCd: 'github',
      observability: 'otel',
      tools: [],
      agents: [],
    };
  }

  private generateId(name: string): string {
    return `${name}-${Date.now().toString(36)}`;
  }

  transitionTo(phase: string): void {
    this.phase = phase;
  }

  setConfig(key: keyof ProjectConfigData, value: unknown): void {
    this.config[key] = value as never;
  }

  getConfig(): Readonly<ProjectConfigData> {
    return { ...this.config };
  }

  isPhase(phase: string): boolean {
    return this.phase === phase;
  }
}

export interface ProjectConfigData {
  name: string;
  runtimeId: string;
  monorepoId: string;
  architectureId: string;
  database: string;
  apiProtocol: string;
  ciCd: string;
  observability: string;
  tools: string[];
  agents: string[];
}

export class Tool {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly category: string,
    public readonly phase: string,
    public readonly isRuntimeAware: boolean,
    public readonly commands: string[],
    public readonly platformCheck?: string
  ) {}

  requiresPlatformCheck(): boolean {
    return !!this.platformCheck;
  }
}

export class TransitionResult {
  constructor(
    public readonly success: boolean,
    public readonly fromPhase: string,
    public readonly toPhase: string,
    public readonly gateResults: GateResult[],
    public readonly executedTools: string[],
    public readonly warnings: string[],
    public readonly errors: string[]
  ) {}

  static success(
    from: string,
    to: string,
    gates: GateResult[],
    tools: string[]
  ): TransitionResult {
    return new TransitionResult(true, from, to, gates, tools, [], []);
  }

  static failure(
    from: string,
    to: string,
    gates: GateResult[],
    errors: string[]
  ): TransitionResult {
    return new TransitionResult(false, from, to, gates, [], [], errors);
  }

  hasBlockingErrors(): boolean {
    return this.errors.length > 0;
  }

  hasRequiredGateFailures(): boolean {
    return this.gateResults.some(g => !g.passed && g.required);
  }
}

export class GateResult {
  constructor(
    public readonly id: string,
    public readonly passed: boolean,
    public readonly description: string,
    public readonly required: boolean,
    public readonly error?: string
  ) {}

  static pass(id: string, description: string, required: boolean): GateResult {
    return new GateResult(id, true, description, required);
  }

  static fail(id: string, description: string, required: boolean, error: string): GateResult {
    return new GateResult(id, false, description, required, error);
  }
}