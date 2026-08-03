import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';

/** One entry of `src/rulesets/sdlc/artifact-registry.json`. */
interface RegistryArtifact {
  id: string;
  label: string;
  schemaId?: string;
  producedBy?: { format: string; note?: string };
}

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
  /**
   * The registry slug — THE identity (GT-650 / ADR-0125). The gate names which artifact it
   * requires; everything about that artifact is declared once, in the registry.
   */
  artifactId: string;
  /** Human label, for reports. No consumer may match on it: three labels diverge from their slug. */
  artifact: string;
  /**
   * Resolved FROM THE REGISTRY at load time, not stored in the gate file. It used to be copied
   * into every gate that required the artifact, which is how `#378` enriched one copy of the
   * corpus and left seven fields missing from the other.
   */
  schemaRef?: string;
  /** Present when the artifact IS a tool's own output. Also resolved from the registry. */
  producedBy?: { format: string; note?: string };
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
  private registry: Map<string, RegistryArtifact> | null = null;

  constructor(
    /** Absolute path to the SDLC gates directory (e.g. "<repo>/reference/governance/sdlc/gates") */
    private readonly sdlcGatesPath: string,
    private readonly fs: IFileSystem,
    private readonly logger: ILogger,
    /**
     * Absolute path to `src/rulesets/sdlc/artifact-registry.json` (GT-650 / ADR-0125). Optional so
     * every existing caller keeps working; when it is absent, artifacts load without their schema
     * and the gap is VISIBLE rather than silently filled from a stale copy in the gate file.
     */
    private readonly artifactRegistryPath?: string,
  ) {}

  /** Registry entries by slug. Loaded once; absent registry yields an empty map, not a throw. */
  private async loadRegistry(): Promise<Map<string, RegistryArtifact>> {
    if (this.registry) return this.registry;
    this.registry = new Map();
    if (!this.artifactRegistryPath) return this.registry;
    try {
      const parsed = JSON.parse(await this.fs.readFile(this.artifactRegistryPath)) as {
        artifacts?: RegistryArtifact[];
      };
      for (const a of parsed.artifacts ?? []) this.registry.set(a.id, a);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`GateRegistryService: failed to load the artifact registry: ${msg}`);
    }
    return this.registry;
  }

  /** Load and cache all gate-f*.json definitions, enriched from the artifact registry. */
  async loadAll(): Promise<GateDefinition[]> {
    if (this.gates) return this.gates;

    const registry = await this.loadRegistry();

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
          // GT-650 — the gate names WHICH artifact; the registry says what it is. Composing here
          // is what makes `schemaRef` impossible to have two values, rather than merely detectable.
          requiredArtifacts: (parsed.requiredArtifacts ?? []).map(a => {
            const entry = a.artifactId ? registry.get(a.artifactId) : undefined;
            return {
              ...a,
              ...(entry?.schemaId
                ? { schemaRef: `src/rulesets/schema/${entry.schemaId.split('/').pop()}` }
                : {}),
              ...(entry?.producedBy ? { producedBy: entry.producedBy } : {}),
            };
          }),
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
