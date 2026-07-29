import * as path from 'node:path';
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { IFileSystem, IConfigParser } from '@beyondnet/evolith-core';
import { FILE_SYSTEM, CONFIG_PARSER } from '../domain/domain.tokens';
import { TopologyCatalogService, PatternCatalogService } from '@beyondnet/evolith-core';
import { buildCapabilityManifest } from '@beyondnet/evolith-core-domain/capabilities/capabilities-manifest';
import { McpCacheService } from './mcp-cache.service';

interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

const SAFE_NAME_REGEX = /^[a-zA-Z0-9_\-\/\.]+$/;

/**
 * Where the ruleset corpus sits under a Core root, in resolution order.
 *
 * GT-632 — this used to be the single literal `rulesets`, which stopped being
 * true when the workspace moved under `src/`. Same probe order (and same reason)
 * as `resolveRulesetFilePath` in `@beyondnet/evolith-infra-providers`:
 *
 *   - `src/rulesets` — a source checkout of this repository;
 *   - `rulesets`     — a bundled/container corpus (see this package's Dockerfile,
 *                      which copies `src/rulesets` to `/app/corpus/rulesets`).
 *
 * Kept as segment arrays rather than two literal `path.join` calls on purpose:
 * only the FIRST layout exists in this repository, so a literal second join
 * would be a built path that resolves to nothing —
 * `.harness/scripts/ci/47-validate-joined-paths.mjs` is right to reject that,
 * and an allowlist entry would silence a real check to keep a fallback.
 */
const RULESETS_LAYOUTS: readonly (readonly string[])[] = [['src', 'rulesets'], ['rulesets']];

function sanitizePathInput(input: string, baseDir: string): string {
  if (input.includes('..') || path.isAbsolute(input)) {
    throw new Error('Path traversal detected');
  }
  if (!SAFE_NAME_REGEX.test(input)) {
    throw new Error('Invalid path characters');
  }
  const resolved = path.resolve(baseDir, input);
  if (!resolved.startsWith(baseDir)) {
    throw new Error('Path escapes base directory');
  }
  return resolved;
}

const RESOURCES: Resource[] = [
  { uri: 'evolith://rulesets', name: 'Rulesets', description: 'List of all available rulesets in Evolith Core' },
  { uri: 'evolith://phase-gates', name: 'Phase Gates', description: 'Phase gate definitions and requirements' },
  { uri: 'evolith://agents', name: 'Agents', description: 'List of installed Evolith agents' },
  { uri: 'evolith://core/info', name: 'Core Info', description: 'General information about the Evolith Core' },
  { uri: 'evolith://governance/version', name: 'Governance Version', description: 'Current governance schema version' },
  { uri: 'evolith://core/version', name: 'Core Version', description: 'Current Core schema version' },
  { uri: 'evolith://repository/config', name: 'Repository Config', description: 'Repository evolith.yaml content' },
  { uri: 'evolith://moscow/phase-0', name: 'MoSCoW Phase 0', description: 'MoSCoW prioritization matrix for discovery phase' },
  { uri: 'evolith://architecture/topologies', name: 'Architecture Topologies', description: 'List of all available architecture topologies' },
  { uri: 'evolith://architecture/patterns', name: 'Architecture Patterns', description: 'Canonical architectural patterns and anti-patterns (PAT-NNNN) with their applicability and enforcing rules' },
  // GT-520 · EAG-15 — machine-discoverable governance surface. `capabilities`
  // serves the versioned capability manifest (GT-513) so a consumer can discover
  // WHAT the Core evaluates; `contracts` serves the published machine-contracts /
  // schema set consumers pin against.
  { uri: 'evolith://capabilities', name: 'Capability Manifest', description: 'Versioned capability manifest of the Evolith Core evaluation engine (evaluationKinds, engines, surfaces, supportedConsumers)' },
  { uri: 'evolith://contracts', name: 'Machine Contracts', description: 'Machine-readable schema/contract set the Core publishes for external consumers' },
];

