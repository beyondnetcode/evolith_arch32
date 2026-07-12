import * as path from 'node:path';
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { IFileSystem, IConfigParser } from '@beyondnet/evolith-core';
import { FILE_SYSTEM, CONFIG_PARSER } from '../domain/domain.tokens';
import { TopologyCatalogService } from '@beyondnet/evolith-core';
import { buildCapabilityManifest } from '@beyondnet/evolith-core-domain/capabilities/capabilities-manifest';
import { McpCacheService } from './mcp-cache.service';

interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

const SAFE_NAME_REGEX = /^[a-zA-Z0-9_\-\/\.]+$/;

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

  constructor(
    @Inject(FILE_SYSTEM) private readonly fs: IFileSystem,
    @Inject(CONFIG_PARSER) private readonly configParser: IConfigParser,
    @Optional() private readonly cache?: McpCacheService,
  ) {
    this.topologyCatalog = new TopologyCatalogService(fs, console as any);
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
    if (uri.startsWith('evolith://architecture/topology/')) return this.getTopologyContent(uri.replace('evolith://architecture/topology/', ''));
    throw new Error(`Unknown resource URI: ${uri}`);
  }

  private findCorePath(): string {
    const parts = process.cwd().split(path.sep);
    while (parts.length > 0) {
      parts.pop();
      if (this.fs.existsSync(path.join(parts.join(path.sep), 'rulesets'))) {
        return parts.join(path.sep);
      }
    }
    return path.join(process.cwd(), '..', 'evolith');
  }

  private async getCoreInfo() {
    const rulesetsPath = path.join(this.findCorePath(), 'rulesets');
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
    const rulesetsPath = path.join(this.findCorePath(), 'rulesets');
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
    const rulesetsBase = path.join(corePath, 'rulesets');
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
    const contractsPath = path.join(this.findCorePath(), 'rulesets', 'contracts', 'evolith-machine-contracts.json');
    if (await this.fs.exists(contractsPath)) return this.fs.readJson(contractsPath);
    return { error: 'Machine contracts not found', path: 'rulesets/contracts/evolith-machine-contracts.json' };
  }

  private async getOpenCoreArtifacts() {
    const ocbPath = path.join(this.findCorePath(), 'rulesets', 'governance', 'open-core-boundary.rules.json');
    if (await this.fs.exists(ocbPath)) return this.fs.readJson(ocbPath);
    return { error: 'Open-Core Boundary rules not found' };
  }

  private async getAclRules() {
    const aclPath = path.join(this.findCorePath(), 'rulesets', 'acl', 'anti-corruption-layer.rules.json');
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

  private async getTopologyContent(id: string) {
    try {
      const corePath = this.findCorePath();
      const topologiesBase = path.join(corePath, 'reference', 'architecture', 'topologies');
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
