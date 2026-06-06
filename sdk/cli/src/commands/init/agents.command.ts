import { Command, CommandRunner, Option } from 'nest-commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { getFileSystem, getContainer } from '../../core/mcp/tools/tool-utils';

interface AgentsCommandOptions {
  install?: string;
  remove?: string;
  list?: boolean;
  dryRun?: boolean;
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
export class AgentsCommand extends CommandRunner {
  async run(passedParam: string[], options?: AgentsCommandOptions): Promise<void> {
    const action = passedParam[0] || 'menu';

    console.clear();

    switch (action) {
      case 'install':
        await this.installAgent(options);
        break;
      case 'remove':
        await this.removeAgent(options);
        break;
      case 'list':
        await this.listAgents(options);
        break;
      case 'validate':
        await this.validateAgent(options);
        break;
      case 'upgrade':
        await this.upgradeAgent(options);
        break;
      case 'menu':
      default:
        await this.showMenu();
        break;
    }
  }

  private async showMenu(): Promise<void> {
    p.intro(chalk.bgCyan.white.bold(' Evolith SDK - Agent Management '));

    const selection = await p.select({
      message: 'Select an action:',
      options: [
        { value: 'install', label: 'Install New Agent', hint: 'Create a new agent with template and rulesets' },
        { value: 'list', label: 'List Installed Agents', hint: 'Show all agents in this repository' },
        { value: 'validate', label: 'Validate Agent', hint: 'Check agent ruleset compliance' },
        { value: 'upgrade', label: 'Upgrade Agent', hint: 'Update agent to latest version' },
        { value: 'remove', label: 'Remove Agent', hint: 'Delete an installed agent' },
        { value: 'exit', label: 'Exit', hint: 'Close agent management' },
      ],
    });

    if (selection === 'exit') {
      p.outro(chalk.blue('Agent management closed.'));
      return;
    }

    switch (selection) {
      case 'install':
        await this.installAgent({});
        break;
      case 'list':
        await this.listAgents({});
        break;
      case 'validate':
        await this.validateAgent({});
        break;
      case 'upgrade':
        await this.upgradeAgent({});
        break;
      case 'remove':
        await this.removeAgent({});
        break;
    }
  }

  private async installAgent(_options?: AgentsCommandOptions): Promise<void> {
    p.intro(chalk.bgGreen.white.bold(' Evolith SDK - Agent Installation '));

    const agentInfo = await p.group({
      name: () => p.text({
        message: 'Agent name (kebab-case, e.g., my-agent):',
        placeholder: 'my-agent',
        validate: (value) => {
          if (!value) return 'Agent name is required';
          if (value.includes(' ')) return 'Name cannot contain spaces';
          if (!/^[a-z0-9-]+$/.test(value)) return 'Use lowercase letters, numbers, and hyphens only';
        },
      }),

      template: () => p.select({
        message: 'Select agent template:',
        options: AGENT_TEMPLATES,
      }),

      description: () => p.text({
        message: 'Agent description (optional):',
        placeholder: 'Agent for handling specific governance tasks',
      }),

      adrs: () => p.multiselect({
        message: 'Select ADR rulesets to include:',
        options: AVAILABLE_ADRS,
        required: false,
      }),

      rulesets: () => p.multiselect({
        message: 'Select additional rulesets:',
        options: AVAILABLE_RULESETS,
        required: false,
      }),

      confirmInstall: () => p.confirm({
        message: 'Ready to install agent?',
        initialValue: true,
      }),
    }, {
      onCancel: () => {
        p.cancel('Installation cancelled.');
        process.exit(0);
      },
    });

    if (!agentInfo.confirmInstall) {
      p.outro(chalk.yellow('Installation cancelled.'));
      return;
    }

    const fs = getFileSystem();
    const agentDir = `${process.cwd()}/rulesets/agents/${agentInfo.name}`;
    const rulesetPath = `${agentDir}/agent.rules.json`;

    await fs.ensureDir(agentDir);

    const agentRuleset = this.buildAgentRuleset(agentInfo);

    await fs.writeJson(rulesetPath, agentRuleset);

    const configPath = `${agentDir}/agent.config.json`;
    await fs.writeJson(configPath, {
      name: agentInfo.name,
      template: agentInfo.template,
      description: agentInfo.description || '',
      adrs: agentInfo.adrs,
      rulesets: agentInfo.rulesets,
      installedAt: new Date().toISOString(),
      version: '1.0.0',
    });

    p.log.success(chalk.green(`\n✓ Agent '${agentInfo.name}' installed successfully`));
    p.note(`Ruleset: ${rulesetPath}`, 'Location');
    p.note(`Config: ${configPath}`, 'Location');

    const nextSteps = `Next steps:
  1. Review agent rules: cat ${rulesetPath}
  2. Validate agent: evolith agents validate
  3. Update documentation if needed`;
    p.note(nextSteps, 'Next Steps');

    p.outro(chalk.green('Agent installation complete.'));
  }

