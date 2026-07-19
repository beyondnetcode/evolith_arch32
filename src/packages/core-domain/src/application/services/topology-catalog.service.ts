import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';

/** Architecture maturity level on the progressive axis (GT-343 — NOT an SDLC phase). */
export type ProgressiveMaturityLevel = 'F1' | 'F2' | 'F3' | 'cross';
/** @deprecated Use {@link ProgressiveMaturityLevel}. Kept for backward-compatible re-exports. */
export type ProgressivePhase = ProgressiveMaturityLevel;

/** One design-artifact block a topology expects in Design (ADR-0104 / GT-427). */
export interface DesignArtifactDescriptor {
  artifactKind: string;
  schemaRef?: string;
  templateRef?: string;
  criteria?: string;
  weight?: number;
  condition?: string;
}

/** Design-phase artifact profile declared by a topology manifest (spec.designProfile). */
export interface TopologyDesignProfile {
  required?: DesignArtifactDescriptor[];
  conditional?: DesignArtifactDescriptor[];
}

export interface TopologyManifest {
  apiVersion: 'evolith.dev/topology/v1';
  kind: 'TopologyManifest';
  metadata: { id: string; name: string; dimension: string; status: 'draft' | 'proposed' | 'accepted' | 'deprecated'; version: string };
  spec: {
    summary: string;
    topologyType: string;
    compatibility: { progressiveAxis: { maturityLevel: ProgressiveMaturityLevel; profile: string }; composableWith: string[] };
    artifacts: { adrs: string[]; rulesets: string[]; opaPolicies: string[]; aiRulesets: string[]; umsContracts: string[] };
    designProfile?: TopologyDesignProfile;
    phaseProfiles?: {
      construction?: TopologyDesignProfile;
      quality?: TopologyDesignProfile;
      deployment?: TopologyDesignProfile;
    };
    corpus?: {
      guidance: { profile: string; maturityGuide: string };
      configurationContract: string;
      fixtures: { valid: string; invalid: string };
      nativeEvaluator: string;
      tests: { positive: string; negative: string };
      evidence: string;
    };
  };
}

/** Discovers the repository's topology manifests without coupling Core to a CLI or MCP surface. */
export class TopologyCatalogService {
  constructor(private readonly fs: IFileSystem, private readonly logger: ILogger) {}

  async list(corePath: string): Promise<TopologyManifest[]> {
    // Topology manifests are the canonical rulesets under `src/rulesets/topologies`.
    // Older/reorganized trees kept them under `reference/(core/)?architecture/topologies`.
    // Resolve against each candidate root so the catalog is robust to the source
    // tree, the container corpus layout, and the reference taxonomy reorg.
    const candidateRoots = [
      path.join(corePath, 'src', 'rulesets', 'topologies'),
      path.join(corePath, 'rulesets', 'topologies'),
      path.join(corePath, 'reference', 'core', 'architecture', 'topologies'),
      path.join(corePath, 'reference', 'architecture', 'topologies'),
    ];
    // Manifests can be split across roots (e.g. non-progressive topologies under
    // src/rulesets/topologies and the progressive axis under
    // reference/core/architecture/topologies), so AGGREGATE across every root and
    // dedupe by metadata.id (first occurrence wins).
    const files = (await Promise.all(candidateRoots.map((root) => this.findManifestFiles(root)))).flat();
    const manifests = await Promise.all(files.map((file) => this.readManifest(file)));
    const byId = new Map<string, TopologyManifest>();
    for (const manifest of manifests) {
      const existing = byId.get(manifest.metadata.id);
      if (!existing) {
        byId.set(manifest.metadata.id, manifest);
        continue;
      }
      // A shadowed copy that carries spec keys the winner lacks is not a
      // harmless duplicate -- it is silent governance loss. This exact shape
      // disabled ADR-0104 for five topologies: the `src/` manifests lacked
      // `designProfile`/`phaseProfiles`, the `reference/` ones had them, and
      // first-occurrence-wins discarded the richer copy with no signal at all.
      // It went unnoticed for two weeks and got recorded as fact in a spec
      // comment ("NO topology defines phaseProfiles"), because the observation
      // was taken through this very shadow.
      //
      // Differences in path-shaped fields are expected while the corpus lives
      // in two roots, so only MISSING KEYS are treated as an error.
      const lost = Object.keys((manifest as { spec?: Record<string, unknown> }).spec ?? {}).filter(
        (key) => !(key in ((existing as { spec?: Record<string, unknown> }).spec ?? {}))
      );
      if (lost.length > 0) {
        throw new Error(
          `Topology manifest '${manifest.metadata.id}' is shadowed and the shadowed copy is richer.\n` +
            `Winning copy is missing spec key(s) the shadowed copy defines: ${lost.join(', ')}.\n` +
            `Resolution order is ${candidateRoots.join(' > ')}.\n` +
            `Refusing to serve a silently degraded manifest -- port the missing keys into the winning copy, ` +
            `or collapse the corpus to a single root.`
        );
      }
    }
    return [...byId.values()].sort((a, b) => a.metadata.id.localeCompare(b.metadata.id));
  }

  async get(corePath: string, topologyId: string): Promise<TopologyManifest | undefined> {
    return (await this.list(corePath)).find((manifest) => manifest.metadata.id === topologyId);
  }

  async resolveProgressivePhase(corePath: string, maturityLevel: Exclude<ProgressiveMaturityLevel, 'cross'>): Promise<TopologyManifest | undefined> {
    return (await this.list(corePath)).find((manifest) => manifest.spec.compatibility.progressiveAxis.maturityLevel === maturityLevel);
  }

  private async findManifestFiles(directory: string, depth = 0): Promise<string[]> {
    if (depth > 3 || !(await this.fs.exists(directory))) return [];
    const entries = await this.fs.readdir(directory);
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isFile() && entry.name === 'topology.manifest.json') files.push(fullPath);
      if (entry.isDirectory()) files.push(...await this.findManifestFiles(fullPath, depth + 1));
    }
    return files;
  }

  private async readManifest(filePath: string): Promise<TopologyManifest> {
    try {
      const manifest = JSON.parse(await this.fs.readFile(filePath)) as TopologyManifest;
      if (manifest.apiVersion !== 'evolith.dev/topology/v1' || manifest.kind !== 'TopologyManifest' || !manifest.metadata?.id) {
        throw new Error('missing required topology manifest identity');
      }
      return manifest;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Invalid topology manifest at ${filePath}: ${message}`);
      throw new Error(`Topology manifest error in ${filePath}: ${message}`);
    }
  }
}
