import { Command, CommandRunner, Option } from 'nest-commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { getFileSystem, getContainer } from '../../core/mcp/tools/tool-utils';
import { AgentRegistryService, AgentInfo } from '../../domain/services/agent-registry.service';
import { buildAgentRuleset } from '../../core/agents/agent-ruleset-builder';
import { RulesetValidatorService } from '../../core/validators/ruleset-validator.service';

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
  private readonly registry: AgentRegistryService;

  constructor() {
    super();
    this.registry = new AgentRegistryService(getFileSystem());
  }

  async run(passedParam: string[], options?: AgentsCommandOptions): Promise<void> {
    const action = passedParam[0] || 'menu';
    console.clear();

    switch (action) {
      case 'install': await this.installAgent(options); break;
      case 'remove': await this.removeAgent(options); break;
      case 'list': await this.listAgents(options); break;
      case 'validate': await this.validateAgent(options); break;
      case 'upgrade': await this.upgradeAgent(options); break;
      case 'menu':
      default: await this.showMenu(); break;
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
      case 'install': await this.installAgent({}); break;
      case 'list': await this.listAgents({}); break;
      case 'validate': await this.validateAgent({}); break;
      case 'upgrade': await this.upgradeAgent({}); break;
      case 'remove': await this.removeAgent({}); break;
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
      onCancel: () => { p.cancel('Installation cancelled.'); process.exit(0); },
    });

    if (!agentInfo.confirmInstall) {
      p.outro(chalk.yellow('Installation cancelled.'));
      return;
    }

    const rulesetContent = buildAgentRuleset({
      name: agentInfo.name,
      template: agentInfo.template,
      adrs: agentInfo.adrs as string[],
      rulesets: agentInfo.rulesets as string[],
    });

    const config: AgentInfo = {
      name: agentInfo.name,
      version: '1.0.0',
      template: agentInfo.template,
      description: agentInfo.description,
      adrs: agentInfo.adrs as string[],
      rulesets: agentInfo.rulesets as string[],
      rulesetFiles: ['agent.rules.json'],
      installedAt: new Date().toISOString()
    };

    await this.registry.installAgent(process.cwd(), config, rulesetContent);

    p.log.success(chalk.green(`\n✓ Agent '${agentInfo.name}' installed successfully`));
    p.note(`Next steps:\n  1. Review agent rules\n  2. Validate agent: evolith agents validate`, 'Next Steps');
    p.outro(chalk.green('Agent installation complete.'));
  }

  private async listAgents(_options?: AgentsCommandOptions): Promise<void> {
    p.intro(chalk.bgBlue.white.bold(' Evolith SDK - Agent List '));

    const agents = await this.registry.discover(process.cwd());

    if (agents.length === 0) {
      p.log.warn('No agents installed.');
      p.log.info('Run "evolith agents install" to install your first agent.');
      return;
    }

    p.log.info(`Found ${agents.length} installed agent(s):\n`);

    for (const agent of agents) {
      const principlesCount = 0; // We can't read principles count without loading the ruleset JSON directly, skip for simplicity.
      p.log.info(chalk.cyan(`  • ${agent.name}`));
      p.log.info(chalk.gray(`    Version: ${agent.version} | Template: ${agent.template}`));
    }

    p.outro(chalk.green(`\n${agents.length} agent(s) found.`));
  }

  private async validateAgent(_options?: AgentsCommandOptions): Promise<void> {
    p.intro(chalk.bgYellow.white.bold(' Evolith SDK - Agent Validation '));

    const agents = await this.registry.discover(process.cwd());

    if (agents.length === 0) {
      p.log.warn('No agents installed to validate.');
      return;
    }

    const agentToValidate = await p.select({
      message: 'Select agent to validate:',
      options: agents.map(a => ({ value: a.name, label: a.name })),
    });

    p.log.info('\nValidating agent ruleset against engine...\n');
    
    // We will use RulesetValidatorService simply to process the rules via engine
    // or validate its structural schema.
    const fs = getFileSystem();
    const rulesetPath = `${process.cwd()}/rulesets/agents/${String(agentToValidate)}/agent.rules.json`;
    
    if (!await fs.exists(rulesetPath)) {
      p.log.error(`Ruleset file not found: ${rulesetPath}`);
      return;
    }

    const ruleset = await fs.readJson(rulesetPath) as any;
    const issues: Array<{ field: string; message: string }> = [];

    if (!ruleset.agent?.name) issues.push({ field: 'agent.name', message: 'Agent name is required' });
    if (!ruleset.ruleset?.version) issues.push({ field: 'ruleset.version', message: 'Ruleset version is required' });
    if (!ruleset.principles || ruleset.principles.length === 0) issues.push({ field: 'principles', message: 'At least one principle is required' });

    for (const principle of ruleset.principles || []) {
      if (!principle.id) issues.push({ field: `principle.missing-id`, message: `Principle "${principle.principle}" missing ID` });
      if (!principle.severity) issues.push({ field: `principle.missing-severity`, message: `Principle "${principle.id}" missing severity` });
    }

    if (issues.length === 0) {
      await this.registry.updateLastValidated(process.cwd(), String(agentToValidate));
      p.log.success(chalk.green('\n✓ Agent validation passed'));
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

    const agents = await this.registry.discover(process.cwd());

    if (agents.length === 0) {
      p.log.warn('No agents installed to remove.');
      return;
    }

    const agentToRemove = await p.select({
      message: 'Select agent to remove:',
      options: agents.map(a => ({ value: a.name, label: a.name })),
    });

    const confirm = await p.confirm({
      message: `Are you sure you want to remove agent '${String(agentToRemove)}'? This cannot be undone.`,
      initialValue: false,
    });

    if (!confirm) {
      p.outro(chalk.yellow('Removal cancelled.'));
      return;
    }

    await this.registry.unregister(process.cwd(), String(agentToRemove));

    p.log.success(chalk.green(`\n✓ Agent '${String(agentToRemove)}' removed successfully`));
    p.outro(chalk.green('Agent removal complete.'));
  }

  private async upgradeAgent(_options?: AgentsCommandOptions): Promise<void> {
    p.intro(chalk.bgMagenta.white.bold(' Evolith SDK - Agent Upgrade '));

    const agents = await this.registry.discover(process.cwd());

    if (agents.length === 0) {
      p.log.warn('No agents installed to upgrade.');
      return;
    }

    const agentName = await p.select({
      message: 'Select agent to upgrade:',
      options: agents.map(a => ({ value: a.name, label: a.name })),
    });

    const agent = await this.registry.getAgent(process.cwd(), String(agentName));
    if (!agent) return;

    const fs = getFileSystem();
    const rulesetPath = `${process.cwd()}/rulesets/agents/${agent.name}/agent.rules.json`;
    
    if (!await fs.exists(rulesetPath)) {
      p.log.error('Agent ruleset not found');
      return;
    }

    const ruleset = await fs.readJson(rulesetPath) as any;
    
    const parts = agent.version.split('.').map(Number);
    parts[2]++;
    const newVersion = parts.join('.');

    agent.version = newVersion;
    if (ruleset.agent) ruleset.agent.version = newVersion;

    await this.registry.updateAgent(process.cwd(), agent.name, agent, ruleset);

    p.log.success(chalk.green(`\n✓ Agent '${agent.name}' upgraded: ${parts.join('.')} → ${newVersion}`));
    p.outro(chalk.green('Agent upgrade complete.'));
  }

  @Option({ flags: '-i, --install [name]', description: 'Install a new agent' })
  parseInstall(val: string): string { return val; }

  @Option({ flags: '-r, --remove [name]', description: 'Remove an agent' })
  parseRemove(val: string): string { return val; }

  @Option({ flags: '-l, --list', description: 'List installed agents' })
  parseList(): boolean { return true; }

  @Option({ flags: '-d, --dry-run', description: 'Dry run' })
  parseDryRun(): boolean { return true; }
}