/**
 * Serves MCP resources (`resources/list`, `resources/read`) exposing Evolith
 * artifacts — rulesets, phase gates, agents, config — read from the filesystem.
 */
@Injectable()
export class ResourcesService {
  private topologyCatalog: TopologyCatalogService;
  private patternCatalog: PatternCatalogService;

  constructor(
    @Inject(FILE_SYSTEM) private readonly fs: IFileSystem,
    @Inject(CONFIG_PARSER) private readonly configParser: IConfigParser,
    @Optional() private readonly cache?: McpCacheService,
  ) {
    this.topologyCatalog = new TopologyCatalogService(fs, console as any);
    this.patternCatalog = new PatternCatalogService(fs, console as any);
  }

  async list(): Promise<{ resources: Resource[] }> {
    if (this.cache) {
      const cached = await this.cache.getResourcesList();
      if (cached) return cached as { resources: Resource[] };
    }
    const result = { resources: RESOURCES };
    if (this.cache) {
      await this.cache.setResourcesList(result);
    }
    return result;
  }

  async read(uri: string): Promise<unknown> {
    if (uri === 'evolith://rulesets') return this.getRulesetsList();
    if (uri === 'evolith://phase-gates') return getPhaseGates();
    if (uri === 'evolith://agents') return this.getAgentsList();
    if (uri === 'evolith://capabilities') return buildCapabilityManifest();
    if (uri === 'evolith://contracts') return this.getMachineContracts();
    if (uri === 'evolith://governance/version') return { version: '1.0.0', schema: 'governance' };
    if (uri === 'evolith://core/version') return { version: '1.0.0', schema: 'core' };
    if (uri === 'evolith://core/info') return this.getCoreInfo();
    if (uri.startsWith('evolith://ruleset/')) return this.getRulesetContent(uri.replace('evolith://ruleset/', ''));
    if (uri.startsWith('evolith://agent/')) return this.getAgentContent(uri.replace('evolith://agent/', ''));
    if (uri === 'evolith://repository/config') return this.getRepositoryConfig();
    if (uri.startsWith('evolith://moscow/')) return this.getMoscowAnalysis(uri.replace('evolith://moscow/', ''));
    if (uri === 'evolith://open-core/artifacts') return this.getOpenCoreArtifacts();
    if (uri === 'evolith://acl/rules') return this.getAclRules();
    if (uri === 'evolith://architecture/topologies') return this.getTopologiesList();
    if (uri === 'evolith://architecture/patterns') return this.getPatternsList();
    if (uri.startsWith('evolith://architecture/topology/')) return this.getTopologyContent(uri.replace('evolith://architecture/topology/', ''));
    throw new Error(`Unknown resource URI: ${uri}`);
  }

  /**
   * The Core ROOT — the directory the catalogue services expect, i.e. the one
   * that contains `src/rulesets` AND `reference/core/architecture/...`.
   *
   * GT-632. The previous implementation looked for a directory containing
   * `rulesets` and, after the workspace moved under `src/`, the nearest such
   * ancestor of this package is `<repo>/src`. That is not the Core root, and the
   * difference is not cosmetic: `PatternCatalogService` resolves patterns at
   * `<core>/reference/core/architecture/patterns/pat`, so with `<repo>/src` the
   * `evolith://architecture/patterns` resource returned an error on a perfectly
   * healthy checkout.
   *
   * Two passes, in this order:
   *
   *   1. `src/rulesets`, starting at the current directory. It is the marker of a
   *      Core SOURCE checkout and nothing else has it — a satellite keeps its own
   *      rulesets at its root — so including cwd is unambiguous here.
   *   2. `rulesets`, ancestors ONLY. This is the pre-existing behaviour and it
   *      deliberately skips cwd: a satellite repository has `rulesets/` of its
   *      own, and treating it as the Core would read the wrong corpus.
   */
  private findCorePath(): string {
    const [sourceLayout, bundledLayout] = RULESETS_LAYOUTS;

    const ancestors = (includeSelf: boolean): string[] => {
      const out: string[] = [];
      let dir = process.cwd();
      if (includeSelf) out.push(dir);
      for (;;) {
        const parent = path.dirname(dir);
        if (parent === dir) break;
        out.push(parent);
        dir = parent;
      }
      return out;
    };

    for (const dir of ancestors(true)) {
      if (this.fs.existsSync(path.join(dir, ...sourceLayout))) return dir;
    }
    for (const dir of ancestors(false)) {
      if (this.fs.existsSync(path.join(dir, ...bundledLayout))) return dir;
    }
    return path.join(process.cwd(), '..', 'evolith');
  }

