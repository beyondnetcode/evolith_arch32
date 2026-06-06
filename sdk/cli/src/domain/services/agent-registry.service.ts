import * as path from 'path';
import * as fs from 'fs-extra';
import { IFileSystem } from '../../core/abstractions/interfaces';

export interface AgentInfo {
  name: string;
  version: string;
  template: string;
  rulesetFiles: string[];
  installedAt: string;
  lastValidated?: string;
}

export interface AgentRegistry {
  agents: AgentInfo[];
  lastUpdated: string;
}

export class AgentRegistryService {
  private readonly fs: IFileSystem;
  private readonly registryFileName = 'agents-registry.json';
  private readonly agentsDirName = '.evolith/agents';

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
        const agentJsonPath = path.join(agentPath, 'agent.json');
        if (await this.fs.exists(agentJsonPath)) {
          const agentData = await this.fs.readJson(agentJsonPath) as AgentInfo;
          agents.push(agentData);
        }
      }
    }

    return agents;
  }

  async register(repoPath: string, agent: AgentInfo): Promise<void> {
    const agentsPath = path.join(repoPath, this.agentsDirName);
    await this.fs.ensureDir(agentsPath);

    const agentPath = path.join(agentsPath, agent.name);
    await this.fs.ensureDir(agentPath);

    await this.fs.writeJson(path.join(agentPath, 'agent.json'), agent);

    const registry = await this.loadOrCreateRegistry(agentsPath);
    const existingIdx = registry.agents.findIndex(a => a.name === agent.name);
    if (existingIdx >= 0) {
      registry.agents[existingIdx] = agent;
    } else {
      registry.agents.push(agent);
    }
    registry.lastUpdated = new Date().toISOString();
    await this.fs.writeJson(path.join(agentsPath, this.registryFileName), registry);
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