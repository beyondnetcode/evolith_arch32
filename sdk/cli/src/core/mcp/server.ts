import { Logger } from '@nestjs/common';
import { RulesetValidatorService } from '../validators/ruleset-validator.service';
import { handleValidateTool } from './tools/validate';
import { handleAgentTools } from './tools/agent';
import { handleArchitectureTools } from './tools/architecture';
import { handleSdlcTools } from './tools/sdlc';
import { listResources, readResource } from './resources';
import { listPrompts, getPrompt } from './prompts';
import { McpMetricsService } from './metrics.service';

export interface McpServerOptions {
  rulesetValidator?: RulesetValidatorService;
  metricsService?: McpMetricsService;
}

interface McpServerInstance {
  setRequestHandler(schema: unknown, handler: (request: unknown) => Promise<unknown>): void;
  connect(transport: unknown): Promise<void>;
}

interface McpTransportInstance {
}

let ServerClass: new (options: { name: string; version: string }) => McpServerInstance;
let StdioTransportClass: new () => McpTransportInstance;

async function loadMcpSdk() {
  if (ServerClass) return;

  try {
    const mcp = await import('@modelcontextprotocol/sdk');
    ServerClass = mcp.Server as unknown as new (options: { name: string; version: string }) => McpServerInstance;
    StdioTransportClass = mcp.StdioServerTransport as unknown as new () => McpTransportInstance;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load @modelcontextprotocol/sdk: ${msg}. Install with: npm install @modelcontextprotocol/sdk`);
  }
}

const LIST_TOOLS_REQUEST_SCHEMA: unknown = {
  name: 'tools/list',
  description: 'List available tools',
};

const CALL_TOOL_REQUEST_SCHEMA: unknown = {
  name: 'tools/call',
  description: 'Call a tool by name',
};

const LIST_RESOURCES_REQUEST_SCHEMA: unknown = {
  name: 'resources/list',
  description: 'List available resources',
};

const READ_RESOURCE_REQUEST_SCHEMA: unknown = {
  name: 'resources/read',
  description: 'Read a resource',
};

const LIST_PROMPTS_REQUEST_SCHEMA: unknown = {
  name: 'prompts/list',
  description: 'List available prompts',
};

const GET_PROMPT_REQUEST_SCHEMA: unknown = {
  name: 'prompts/get',
  description: 'Get a prompt template',
};

export class EvolithMcpServer {
  private readonly logger = new Logger(EvolithMcpServer.name);
  private rulesetValidator: RulesetValidatorService;
  private metricsService: McpMetricsService;
  private serverInstance: McpServerInstance | null = null;

  constructor(options: McpServerOptions = {}) {
    this.rulesetValidator = options.rulesetValidator || new RulesetValidatorService();
    this.metricsService = options.metricsService || new McpMetricsService();
  }

  async initialize(): Promise<void> {
    await loadMcpSdk();

    const self = this;
    this.serverInstance = new ServerClass({
      name: 'evolith-mcp-server',
      version: '1.0.0',
    });

    this.serverInstance.setRequestHandler(LIST_TOOLS_REQUEST_SCHEMA, async () => {
      return this.handleListTools();
    });

    this.serverInstance.setRequestHandler(CALL_TOOL_REQUEST_SCHEMA, async (request: unknown) => {
      const req = request as { name: string; arguments?: Record<string, unknown> };
      return this.handleCallTool(req.name, req.arguments || {});
    });

    this.serverInstance.setRequestHandler(LIST_RESOURCES_REQUEST_SCHEMA, async () => {
      return listResources();
    });

    this.serverInstance.setRequestHandler(READ_RESOURCE_REQUEST_SCHEMA, async (request: unknown) => {
      return readResource(request);
    });

    this.serverInstance.setRequestHandler(LIST_PROMPTS_REQUEST_SCHEMA, async () => {
      return listPrompts();
    });

    this.serverInstance.setRequestHandler(GET_PROMPT_REQUEST_SCHEMA, async (request: unknown) => {
      return getPrompt(request);
    });

    this.logger.log('Evolith MCP Server initialized');
  }

  async connect(): Promise<void> {
    if (!this.serverInstance) {
      await this.initialize();
    }
    const transport = new StdioTransportClass();
    await this.serverInstance!.connect(transport);
  }

  private async handleListTools() {
    return {
      tools: [
        {
          name: 'evolith-validate',
          description: 'Validate a repository against Evolith governance rules. Returns validation status, rules checked, and any issues found.',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to the repository to validate' },
              format: { type: 'string', description: 'Output format: json, summary, table', default: 'json' },
              ruleset: { type: 'string', description: 'Specific ruleset to validate (acl, open-core, inheritance, adr-XXXX)' },
              corePath: { type: 'string', description: 'Path to Evolith Core (optional, auto-detected)' },
            },
            required: ['path'],
          },
        },
        {
          name: 'evolith-agent-install',
          description: 'Install a new Evolith agent with specified name and template',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name of the agent to install' },
              template: { type: 'string', description: 'Template to use: standard, minimal, enterprise', default: 'standard' },
              dir: { type: 'string', description: 'Directory to install into (defaults to current working directory)' },
            },
            required: ['name'],
          },
        },
        {
          name: 'evolith-agent-list',
          description: 'List all installed Evolith agents in a repository',
          inputSchema: {
            type: 'object',
            properties: {
              dir: { type: 'string', description: 'Directory to search for agents (defaults to current working directory)' },
            },
          },
        },
        {
          name: 'evolith-agent-validate',
          description: 'Validate a specific agent ruleset',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name of the agent to validate' },
              dir: { type: 'string', description: 'Directory containing the agent (defaults to current working directory)' },
            },
            required: ['name'],
          },
        },
        {
          name: 'evolith-agent-upgrade',
          description: 'Upgrade an existing Evolith agent to the latest version',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name of the agent to upgrade' },
              dir: { type: 'string', description: 'Directory containing the agent (defaults to current working directory)' },
            },
            required: ['name'],
          },
        },
        {
          name: 'evolith-agent-remove',
          description: 'Remove an Evolith agent and its ruleset',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Name of the agent to remove' },
              dir: { type: 'string', description: 'Directory containing the agent (defaults to current working directory)' },
            },
            required: ['name'],
          },
        },
        {
          name: 'evolith-architecture-validate',
          description: 'Validate repository architecture against F1/F2/F3 rules',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to the repository to validate' },
              level: { type: 'string', description: 'Architecture level: F1 (modular), F2 (contracts), F3 (extraction)', default: 'F1' },
            },
            required: ['path'],
          },
        },
        {
          name: 'evolith-sdlc-handoff',
          description: 'Generate SDLC phase handoff artifact manifest',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to the repository' },
              fromPhase: { type: 'string', description: 'Source phase: phase-0, phase-1, phase-2, phase-3, phase-4' },
              toPhase: { type: 'string', description: 'Target phase: phase-0, phase-1, phase-2, phase-3, phase-4' },
            },
            required: ['path', 'fromPhase', 'toPhase'],
          },
        },
        {
          name: 'evolith-sdlc-status',
          description: 'Show current SDLC phase gate status for a repository',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to the repository' },
            },
            required: ['path'],
          },
        },
        {
          name: 'evolith-config-get',
          description: 'Get Evolith configuration value',
          inputSchema: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Configuration key to retrieve' },
              dir: { type: 'string', description: 'Directory containing evolith.yaml' },
            },
            required: ['key'],
          },
        },
        {
          name: 'evolith-config-set',
          description: 'Set Evolith configuration value',
          inputSchema: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Configuration key to set' },
              value: { type: 'string', description: 'Value to set' },
              dir: { type: 'string', description: 'Directory containing evolith.yaml' },
            },
            required: ['key', 'value'],
          },
        },
        {
          name: 'evolith-metrics',
          description: 'Get MCP server metrics including tool usage statistics, latency, and error rates',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    };
  }

  private async handleCallTool(name: string, args: Record<string, unknown>) {
    this.logger.debug(`Tool call: ${name} with args: ${JSON.stringify(args)}`);
    const startTime = Date.now();

    try {
      let result: unknown;

      if (name === 'evolith-validate') {
        result = await handleValidateTool(args, this.rulesetValidator);
      } else if (name.startsWith('evolith-agent')) {
        result = await handleAgentTools(name, args);
      } else if (name === 'evolith-architecture-validate') {
        result = await handleArchitectureTools(args);
      } else if (name.startsWith('evolith-sdlc')) {
        result = await handleSdlcTools(name, args);
      } else if (name === 'evolith-config-get' || name === 'evolith-config-set') {
        result = await handleConfigTools(name, args);
      } else if (name === 'evolith-metrics') {
        result = this.metricsService.getMetrics();
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }

      const latencyMs = Date.now() - startTime;
      this.metricsService.recordToolCall(name, latencyMs, true);

      return {
        content: [
          {
            type: 'text' as const,
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Tool ${name} failed: ${message}`);
      this.metricsService.recordToolCall(name, latencyMs, false);
      this.metricsService.recordError(message.substring(0, 50));

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ error: true, message }),
          },
        ],
        isError: true,
      };
    }
  }
}

async function handleConfigTools(name: string, args: Record<string, unknown>) {
  const fs = await import('fs-extra');
  const path = await import('path');
  const yaml = await import('yaml');

  const dir = (args.dir as string) || process.cwd();
  const configPath = path.join(dir, 'evolith.yaml');

  if (!(await fs.pathExists(configPath))) {
    throw new Error('evolith.yaml not found');
  }

  const config = yaml.parse(await fs.readFile(configPath, 'utf-8'));

  if (name === 'evolith-config-get') {
    const key = args.key as string;
    const keys = key.split('.');
    let value: unknown = config;
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }
    return { key, value: value ?? null };
  } else {
    const key = args.key as string;
    const value = args.value as string;
    const keys = key.split('.');
    let target: Record<string, unknown> = config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) {
        target[keys[i]] = {};
      }
      target = target[keys[i]] as Record<string, unknown>;
    }
    target[keys[keys.length - 1]] = value;
    await fs.writeFile(configPath, yaml.stringify(config));
    return { key, value, updated: true };
  }
}

export async function startMcpServer(options: McpServerOptions = {}) {
  const server = new EvolithMcpServer(options);
  await server.connect();
  return server;
}