import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';

/**
 * Represents a phase loaded from the GT-280 structured data files.
 */
export interface StructuredPhase {
  id: string;
  name: string;
  shortName: string;
  order: number;
  description: string;
  gates: string[];
}

/**
 * Represents a gate loaded from the GT-280 structured data files.
 */
export interface StructuredGate {
  id: string;
  name: string;
  phase: string;
  description: string;
  playbookRef?: string;
  requiredArtifacts: {
    artifact: string;
    schemaRef?: string;
    validation: string;
    rules: string[];
  }[];
  blockingCriteria: {
    criterion: string;
    action: string;
  }[];
}

/**
 * Loads the GT-280 structured phase and gate data files.
 *
 * See: reference/governance/sdlc/phases/ and reference/governance/sdlc/gates/
 * Schema: reference/governance/sdlc/sdlc-phase.schema.json
 * Schema: reference/governance/sdlc/sdlc-gate.schema.json
 */
export class SdlcDataLoaderService {
  constructor(
    private readonly fs: IFileSystem,
    private readonly logger: ILogger,
    private readonly corePath: string,
  ) {}

  private get phasesDir(): string {
    return path.join(this.corePath, 'reference', 'governance', 'sdlc', 'phases');
  }

  private get gatesDir(): string {
    return path.join(this.corePath, 'reference', 'governance', 'sdlc', 'gates');
  }

  async loadAllPhases(): Promise<StructuredPhase[]> {
    const dir = this.phasesDir;
    if (!(await this.fs.exists(dir))) {
      this.logger.warn(`Phases directory not found: ${dir}`);
      return [];
    }
    const files = (await this.fs.readdir(dir))
      .filter(e => e.isFile() && e.name.endsWith('.json'))
      .sort((a, b) => a.name.localeCompare(b.name));

    const phases: StructuredPhase[] = [];
    for (const entry of files) {
      try {
        const raw = await this.fs.readFile(path.join(dir, entry.name));
        phases.push(JSON.parse(raw) as StructuredPhase);
      } catch (err) {
        this.logger.warn(`Failed to load phase ${entry.name}: ${err}`);
      }
    }
    return phases.sort((a, b) => a.order - b.order);
  }

  async loadPhase(phaseId: string): Promise<StructuredPhase | null> {
    const phases = await this.loadAllPhases();
    return phases.find(p => p.id === phaseId) ?? null;
  }

  async loadGate(gateId: string): Promise<StructuredGate | null> {
    const filePath = path.join(this.gatesDir, `${gateId}.json`);
    if (!(await this.fs.exists(filePath))) {
      return null;
    }
    try {
      const raw = await this.fs.readFile(filePath);
      return JSON.parse(raw) as StructuredGate;
    } catch (err) {
      this.logger.warn(`Failed to load gate ${gateId}: ${err}`);
      return null;
    }
  }

  async loadGatesForPhase(phaseId: string): Promise<StructuredGate[]> {
    const phase = await this.loadPhase(phaseId);
    if (!phase) return [];
    const gates: StructuredGate[] = [];
    for (const gateId of phase.gates) {
      const gate = await this.loadGate(gateId);
      if (gate) gates.push(gate);
    }
    return gates;
  }

  async loadAllGates(): Promise<StructuredGate[]> {
    const phases = await this.loadAllPhases();
    const all: StructuredGate[] = [];
    for (const phase of phases) {
      const gates = await this.loadGatesForPhase(phase.id);
      all.push(...gates);
    }
    return all;
  }
}
