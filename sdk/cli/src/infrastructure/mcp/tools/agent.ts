import * as path from 'path';
import { getFileSystem } from './tool-utils';
import { IFileSystem, IConfigParser } from '@evolith/core-domain/domain/interfaces';

interface AgentInfo {
  name: string;
  version: string;
  template: string;
  installedAt: string;
  rulesetPath: string;
}

import { IMcpToolHandler } from '../mcp-tool.registry';

export function getAgentTools(fs: IFileSystem, configParser: IConfigParser): IMcpToolHandler[] {
  return [
    {
      schema: {
        name: 'evolith-agent-install',
        description: 'Install a new Evolith agent',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the agent to install' },
            template: { type: 'string', description: 'Template: standard, minimal, enterprise', default: 'standard' },
            dir: { type: 'string', description: 'Directory to install into' },
          },
          required: ['name'],
        },
      },
      execute: async (args) => {
        /* fs injected */
        const dir = (args.dir as string) || process.cwd();
        return agentInstall(args.name as string, (args.template as string) || 'standard', dir, fs);
      }
    },
    {
      schema: {
        name: 'evolith-agent-list',
        description: 'List all installed Evolith agents',
        inputSchema: {
          type: 'object',
          properties: {
            dir: { type: 'string', description: 'Directory to search' },
          },
        },
      },
      execute: async (args) => {
        /* fs injected */
        const dir = (args.dir as string) || process.cwd();
        return agentList(dir, fs);
      }
    },
    {
      schema: {
        name: 'evolith-agent-validate',
        description: 'Validate a specific agent ruleset',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            dir: { type: 'string' },
          },
          required: ['name'],
        },
      },
      execute: async (args) => {
        /* fs injected */
        const dir = (args.dir as string) || process.cwd();
        return agentValidate(args.name as string, dir, fs);
      }
    },
    {
      schema: {
        name: 'evolith-agent-upgrade',
        description: 'Upgrade an existing Evolith agent',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            dir: { type: 'string' },
          },
          required: ['name'],
        },
      },
      execute: async (args) => {
        /* fs injected */
        const dir = (args.dir as string) || process.cwd();
        return agentUpgrade(args.name as string, dir, fs);
      }
    },
    {
      schema: {
        name: 'evolith-agent-remove',
        description: 'Remove an Evolith agent',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            dir: { type: 'string' },
          },
          required: ['name'],
        },
      },
      execute: async (args) => {
        /* fs injected */
        const dir = (args.dir as string) || process.cwd();
        return agentRemove(args.name as string, dir, fs);
      }
    }
  ];
}

async function agentInstall(name: string, template: string, dir: string, fs: IFileSystem) {
  const rulesetDir = path.join(dir, 'rulesets', 'agents', name);
  const rulesetPath = path.join(rulesetDir, 'agent.rules.json');

  await fs.ensureDir(rulesetDir);

  const templateContent = getAgentTemplate(name, template);
  await fs.writeJson(rulesetPath, templateContent);

  return {
    success: true,
    agent: name,
    template,
    rulesetPath,
    message: `Agent '${name}' installed successfully using '${template}' template`,
  };
}

async function agentList(dir: string, fs: IFileSystem) {
  const agentsDir = path.join(dir, 'rulesets', 'agents');

  if (!(await fs.exists(agentsDir))) {
    return { agents: [], message: 'No agents directory found' };
  }

  const names = await fs.readdirNames(agentsDir);
  const agents: AgentInfo[] = [];

  for (const entry of names) {
    const agentDir = path.join(agentsDir, entry);
    const stat = await fs.stat(agentDir);

    if (stat.isDirectory()) {
      const rulesetPath = path.join(agentDir, 'agent.rules.json');
      if (await fs.exists(rulesetPath)) {
        const ruleset = await fs.readJson(rulesetPath) as { agent?: { name?: string; version?: string; template?: string; installedAt?: string } };
        agents.push({
          name: entry,
          version: ruleset.agent?.version || '1.0.0',
          template: ruleset.agent?.template || 'standard',
          installedAt: ruleset.agent?.installedAt || new Date().toISOString(),
          rulesetPath,
        });
      }
    }
  }

  return { agents, count: agents.length };
}