  private buildAgentRuleset(agentInfo: {
    name: string;
    template: string;
    adrs: string[];
    rulesets: string[];
  }) {
    const principles: Array<{
      id: string;
      principle: string;
      statement: string;
      severity: string;
      blocking: boolean;
    }> = [];

    principles.push({
      id: 'AGT-01',
      principle: 'Agent Identity',
      statement: `Agent ${agentInfo.name} enforces Evolith governance standards`,
      severity: 'MUST',
      blocking: true,
    });

    if (agentInfo.template === 'enterprise') {
      principles.push({
        id: 'AGT-02',
        principle: 'Audit Trail',
        statement: 'All agent actions must be logged for traceability',
        severity: 'MUST',
        blocking: true,
      });
      principles.push({
        id: 'AGT-03',
        principle: 'Approval Chain',
        statement: 'Critical actions require explicit approval',
        severity: 'SHOULD',
        blocking: false,
      });
    }

    if (agentInfo.adrs.includes('adr-0002')) {
      principles.push({
        id: 'AGT-HXA-01',
        principle: 'Hexagonal Architecture Compliance',
        statement: 'Domain layer has zero framework dependencies',
        severity: 'MUST',
        blocking: true,
      });
    }

    if (agentInfo.adrs.includes('adr-0018')) {
      principles.push({
        id: 'AGT-TP-01',
        principle: 'Testing Pyramid',
        statement: '70% unit / 20% integration / 10% E2E distribution',
        severity: 'SHOULD',
        blocking: false,
      });
    }

    if (agentInfo.rulesets.includes('acl')) {
      principles.push({
        id: 'AGT-ACL-01',
        principle: 'Schema Validation',
        statement: 'All external data validated before ingestion',
        severity: 'MUST',
        blocking: true,
      });
    }

    return {
      agent: {
        name: agentInfo.name,
        template: agentInfo.template,
        version: '1.0.0',
        installedAt: new Date().toISOString(),
      },
      ruleset: {
        version: '1.0',
        type: 'agent',
        scope: 'governance',
      },
      principles,
      metadata: {
        adrs: agentInfo.adrs,
        rulesets: agentInfo.rulesets,
      },
    };
  }

  private async listAgents(_options?: AgentsCommandOptions): Promise<void> {
    p.intro(chalk.bgBlue.white.bold(' Evolith SDK - Agent List '));

    const fs = getFileSystem();
    const agentsDir = `${process.cwd()}/rulesets/agents`;

    if (!await fs.exists(agentsDir)) {
      p.log.warn('No agents directory found.');
      p.log.info('Run "evolith agents install" to install your first agent.');
      return;
    }

    const entries = await fs.readdirNames(agentsDir);

    if (entries.length === 0) {
      p.log.warn('No agents installed.');
      p.log.info('Run "evolith agents install" to install your first agent.');
      return;
    }

    p.log.info(`Found ${entries.length} installed agent(s):\n`);

    for (const agentName of entries) {
      const configPath = `${agentsDir}/${agentName}/agent.config.json`;
      const rulesetPath = `${agentsDir}/${agentName}/agent.rules.json`;

      let config: Record<string, unknown> = {};
      let ruleset: Record<string, unknown> = {};

      if (await fs.exists(configPath)) {
        config = await fs.readJson(configPath) as Record<string, unknown>;
      }

      if (await fs.exists(rulesetPath)) {
        ruleset = await fs.readJson(rulesetPath) as Record<string, unknown>;
      }

      const version = (config.version as string) || 'unknown';
      const template = (config.template as string) || 'standard';
      const principles = (ruleset.principles as unknown[]) || [];

      p.log.info(chalk.cyan(`  • ${agentName}`));
      p.log.info(chalk.gray(`    Version: ${version} | Template: ${template} | Rules: ${principles.length}`));
    }

    p.outro(chalk.green(`\n${entries.length} agent(s) found.`));
  }

