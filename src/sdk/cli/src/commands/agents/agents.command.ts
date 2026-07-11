import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { randomUUID } from 'node:crypto';
import { NodeFileSystemProvider } from '../../infrastructure/providers/node-filesystem.provider';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { AgentRegistryService, AgentInfo } from '../../infrastructure/adapters/agent-registry.service';
import { buildAgentRuleset } from '@beyondnet/evolith-core-domain/application/agents/agent-ruleset-builder';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { EvolithRestClient } from '@beyondnet/evolith-sdk';
import type { AgentRuntimeRequestWire } from '@beyondnet/evolith-agent-runtime';
import { createSuccessEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain/domain/gate-evidence';

let cachedFileSystem: IFileSystem | null = null;

/** Lazily build a shared filesystem adapter (replaces the removed in-process MCP `tool-utils`). */
function getFileSystem(): IFileSystem {
  if (!cachedFileSystem) {
    cachedFileSystem = new NodeFileSystemProvider().createFileSystem();
  }
  return cachedFileSystem;
}

interface AgentsCommandOptions {
  install?: string;
  remove?: string;
  list?: boolean;
  run?: string;
  dryRun?: boolean;
  format?: 'json' | 'table' | 'yaml';
}

const AGENT_TEMPLATES = [
  {
    value: 'standard',
    label: 'Standard Agent',
    description: 'Default agent with basic governance rules (ACL-01 through ACL-06)',
  },
  {
    value: 'minimal',
    label: 'Minimal Agent',
    description: 'Lightweight agent with essential rules only',
  },
  {
    value: 'enterprise',
    label: 'Enterprise Agent',
    description: 'Full compliance agent with audit trail and approval chains',
  },
];

const AVAILABLE_ADRS = [
  { value: 'adr-0002', label: 'ADR-0002: Hexagonal Architecture', selected: true },
  { value: 'adr-0018', label: 'ADR-0018: Testing Pyramid', selected: true },
  { value: 'adr-0032', label: 'ADR-0032: Protocol Selection', selected: false },
  { value: 'adr-0040', label: 'ADR-0040: Multi-Runtime', selected: false },
  { value: 'adr-0050', label: 'ADR-0050: GitFlow Branching', selected: true },
];

const AVAILABLE_RULESETS = [
  { value: 'acl', label: 'ACL Rules (Anti-Corruption Layer)', selected: true },
  { value: 'open-core', label: 'Open-Core Boundary Rules', selected: true },
  { value: 'inheritance', label: 'Inheritance Rules', selected: true },
];

@Command({
  name: 'agents',
  description: 'Instala, lista, valida o remueve agentes de Evolith en el repositorio satélite',
})
export class AgentsCommand extends BaseEvolithCommand {
  private readonly registry: AgentRegistryService;

  constructor(promptService: PromptService) {
    super('AgentsCommand', promptService);
    this.registry = new AgentRegistryService(getFileSystem());
  }

  async executeCommand(passedParam: string[], options?: AgentsCommandOptions): Promise<void> {
    // GT-458: honor the documented flags (--install/--remove/--list/--run), not
    // just a positional action, so `agents --list` lists instead of opening the
    // interactive menu. A positional action still wins when both are given.
    const flagAction =
      options?.install !== undefined ? 'install' :
      options?.remove !== undefined ? 'remove' :
      options?.list ? 'list' :
      options?.run !== undefined ? 'run' :
      undefined;
    const action = passedParam[0] || flagAction || 'menu';
    console.clear();

    switch (action) {
      case 'install': await this.installAgent(options); break;
      case 'remove': await this.removeAgent(options); break;
      case 'list': await this.listAgents(options); break;
      case 'validate': await this.validateAgent(options); break;
      case 'upgrade': await this.upgradeAgent(options); break;
      case 'run': await this.runAgent(options); break;
      case 'menu':
      default: await this.showMenu(); break;
    }
  }

  private async showMenu(): Promise<void> {
    this.promptService.showIntro('Evolith SDK - Agent Management');

    const selection = await this.promptService.select({
      message: 'Select an action:',
      options: [
        { value: 'install', label: 'Install New Agent', hint: 'Create a new agent with template and rulesets' },
        { value: 'list', label: 'List Installed Agents', hint: 'Show all agents in this repository' },
        { value: 'validate', label: 'Validate Agent', hint: 'Check agent ruleset compliance' },
        { value: 'upgrade', label: 'Upgrade Agent', hint: 'Update agent to latest version' },
        { value: 'run', label: 'Run Agent (Runtime)', hint: 'Execute an intent on the Agent Runtime API' },
        { value: 'remove', label: 'Remove Agent', hint: 'Delete an installed agent' },
        { value: 'exit', label: 'Exit', hint: 'Close agent management' },
      ],
    });

    if (selection === 'exit') {
      this.promptService.showOutro(chalk.blue('Agent management closed.'));
      return;
    }

    switch (selection) {
      case 'install': await this.installAgent({}); break;
      case 'list': await this.listAgents({}); break;
      case 'validate': await this.validateAgent({}); break;
      case 'upgrade': await this.upgradeAgent({}); break;
      case 'run': await this.runAgent({}); break;
      case 'remove': await this.removeAgent({}); break;
    }
  }

  private async installAgent(options?: AgentsCommandOptions): Promise<void> {
    const isJson = options?.format === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith agents install',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    if (!isJson) {
      this.promptService.showIntro('Evolith SDK - Agent Installation');
    }

    try {
      const name = await this.promptService.text({
        message: 'Agent name (kebab-case, e.g., my-agent):',
        placeholder: 'my-agent',
        validate: (value) => {
          if (!value) return 'Agent name is required';
          if (value.includes(' ')) return 'Name cannot contain spaces';
          if (!/^[a-z0-9-]+$/.test(value)) return 'Use lowercase letters, numbers, and hyphens only';
        },
      });

      const template = await this.promptService.select({
        message: 'Select agent template:',
        options: AGENT_TEMPLATES,
      });

      const description = await this.promptService.text({
        message: 'Agent description (optional):',
        placeholder: 'Agent for handling specific governance tasks',
      });

      const adrs = await this.promptService.multiselect({
        message: 'Select ADR rulesets to include:',
        options: AVAILABLE_ADRS,
        required: false,
      });

      const rulesets = await this.promptService.multiselect({
        message: 'Select additional rulesets:',
        options: AVAILABLE_RULESETS,
        required: false,
      });

      const confirmInstall = await this.promptService.confirm('Ready to install agent?', true);

      if (!confirmInstall) {
        if (isJson) {
          process.exitCode = 1;
          console.log(JSON.stringify(createSuccessEnvelope({ cancelled: true }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        } else {
          this.promptService.showOutro(chalk.yellow('Installation cancelled.'));
        }
        return;
      }

      const rulesetContent = buildAgentRuleset({
        name,
        template,
        adrs,
        rulesets,
      });

      const config: AgentInfo = {
        name,
        version: '1.0.0',
        template,
        description,
        adrs,
        rulesets,
        rulesetFiles: ['agent.rules.json'],
        installedAt: new Date().toISOString()
      };

      await this.registry.installAgent(process.cwd(), config, rulesetContent);

      const result = {
        success: true,
        agent: { name, version: config.version, template, description },
        message: `Agent '${name}' installed successfully`,
      };

      if (isJson) {
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        this.promptService.showSuccess(`\n✓ Agent '${name}' installed successfully`);
        this.promptService.showInfo(`Next steps:\n  1. Review agent rules\n  2. Validate agent: evolith agents validate`);
        this.promptService.showOutro(chalk.green('Agent installation complete.'));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (isJson) {
        process.exitCode = 1;
        console.log(JSON.stringify(createSuccessEnvelope({ success: false, error: message }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        throw error;
      }
    }
  }

  private async listAgents(options?: AgentsCommandOptions): Promise<void> {
    const isJson = options?.format === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith agents list',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    if (!isJson) {
      this.promptService.showIntro('Evolith SDK - Agent List');
    }

    try {
      const agents = await this.registry.discover(process.cwd());

      const result = {
        agents: agents.map(a => ({
          name: a.name,
          version: a.version,
          template: a.template,
          description: a.description,
        })),
        count: agents.length,
      };

      if (isJson) {
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        if (agents.length === 0) {
          this.promptService.showWarning('No agents installed.');
          this.promptService.showInfo('Run "evolith agents install" to install your first agent.');
          return;
        }

        this.promptService.showInfo(`Found ${agents.length} installed agent(s):\n`);

        for (const agent of agents) {
          const _principlesCount = 0;
          this.promptService.showInfo(chalk.cyan(`  • ${agent.name}`));
          this.promptService.showInfo(chalk.gray(`    Version: ${agent.version} | Template: ${agent.template}`));
        }

        this.promptService.showOutro(chalk.green(`\n${agents.length} agent(s) found.`));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (isJson) {
        process.exitCode = 1;
        console.log(JSON.stringify(createSuccessEnvelope({ success: false, error: message }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        throw error;
      }
    }
  }

  private async validateAgent(options?: AgentsCommandOptions): Promise<void> {
    const isJson = options?.format === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith agents validate',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    if (!isJson) {
      this.promptService.showIntro('Evolith SDK - Agent Validation');
    }

    try {
      const agents = await this.registry.discover(process.cwd());

      if (agents.length === 0) {
        if (isJson) {
          process.exitCode = 1;
          console.log(JSON.stringify(createSuccessEnvelope({ success: false, error: 'No agents installed to validate' }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        } else {
          this.promptService.showWarning('No agents installed to validate.');
        }
        return;
      }

      const agentToValidate = await this.promptService.select({
        message: 'Select agent to validate:',
        options: agents.map(a => ({ value: a.name, label: a.name })),
      });

      if (!isJson) {
        this.promptService.showInfo('\nValidating agent ruleset against engine...\n');
      }

      // We will use RulesetValidatorService simply to process the rules via engine
      // or validate its structural schema.
      const fs = getFileSystem();
      const rulesetPath = `${process.cwd()}/rulesets/agents/${String(agentToValidate)}/agent.rules.json`;

      if (!await fs.exists(rulesetPath)) {
        const errorMsg = `Ruleset file not found: ${rulesetPath}`;
        if (isJson) {
          process.exitCode = 1;
          console.log(JSON.stringify(createSuccessEnvelope({ success: false, error: errorMsg }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        } else {
          this.promptService.showError(errorMsg);
        }
        return;
      }

      interface AgentRuleset {
        agent?: { name?: string; version?: string };
        ruleset?: { version?: string };
        principles?: Array<{ id?: string; principle?: string; severity?: string }>;
      }
      const ruleset = await fs.readJson(rulesetPath) as AgentRuleset;
      const issues: Array<{ field: string; message: string }> = [];

      if (!ruleset.agent?.name) issues.push({ field: 'agent.name', message: 'Agent name is required' });
      if (!ruleset.ruleset?.version) issues.push({ field: 'ruleset.version', message: 'Ruleset version is required' });
      if (!ruleset.principles || ruleset.principles.length === 0) issues.push({ field: 'principles', message: 'At least one principle is required' });

      for (const principle of ruleset.principles || []) {
        if (!principle.id) issues.push({ field: `principle.missing-id`, message: `Principle "${principle.principle}" missing ID` });
        if (!principle.severity) issues.push({ field: `principle.missing-severity`, message: `Principle "${principle.id}" missing severity` });
      }

      const result = {
        agent: String(agentToValidate),
        passed: issues.length === 0,
        issuesCount: issues.length,
        issues: issues,
      };

      if (issues.length === 0) {
        await this.registry.updateLastValidated(process.cwd(), String(agentToValidate));
      }

      if (isJson) {
        if (issues.length > 0) {
          process.exitCode = 1;
        }
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        if (issues.length === 0) {
          this.promptService.showSuccess('\n✓ Agent validation passed');
        } else {
          this.promptService.showError(`\n✗ Agent validation failed: ${issues.length} issue(s) found`);
          for (const issue of issues) {
            this.promptService.showError(`  - [${issue.field}] ${issue.message}`);
          }
        }
        this.promptService.showOutro(issues.length === 0 ? chalk.green('Validation complete.') : chalk.red('Validation complete with errors.'));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (isJson) {
        process.exitCode = 1;
        console.log(JSON.stringify(createSuccessEnvelope({ success: false, error: message }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        throw error;
      }
    }
  }

  private async removeAgent(options?: AgentsCommandOptions): Promise<void> {
    const isJson = options?.format === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith agents remove',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    if (!isJson) {
      this.promptService.showIntro('Evolith SDK - Agent Removal');
    }

    try {
      const agents = await this.registry.discover(process.cwd());

      if (agents.length === 0) {
        if (isJson) {
          process.exitCode = 1;
          console.log(JSON.stringify(createSuccessEnvelope({ success: false, error: 'No agents installed to remove' }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        } else {
          this.promptService.showWarning('No agents installed to remove.');
        }
        return;
      }

      const agentToRemove = await this.promptService.select({
        message: 'Select agent to remove:',
        options: agents.map(a => ({ value: a.name, label: a.name })),
      });

      const confirm = await this.promptService.confirm(`Are you sure you want to remove agent '${String(agentToRemove)}'? This cannot be undone.`, false);

      if (!confirm) {
        if (isJson) {
          process.exitCode = 1;
          console.log(JSON.stringify(createSuccessEnvelope({ cancelled: true }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        } else {
          this.promptService.showOutro(chalk.yellow('Removal cancelled.'));
        }
        return;
      }

      await this.registry.unregister(process.cwd(), String(agentToRemove));

      const result = {
        success: true,
        agent: String(agentToRemove),
        message: `Agent '${String(agentToRemove)}' removed successfully`,
      };

      if (isJson) {
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        this.promptService.showSuccess(`\n✓ Agent '${String(agentToRemove)}' removed successfully`);
        this.promptService.showOutro(chalk.green('Agent removal complete.'));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (isJson) {
        process.exitCode = 1;
        console.log(JSON.stringify(createSuccessEnvelope({ success: false, error: message }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        throw error;
      }
    }
  }

  private async upgradeAgent(options?: AgentsCommandOptions): Promise<void> {
    const isJson = options?.format === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith agents upgrade',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    if (!isJson) {
      this.promptService.showIntro('Evolith SDK - Agent Upgrade');
    }

    try {
      const agents = await this.registry.discover(process.cwd());

      if (agents.length === 0) {
        if (isJson) {
          process.exitCode = 1;
          console.log(JSON.stringify(createSuccessEnvelope({ success: false, error: 'No agents installed to upgrade' }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        } else {
          this.promptService.showWarning('No agents installed to upgrade.');
        }
        return;
      }

      const agentName = await this.promptService.select({
        message: 'Select agent to upgrade:',
        options: agents.map(a => ({ value: a.name, label: a.name })),
      });

      const agent = await this.registry.getAgent(process.cwd(), String(agentName));
      if (!agent) {
        if (isJson) {
          process.exitCode = 1;
          console.log(JSON.stringify(createSuccessEnvelope({ success: false, error: 'Agent not found' }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        }
        return;
      }

      const fs = getFileSystem();
      const rulesetPath = `${process.cwd()}/rulesets/agents/${agent.name}/agent.rules.json`;

      if (!await fs.exists(rulesetPath)) {
        const errorMsg = 'Agent ruleset not found';
        if (isJson) {
          process.exitCode = 1;
          console.log(JSON.stringify(createSuccessEnvelope({ success: false, error: errorMsg }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        } else {
          this.promptService.showError(errorMsg);
        }
        return;
      }

      const ruleset = await fs.readJson(rulesetPath) as { agent?: { name?: string; version?: string }; ruleset?: { version?: string }; principles?: Array<{ id?: string; principle?: string; severity?: string }> };

      const parts = agent.version.split('.').map(Number);
      parts[2]++;
      const newVersion = parts.join('.');

      const previousVersion = agent.version;
      agent.version = newVersion;
      if (ruleset.agent) ruleset.agent.version = newVersion;

      await this.registry.updateAgent(process.cwd(), agent.name, agent, ruleset);

      const result = {
        success: true,
        agent: agent.name,
        previousVersion: previousVersion,
        newVersion: newVersion,
        message: `Agent '${agent.name}' upgraded: ${previousVersion} → ${newVersion}`,
      };

      if (isJson) {
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        this.promptService.showSuccess(`\n✓ Agent '${agent.name}' upgraded: ${previousVersion} → ${newVersion}`);
        this.promptService.showOutro(chalk.green('Agent upgrade complete.'));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (isJson) {
        process.exitCode = 1;
        console.log(JSON.stringify(createSuccessEnvelope({ success: false, error: message }, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        throw error;
      }
    }
  }

  private async runAgent(options?: AgentsCommandOptions): Promise<void> {
    this.promptService.showIntro('Evolith SDK - Agent Runtime Execution');

    const intent = options?.run || await this.promptService.text({
      message: 'Enter your request intent for the Agent Runtime:',
      placeholder: 'e.g. Generate architecture plan for new microservice',
    });

    if (!intent) {
      this.promptService.showError('Intent is required to run the agent.');
      return;
    }

    const apiUrl = process.env.AGENT_RUNTIME_URL || 'http://localhost:3000';
    this.promptService.showInfo(`Connecting to Agent Runtime at: ${apiUrl}`);
    
    try {
      const client = new EvolithRestClient({ baseUrl: apiUrl, agentUrl: apiUrl });
      
      this.promptService.showInfo('Sending request to Agent Runtime API...');
      const request: AgentRuntimeRequestWire = {
        intent: String(intent),
        parameters: { cwd: process.cwd() }
      };

      const result = await client.agent.handle(request);
      
      this.promptService.showSuccess(`\n✓ Agent Runtime execution completed`);
      this.promptService.showInfo(`Result:\n${JSON.stringify(result, null, 2)}`);
      this.promptService.showOutro(chalk.green('Run complete.'));
    } catch (err: any) {
      this.promptService.showError(`\n✗ Agent Runtime execution failed: ${err.message}`);
    }
  }

  @Option({ flags: '-i, --install [name]', description: 'Install a new agent' })
  parseInstall(val: string): string { return val; }

  @Option({ flags: '-r, --remove [name]', description: 'Remove an agent' })
  parseRemove(val: string): string { return val; }

  @Option({ flags: '-l, --list', description: 'List installed agents' })
  parseList(): boolean { return true; }

  @Option({ flags: '-d, --dry-run', description: 'Dry run' })
  parseDryRun(): boolean { return true; }

  @Option({ flags: '--run [intent]', description: 'Run agent with intent' })
  parseRun(val: string): string { return val; }

  @Option({ flags: '--format [type]', description: 'Output format: json, table, yaml' })
  parseFormat(val: string): 'json' | 'table' | 'yaml' { return val as 'json' | 'table' | 'yaml'; }
}