async function agentValidate(name: string, dir: string, fs: IFileSystem) {
  const rulesetPath = path.join(dir, 'rulesets', 'agents', name, 'agent.rules.json');

  if (!(await fs.exists(rulesetPath))) {
    return { valid: false, error: `Agent '${name}' not found` };
  }

  const ruleset = await fs.readJson(rulesetPath) as { agent?: { name?: string }; ruleset?: { version?: string }; principles?: unknown[] };

  const issues: Array<{ field: string; message: string }> = [];

  if (!ruleset.agent?.name) {
    issues.push({ field: 'agent.name', message: 'Agent name is required' });
  }
  if (!ruleset.ruleset?.version) {
    issues.push({ field: 'ruleset.version', message: 'Ruleset version is required' });
  }
  if (!ruleset.principles || ruleset.principles.length === 0) {
    issues.push({ field: 'principles', message: 'At least one principle is required' });
  }

  return {
    valid: issues.length === 0,
    agent: name,
    issues,
    timestamp: new Date().toISOString(),
  };
}

async function agentUpgrade(name: string, dir: string, fs: IFileSystem) {
  const rulesetPath = path.join(dir, 'rulesets', 'agents', name, 'agent.rules.json');

  if (!(await fs.exists(rulesetPath))) {
    throw new Error(`Agent '${name}' not found`);
  }

  const ruleset = await fs.readJson(rulesetPath) as { agent?: { version?: string } };
  const currentVersion = ruleset.agent?.version || '1.0.0';

  const newVersion = incrementVersion(currentVersion);
  ruleset.agent!.version = newVersion;

  await fs.writeJson(rulesetPath, ruleset);

  return {
    success: true,
    agent: name,
    fromVersion: currentVersion,
    toVersion: newVersion,
  };
}

async function agentRemove(name: string, dir: string, fs: IFileSystem) {
  const agentDir = path.join(dir, 'rulesets', 'agents', name);

  if (!(await fs.exists(agentDir))) {
    throw new Error(`Agent '${name}' not found`);
  }

  await fs.remove(agentDir);

  return {
    success: true,
    agent: name,
    message: `Agent '${name}' removed successfully`,
  };
}

function getAgentTemplate(name: string, template: string) {
  const base = {
    agent: {
      name,
      template,
      version: '1.0.0',
      installedAt: new Date().toISOString(),
    },
    ruleset: {
      version: '1.0',
      type: 'agent',
    },
    principles: [],
  };

  if (template === 'minimal') {
    return {
      ...base,
      principles: [
        { id: 'AGT-01', principle: 'Minimal Agent Principle', statement: 'This agent follows minimal governance rules.', severity: 'SHOULD', blocking: false },
      ],
    };
  } else if (template === 'enterprise') {
    return {
      ...base,
      principles: [
        { id: 'AGT-01', principle: 'Enterprise Agent Principle', statement: 'This agent enforces full enterprise governance.', severity: 'MUST', blocking: true },
        { id: 'AGT-02', principle: 'Audit Trail Principle', statement: 'All agent actions must be logged.', severity: 'MUST', blocking: true },
        { id: 'AGT-03', principle: 'Approval Chain Principle', statement: 'Critical actions require approval.', severity: 'SHOULD', blocking: false },
      ],
    };
  }

  return {
    ...base,
    principles: [
      { id: 'AGT-01', principle: 'Standard Agent Principle', statement: 'This agent follows standard Evolith governance rules.', severity: 'MUST', blocking: true },
      { id: 'AGT-02', principle: 'Bilingual Support Principle', statement: 'Agent must support both EN and ES documentation.', severity: 'SHOULD', blocking: false },
    ],
  };
}

function incrementVersion(version: string): string {
  const parts = version.split('.').map(Number);
  parts[2]++;
  return parts.join('.');
}