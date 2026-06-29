import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';

/**
 * Canonical gate definition loaded from reference/governance/sdlc/gates/gate-f*.json.
 * This is the single source of truth consumed by the engine (GT-318).
 */
export interface GateDefinition {
  /** Stable identifier, e.g. "gate-f1" */
  id: string;
  name: string;
  /** Phase string identifier, e.g. "f1" */
  phase: string;
  description: string;
  requiredArtifacts: GateArtifact[];
  blockingCriteria: GateBlockingCriterion[];
  accountableRole?: string;
  waiverAuthority?: string;
  playbookRef?: string | null;
}

export interface GateArtifact {
  artifact: string;
  schemaRef?: string;
  validation: string;
  /** Paths to .rego files that enforce this artifact (relative to repo root). */
  rules: string[];
}

export interface GateBlockingCriterion {
  criterion: string;
  action: string;
}

interface RawGateFile {
  id: string;
  name: string;
  phase: string;
  description: string;
  playbookRef?: string | null;
  accountableRole?: string;
  waiverAuthority?: string;
  requiredArtifacts: GateArtifact[];
  blockingCriteria: GateBlockingCriterion[];
}

/**
 * GateRegistryService loads gate-f*.json files from the canonical SDLC gates directory
 * (reference/governance/sdlc/gates/) and exposes them by stable ID or phase.
 *
 * This replaces the previous dual-source problem (GT-318) where gate definitions
 * lived in two places (rulesets/phase-gates/phase-gates.rules.json and the gate-f*.json
 * files) but the richer gate-f*.json files — which cite .rego rules — were never consumed
 * by the engine.
 */
export class GateRegistryService {
  private gates: GateDefinition[] | null = null;

  constructor(
    /** Absolute path to the SDLC gates directory (e.g. "<repo>/reference/governance/sdlc/gates") */
    private readonly sdlcGatesPath: string,
    private readonly fs: IFileSystem,
    private readonly logger: ILogger,
  ) {}

  /** Load and cache all gate-f*.json definitions. */
  async loadAll(): Promise<GateDefinition[]> {
    if (this.gates) return this.gates;

    const entries = await this.fs.readdirNames(this.sdlcGatesPath);
    const gateFiles = entries
      .filter(name => /^gate-f\d+\.json$/.test(name))
      .sort();

    const definitions: GateDefinition[] = [];

    for (const fileName of gateFiles) {
      const filePath = path.join(this.sdlcGatesPath, fileName);
      try {
        const raw = await this.fs.readFile(filePath);
        const parsed: RawGateFile = JSON.parse(raw);
        definitions.push({
          id: parsed.id,
          name: parsed.name,
          phase: parsed.phase,
          description: parsed.description,
          requiredArtifacts: parsed.requiredArtifacts ?? [],
          blockingCriteria: parsed.blockingCriteria ?? [],
          accountableRole: parsed.accountableRole,
          waiverAuthority: parsed.waiverAuthority,
          playbookRef: parsed.playbookRef,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`GateRegistryService: failed to load ${fileName}: ${msg}`);
      }
    }

    this.gates = definitions;
    return definitions;
  }

  /** Return all gate definitions for a given phase string (e.g. "f1"). */
  async getGatesForPhase(phaseId: string): Promise<GateDefinition[]> {
    const all = await this.loadAll();
    return all.filter(g => g.phase === phaseId);
  }

  /**
   * Return a single gate by its stable ID (e.g. "gate-f1").
   * Routing is done by exact ID match, never by substring.
   */
  async getGate(gateId: string): Promise<GateDefinition | null> {
    const all = await this.loadAll();
    return all.find(g => g.id === gateId) ?? null;
  }

  /** Return all stable gate IDs in phase order. */
  async getAllGateIds(): Promise<string[]> {
    const all = await this.loadAll();
    return all.map(g => g.id);
  }

  /**
   * Return all unique .rego rule paths cited across all artifacts of a gate.
   * Paths are relative to repo root (as declared in the gate-f*.json files).
   */
  async getOpaRulesForGate(gateId: string): Promise<string[]> {
    const gate = await this.getGate(gateId);
    if (!gate) return [];
    const ruleSet = new Set<string>();
    for (const artifact of gate.requiredArtifacts) {
      for (const r of artifact.rules ?? []) {
        ruleSet.add(r);
      }
    }
    return Array.from(ruleSet);
  }
}