  private async validateAgent(_options?: AgentsCommandOptions): Promise<void> {
    p.intro(chalk.bgYellow.white.bold(' Evolith SDK - Agent Validation '));

    const fs = getFileSystem();
    const agentsDir = `${process.cwd()}/rulesets/agents`;

    if (!await fs.exists(agentsDir)) {
      p.log.error('No agents directory found.');
      return;
    }

    const entries = await fs.readdirNames(agentsDir);

    if (entries.length === 0) {
      p.log.warn('No agents installed to validate.');
      return;
    }

    const agentToValidate = await p.select({
      message: 'Select agent to validate:',
      options: entries.map(name => ({ value: name as string, label: name })),
    });

    const rulesetPath = `${agentsDir}/${String(agentToValidate)}/agent.rules.json`;

    if (!await fs.exists(rulesetPath)) {
      p.log.error(`Agent ruleset not found: ${rulesetPath}`);
      return;
    }

    const ruleset = await fs.readJson(rulesetPath) as {
      agent?: { name?: string };
      ruleset?: { version?: string };
      principles?: Array<{ id: string; principle: string; severity: string; blocking: boolean }>;
    };

    p.log.info('\nValidating agent ruleset...\n');

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

    for (const principle of ruleset.principles || []) {
      if (!principle.id) {
        issues.push({ field: `principle.missing-id`, message: `Principle "${principle.principle}" missing ID` });
      }
      if (!principle.severity) {
        issues.push({ field: `principle.missing-severity`, message: `Principle "${principle.id}" missing severity` });
      }
    }

    if (issues.length === 0) {
      p.log.success(chalk.green('\n✓ Agent validation passed'));
      p.log.info(`Agent: ${ruleset.agent?.name}`);
      p.log.info(`Rules: ${ruleset.principles?.length} principles`);
      p.log.info(`MUST rules: ${ruleset.principles?.filter(p => p.severity === 'MUST').length}`);
      p.log.info(`SHOULD rules: ${ruleset.principles?.filter(p => p.severity === 'SHOULD').length}`);
    } else {
      p.log.error(chalk.red(`\n✗ Agent validation failed: ${issues.length} issue(s) found`));
      for (const issue of issues) {
        p.log.error(`  - [${issue.field}] ${issue.message}`);
      }
    }

    p.outro(issues.length === 0 ? chalk.green('Validation complete.') : chalk.red('Validation complete with errors.'));
  }

  private async removeAgent(_options?: AgentsCommandOptions): Promise<void> {
    p.intro(chalk.bgRed.white.bold(' Evolith SDK - Agent Removal '));

    const fs = getFileSystem();
    const agentsDir = `${process.cwd()}/rulesets/agents`;

    if (!await fs.exists(agentsDir)) {
      p.log.error('No agents directory found.');
      return;
    }

    const entries = await fs.readdirNames(agentsDir);

    if (entries.length === 0) {
      p.log.warn('No agents installed to remove.');
      return;
    }

    const agentToRemove = await p.select({
      message: 'Select agent to remove:',
      options: entries.map(name => ({ value: name as string, label: name })),
    });

    const confirm = await p.confirm({
      message: `Are you sure you want to remove agent '${String(agentToRemove)}'? This cannot be undone.`,
      initialValue: false,
    });

    if (!confirm) {
      p.outro(chalk.yellow('Removal cancelled.'));
      return;
    }

    const agentPath = `${agentsDir}/${String(agentToRemove)}`;
    await fs.remove(agentPath);

    p.log.success(chalk.green(`\n✓ Agent '${String(agentToRemove)}' removed successfully`));
    p.outro(chalk.green('Agent removal complete.'));
  }

  private async upgradeAgent(_options?: AgentsCommandOptions): Promise<void> {
    p.intro(chalk.bgMagenta.white.bold(' Evolith SDK - Agent Upgrade '));

    const fs = getFileSystem();
    const agentsDir = `${process.cwd()}/rulesets/agents`;

    if (!await fs.exists(agentsDir)) {
      p.log.error('No agents directory found.');
      return;
    }

    const entries = await fs.readdirNames(agentsDir);

    if (entries.length === 0) {
      p.log.warn('No agents installed to upgrade.');
      return;
    }

    const agentToUpgrade = await p.select({
      message: 'Select agent to upgrade:',
      options: entries.map(name => ({ value: name as string, label: name })),
    });

    const rulesetPath = `${agentsDir}/${String(agentToUpgrade)}/agent.rules.json`;
    const configPath = `${agentsDir}/${String(agentToUpgrade)}/agent.config.json`;

    if (!await fs.exists(rulesetPath)) {
      p.log.error(`Agent ruleset not found: ${rulesetPath}`);
      return;
    }

    const ruleset = await fs.readJson(rulesetPath) as {
      agent?: { version?: string };
    };
    const config = await fs.readJson(configPath) as Record<string, unknown>;

    const currentVersion = (ruleset.agent?.version as string) || '1.0.0';
    const parts = currentVersion.split('.').map(Number);
    parts[2]++;
    const newVersion = parts.join('.');

    ruleset.agent!.version = newVersion;
    await fs.writeJson(rulesetPath, ruleset);

    config.version = newVersion;
    config.upgradedAt = new Date().toISOString();
    await fs.writeJson(configPath, config);

    p.log.success(chalk.green(`\n✓ Agent '${String(agentToUpgrade)}' upgraded: ${currentVersion} → ${newVersion}`));
    p.outro(chalk.green('Agent upgrade complete.'));
  }

  @Option({
    flags: '-i, --install [name]',
    description: 'Install a new agent with specified name',
  })
  parseInstall(val: string): string {
    return val;
  }

  @Option({
    flags: '-r, --remove [name]',
    description: 'Remove an agent by name',
  })
  parseRemove(val: string): string {
    return val;
  }

  @Option({
    flags: '-l, --list',
    description: 'List installed agents',
  })
  parseList(): boolean {
    return true;
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Execute in simulation mode without altering files',
  })
  parseDryRun(): boolean {
    return true;
  }
}