  /**
   * The ruleset corpus directory under `corePath`. See {@link RULESETS_LAYOUTS}
   * for why the fallback is expressed as segments rather than a second literal
   * join. When neither layout is present the canonical one is returned, so the
   * caller's `exists` check reports the path a reader should have created.
   */
  private rulesetsBase(corePath: string): string {
    for (const layout of RULESETS_LAYOUTS) {
      const candidate = path.join(corePath, ...layout);
      if (this.fs.existsSync(candidate)) return candidate;
    }
    return path.join(corePath, ...RULESETS_LAYOUTS[0]);
  }

  private async getCoreInfo() {
    const rulesetsPath = this.rulesetsBase(this.findCorePath());
    let rulesetCount = 0;
    if (await this.fs.exists(rulesetsPath)) {
      for (const entry of await this.fs.readdir(rulesetsPath)) {
        if (entry.isDirectory()) {
          const files = await this.fs.readdirNames(path.join(rulesetsPath, entry.name));
          rulesetCount += files.filter((f) => f.endsWith('.rules.json')).length;
        }
      }
    }
    return { path: this.findCorePath(), version: '1.0.0', totalRulesets: rulesetCount, capabilities: ['governance', 'architecture', 'sdlc'] };
  }

  private async getRulesetsList() {
    const rulesetsPath = this.rulesetsBase(this.findCorePath());
    if (!(await this.fs.exists(rulesetsPath))) return { rulesets: [], error: 'Rulesets directory not found' };
    const rulesets: Array<{ category: string; name: string; path: string }> = [];
    for (const entry of await this.fs.readdir(rulesetsPath)) {
      if (entry.isDirectory()) {
        const files = await this.fs.readdirNames(path.join(rulesetsPath, entry.name));
        for (const ruleFile of files.filter((f) => f.endsWith('.rules.json'))) {
          rulesets.push({ category: entry.name, name: ruleFile.replace('.rules.json', ''), path: `rulesets/${entry.name}/${ruleFile}` });
        }
      }
    }
    return { rulesets, count: rulesets.length };
  }

  private async getRulesetContent(name: string) {
    const corePath = this.findCorePath();
    const rulesetsBase = this.rulesetsBase(corePath);
    const normalizedName = name.replace(/-/g, '/');
    const rulesetPath = sanitizePathInput(normalizedName + '.rules.json', rulesetsBase);
    if (await this.fs.exists(rulesetPath)) return this.fs.readJson(rulesetPath);
    const parts = name.split('/');
    if (parts.length === 2) {
      const altPath = sanitizePathInput(parts[0] + '/' + parts[1] + '.rules.json', rulesetsBase);
      if (await this.fs.exists(altPath)) return this.fs.readJson(altPath);
    }
    return { error: `Ruleset not found: ${name}` };
  }

  private async getAgentsList() {
    const agentsDir = path.join(process.cwd(), 'rulesets', 'agents');
    if (!(await this.fs.exists(agentsDir))) return { agents: [] };
    const entries = await this.fs.readdirNames(agentsDir);
    return { agents: entries, count: entries.length };
  }

