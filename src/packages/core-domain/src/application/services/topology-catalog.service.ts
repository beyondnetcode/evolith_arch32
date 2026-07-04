import * as path from 'path';
import { IFileSystem, ILogger } from '../../domain/interfaces';

/** Architecture maturity level on the progressive axis (GT-343 — NOT an SDLC phase). */
export type ProgressiveMaturityLevel = 'F1' | 'F2' | 'F3' | 'cross';
/** @deprecated Use {@link ProgressiveMaturityLevel}. Kept for backward-compatible re-exports. */
export type ProgressivePhase = ProgressiveMaturityLevel;

export interface TopologyManifest {
  apiVersion: 'evolith.dev/topology/v1';
  kind: 'TopologyManifest';
  metadata: { id: string; name: string; dimension: string; status: 'draft' | 'proposed' | 'accepted' | 'deprecated'; version: string };
  spec: {
    summary: string;
    topologyType: string;
    compatibility: { progressiveAxis: { maturityLevel: ProgressiveMaturityLevel; profile: string }; composableWith: string[] };
    artifacts: { adrs: string[]; rulesets: string[]; opaPolicies: string[]; aiRulesets: string[]; umsContracts: string[] };
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
    const root = path.join(corePath, 'reference', 'architecture', 'topologies');
    const files = await this.findManifestFiles(root);
    const manifests = await Promise.all(files.map((file) => this.readManifest(file)));
    return manifests.sort((a, b) => a.metadata.id.localeCompare(b.metadata.id));
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
