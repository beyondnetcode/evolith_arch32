import * as path from 'path';
import { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';

export interface AgentInfo {
  name: string;
  version: string;
  template: string;
  rulesetFiles: string[];
  installedAt: string;
  description?: string;
  adrs?: string[];
  rulesets?: string[];
  lastValidated?: string;
}

export interface AgentRegistry {
  agents: AgentInfo[];
  lastUpdated: string;
}

export class AgentRegistryService {
  private readonly fs: IFileSystem;
  private readonly registryFileName = 'agents-registry.json';
  private readonly agentsDirName = 'rulesets/agents';

  constructor(fs: IFileSystem) {
    this.fs = fs;
  }

  async discover(repoPath: string): Promise<AgentInfo[]> {
    const agentsPath = path.join(repoPath, this.agentsDirName);

    if (!(await this.fs.exists(agentsPath))) {
      return [];
    }

    const registryPath = path.join(agentsPath, this.registryFileName);

    if (await this.fs.exists(registryPath)) {
      const registry = await this.fs.readJson(registryPath) as AgentRegistry;
      return registry.agents || [];
    }

    const entries = await this.fs.readdirNames(agentsPath);
    const agents: AgentInfo[] = [];

    for (const entry of entries) {
      const agentPath = path.join(agentsPath, entry);
      const stat = await this.fs.stat(agentPath);

      if (stat.isDirectory()) {
        const agentConfigPath = path.join(agentPath, 'agent.config.json');
        if (await this.fs.exists(agentConfigPath)) {
          const agentData = await this.fs.readJson(agentConfigPath) as AgentInfo;
          agents.push(agentData);
        }
      }
    }

    return agents;
  }

  /**
   * The paths `installAgent` would write for `agentName`, in write order.
   *
   * Exposed so a dry run can report what it would create without holding a
   * second copy of the layout: a `--dry-run` that describes a directory
   * structure the writer no longer uses is its own kind of lie.
   */
  planInstall(repoPath: string, agentName: string): string[] {
    const agentsPath = path.join(repoPath, this.agentsDirName);
    const agentPath = path.join(agentsPath, agentName);
    return [
      path.join(agentPath, 'agent.config.json'),
      path.join(agentPath, 'agent.rules.json'),
      path.join(agentsPath, this.registryFileName),
    ];
  }

  async installAgent(repoPath: string, agentInfo: AgentInfo, rulesetContent: Record<string, unknown>): Promise<void> {
    const agentsPath = path.join(repoPath, this.agentsDirName);
    await this.fs.ensureDir(agentsPath);

    const agentPath = path.join(agentsPath, agentInfo.name);
    await this.fs.ensureDir(agentPath);

    const configPath = path.join(agentPath, 'agent.config.json');
    const rulesetPath = path.join(agentPath, 'agent.rules.json');

    await this.fs.writeJson(configPath, agentInfo);
    await this.fs.writeJson(rulesetPath, rulesetContent);

    const registry = await this.loadOrCreateRegistry(agentsPath);
    const before = JSON.stringify(registry.agents);
    const existingIdx = registry.agents.findIndex(a => a.name === agentInfo.name);
    if (existingIdx >= 0) {
      registry.agents[existingIdx] = agentInfo;
    } else {
      registry.agents.push(agentInfo);
    }
    if (JSON.stringify(registry.agents) !== before) {
      registry.lastUpdated = new Date().toISOString();
      await this.fs.writeJson(path.join(agentsPath, this.registryFileName), registry);
    }
  }

  async unregister(repoPath: string, agentName: string): Promise<boolean> {
    const agentsPath = path.join(repoPath, this.agentsDirName);
    const registryPath = path.join(agentsPath, this.registryFileName);

    if (!(await this.fs.exists(registryPath))) {
      return false;
    }

    const registry = await this.fs.readJson(registryPath) as AgentRegistry;
    const idx = registry.agents.findIndex(a => a.name === agentName);

    if (idx < 0) {
      return false;
    }

    registry.agents.splice(idx, 1);
    registry.lastUpdated = new Date().toISOString();
    await this.fs.writeJson(registryPath, registry);

    const agentPath = path.join(agentsPath, agentName);
    if (await this.fs.exists(agentPath)) {
      await this.fs.remove(agentPath);
    }

    return true;
  }

  async getAgent(repoPath: string, agentName: string): Promise<AgentInfo | undefined> {
    const agents = await this.discover(repoPath);
    return agents.find(a => a.name === agentName);
  }

  async updateAgent(repoPath: string, agentName: string, config: AgentInfo, rulesetContent: Record<string, unknown>): Promise<boolean> {
    const agentsPath = path.join(repoPath, this.agentsDirName);
    const agentPath = path.join(agentsPath, agentName);

    if (!(await this.fs.exists(agentPath))) {
      return false;
    }

    await this.fs.writeJson(path.join(agentPath, 'agent.config.json'), config);
    await this.fs.writeJson(path.join(agentPath, 'agent.rules.json'), rulesetContent);

    const registryPath = path.join(agentsPath, this.registryFileName);
    if (await this.fs.exists(registryPath)) {
      const registry = await this.fs.readJson(registryPath) as AgentRegistry;
      const idx = registry.agents.findIndex(a => a.name === agentName);
      if (idx >= 0 && JSON.stringify(registry.agents[idx]) !== JSON.stringify(config)) {
        registry.agents[idx] = config;
        registry.lastUpdated = new Date().toISOString();
        await this.fs.writeJson(registryPath, registry);
      }
    }
    return true;
  }

  async updateLastValidated(repoPath: string, agentName: string): Promise<void> {
    const agentsPath = path.join(repoPath, this.agentsDirName);
    const registryPath = path.join(agentsPath, this.registryFileName);

    if (!(await this.fs.exists(registryPath))) {
      return;
    }

    const registry = await this.fs.readJson(registryPath) as AgentRegistry;
    const agent = registry.agents.find(a => a.name === agentName);

    if (agent) {
      agent.lastValidated = new Date().toISOString();
      registry.lastUpdated = new Date().toISOString();
      await this.fs.writeJson(registryPath, registry);
    }
  }

  async exportManifest(repoPath: string): Promise<string> {
    const agents = await this.discover(repoPath);

    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      agentCount: agents.length,
      agents: agents.map(a => ({
        name: a.name,
        version: a.version,
        template: a.template,
        rulesets: a.rulesetFiles,
        installedAt: a.installedAt,
        status: a.lastValidated ? 'validated' : 'pending',
      })),
    }, null, 2);
  }

  private async loadOrCreateRegistry(agentsPath: string): Promise<AgentRegistry> {
    const registryPath = path.join(agentsPath, this.registryFileName);

    if (await this.fs.exists(registryPath)) {
      return await this.fs.readJson(registryPath) as AgentRegistry;
    }

    return {
      agents: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}