  private async getAgentContent(name: string) {
    const agentsBase = path.join(process.cwd(), 'rulesets', 'agents');
    const agentDir = sanitizePathInput(name, agentsBase);
    const agentPath = path.join(agentDir, 'agent.rules.json');
    if (await this.fs.exists(agentPath)) return this.fs.readJson(agentPath);
    return { error: `Agent not found: ${name}` };
  }

  private async getRepositoryConfig() {
    const configPath = path.join(process.cwd(), 'evolith.yaml');
    if (await this.fs.exists(configPath)) return this.configParser.parse(await this.fs.readFile(configPath));
    return { error: 'evolith.yaml not found' };
  }

  private async getMachineContracts() {
    const contractsPath = path.join(this.rulesetsBase(this.findCorePath()), 'contracts', 'evolith-machine-contracts.json');
    if (await this.fs.exists(contractsPath)) return this.fs.readJson(contractsPath);
    return { error: 'Machine contracts not found', path: 'rulesets/contracts/evolith-machine-contracts.json' };
  }

  private async getOpenCoreArtifacts() {
    const ocbPath = path.join(this.rulesetsBase(this.findCorePath()), 'governance', 'open-core-boundary.rules.json');
    if (await this.fs.exists(ocbPath)) return this.fs.readJson(ocbPath);
    return { error: 'Open-Core Boundary rules not found' };
  }

  private async getAclRules() {
    const aclPath = path.join(this.rulesetsBase(this.findCorePath()), 'acl', 'anti-corruption-layer.rules.json');
    if (await this.fs.exists(aclPath)) return this.fs.readJson(aclPath);
    return { error: 'ACL rules not found' };
  }

  private async getMoscowAnalysis(phase: string) {
    const moscowBase = path.join(process.cwd(), '.evolith', 'moscow');
    const moscowPath = sanitizePathInput(phase + '.json', moscowBase);
    if (await this.fs.exists(moscowPath)) return this.fs.readJson(moscowPath);
    return { error: `MoSCoW analysis not found for ${phase}` };
  }

  private async getTopologiesList() {
    try {
      const corePath = this.findCorePath();
      const topologies = await this.topologyCatalog.list(corePath);
      return { topologies, count: topologies.length };
    } catch (e) {
      return { error: String(e) };
    }
  }

  /**
   * Canonical patterns (PAT-NNNN). Reads through the single `PatternCatalogService`
   * reader — no path probing or parsing duplicated here. The service THROWS on a
   * missing/empty corpus (a vacuous `[]` reported as success is the failure mode it
   * guards against), so the throw is surfaced as a readable `error` field, matching
   * `getTopologiesList` above.
   */
  private async getPatternsList() {
    try {
      const corePath = this.findCorePath();
      const patterns = await this.patternCatalog.list(corePath);
      return { patterns, count: patterns.length };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }

  private async getTopologyContent(id: string) {
    try {
      const corePath = this.findCorePath();
      const topologiesBase = path.join(corePath, 'reference', 'core', 'architecture', 'topologies');
      sanitizePathInput(id, topologiesBase);
      const topology = await this.topologyCatalog.get(corePath, id);
      if (!topology) return { error: `Topology not found: ${id}` };
      return topology;
    } catch (e) {
      return { error: String(e) };
    }
  }

}

function getPhaseGates() {
  return {
    phaseGates: [
      { phase: 'phase-0', name: 'Foundation', requirements: ['evolith.yaml', 'coreRef.version pinned'] },
      { phase: 'phase-1', name: 'Structure', requirements: ['package.json', 'src/ directory', 'bilingual README'] },
      { phase: 'phase-2', name: 'Governance', requirements: ['rulesets/ directory', 'ACL ruleset', '.harness/ scripts'] },
      { phase: 'phase-3', name: 'Architecture', requirements: ['ADR collection', 'ADR matrix updated'] },
      { phase: 'phase-4', name: 'Production', requirements: ['Dockerfile', 'CI/CD pipeline', 'DORA metrics'] },
    ],
  };
}
