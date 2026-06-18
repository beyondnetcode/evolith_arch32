import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';

interface ApiCommandOptions {
  list?: boolean;
  inspect?: string;
  category?: string;
}

@Command({
  name: 'api',
  description: 'Browse and inspect the Evolith API surface (MCP tools, resources, schemas)',
})
export class ApiCommand extends BaseEvolithCommand {
  constructor(
    promptService?: PromptService,
    configService?: ConfigService,
  ) {
    super('ApiCommand', promptService, configService);
  }

  async executeCommand(passedParam: string[], options?: ApiCommandOptions): Promise<void> {
    if (options?.inspect) {
      await this.inspectOperation(options.inspect);
      return;
    }

    if (options?.list) {
      await this.listOperations(options.category);
      return;
    }

    await this.showHelp();
  }

  private async listOperations(category?: string): Promise<void> {
    this.promptService.showIntro('Evolith API Surface');

    const categories = [
      { name: 'tools', label: 'MCP Tools', description: '23 available operations' },
      { name: 'resources', label: 'MCP Resources', description: '8 available resources' },
      { name: 'schemas', label: 'Phase-Gate Schemas', description: '18 validation schemas' },
      { name: 'commands', label: 'CLI Commands', description: '21 native commands' },
    ];

    if (category) {
      const cat = categories.find(c => c.name === category);
      if (cat) {
        await this.listCategory(cat.name);
      } else {
        this.promptService.showError(`Unknown category: ${category}`);
        this.promptService.showInfo('Available categories: tools, resources, schemas, commands');
      }
      return;
    }

    this.promptService.showInfo(chalk.bold('\n📦 Available API Surface\n'));

    for (const cat of categories) {
      this.promptService.showInfo(`  ${chalk.cyan(cat.name.padEnd(12))} ${cat.label} - ${cat.description}`);
    }

    this.promptService.showInfo(chalk.bold('\n📖 Usage'));
    this.promptService.showInfo('  evolith api --list                    List all categories');
    this.promptService.showInfo('  evolith api --list --category tools   List MCP tools');
    this.promptService.showInfo('  evolith api --inspect <name>          Inspect specific operation');
    this.promptService.showInfo('  evolith api --inspect gate-evaluate   Example: inspect gate-evaluate tool');
  }

  private async listCategory(categoryName: string): Promise<void> {
    switch (categoryName) {
      case 'tools':
        await this.listTools();
        break;
      case 'resources':
        await this.listResources();
        break;
      case 'schemas':
        await this.listSchemas();
        break;
      case 'commands':
        await this.listCommands();
        break;
      default:
        this.promptService.showError(`Unknown category: ${categoryName}`);
    }
  }

  private async listTools(): Promise<void> {
    const tools = [
      { name: 'agent-create', description: 'Create a new agent configuration' },
      { name: 'agent-list', description: 'List all configured agents' },
      { name: 'agent-validate', description: 'Validate agent configuration' },
      { name: 'architecture-drift', description: 'Detect architecture pattern drift' },
      { name: 'architecture-scaffold', description: 'Scaffold architecture patterns' },
      { name: 'gate-evaluate', description: 'Evaluate phase gate compliance' },
      { name: 'gate-status', description: 'Get current gate status for project' },
      { name: 'moscow-analyze', description: 'Run MoSCoW prioritization analysis' },
      { name: 'moscow-export', description: 'Export MoSCoW analysis results' },
      { name: 'sdlc-phase', description: 'Get current SDLC phase' },
      { name: 'sdlc-advance', description: 'Advance to next SDLC phase' },
      { name: 'validate-artifacts', description: 'Validate project artifacts' },
      { name: 'validate-structure', description: 'Validate project structure' },
      { name: 'phase-advance-propose', description: 'Propose phase advancement' },
      { name: 'phase-advance-execute', description: 'Execute phase advancement' },
    ];

    this.promptService.showInfo(chalk.bold('\n🔧 MCP Tools (15 of 23)\n'));
    for (const tool of tools) {
      this.promptService.showInfo(`  ${chalk.green('●')} ${chalk.cyan(tool.name.padEnd(25))} ${tool.description}`);
    }
    this.promptService.showInfo(chalk.dim('\n  Use --inspect <tool-name> for detailed schema'));
    this.promptService.showInfo(chalk.dim('  Run "evolith mcp serve" to start MCP server'));
  }

  private async listResources(): Promise<void> {
    const resources = [
      { uri: 'evolith://rulesets', name: 'Rulesets', description: 'List of all available rulesets' },
      { uri: 'evolith://phase-gates', name: 'Phase Gates', description: 'Phase gate definitions' },
      { uri: 'evolith://agents', name: 'Agents', description: 'List of installed Evolith agents' },
      { uri: 'evolith://core/info', name: 'Core Info', description: 'General Evolith Core information' },
      { uri: 'evolith://governance/version', name: 'Governance Version', description: 'Current governance schema version' },
      { uri: 'evolith://core/version', name: 'Core Version', description: 'Current Core schema version' },
      { uri: 'evolith://repository/config', name: 'Repository Config', description: 'Repository evolith.yaml content' },
      { uri: 'evolith://moscow/phase-0', name: 'MoSCoW Phase 0', description: 'MoSCoW prioritization matrix' },
    ];

    this.promptService.showInfo(chalk.bold('\n📋 MCP Resources (8)\n'));
    for (const res of resources) {
      this.promptService.showInfo(`  ${chalk.green('●')} ${chalk.cyan(res.name.padEnd(20))} ${chalk.dim(res.uri)}`);
      this.promptService.showInfo(`    ${res.description}`);
    }
    this.promptService.showInfo(chalk.dim('\n  Use --inspect <resource-uri> for detailed schema'));
  }

  private async listSchemas(): Promise<void> {
    const schemas = [
      { name: 'gate-evidence', description: 'Schema for gate evaluation evidence' },
      { name: 'phase-transition', description: 'Schema for phase transition requests' },
      { name: 'adr-record', description: 'Schema for Architecture Decision Records' },
      { name: 'ruleset-schema', description: 'Base schema for ruleset definitions' },
      { name: 'acl-schema', description: 'Anti-Corruption Layer validation schema' },
      { name: 'build-vs-compose', description: 'Build vs Compose evidence validation' },
      { name: 'moscow-matrix', description: 'MoSCoW prioritization matrix schema' },
      { name: 'agent-config', description: 'Agent configuration schema' },
    ];

    this.promptService.showInfo(chalk.bold('\n📐 Phase-Gate Schemas (8 of 18)\n'));
    for (const schema of schemas) {
      this.promptService.showInfo(`  ${chalk.green('●')} ${chalk.cyan(schema.name.padEnd(20))} ${schema.description}`);
    }
    this.promptService.showInfo(chalk.dim('\n  Use --inspect <schema-name> for detailed structure'));
  }

  private async listCommands(): Promise<void> {
    const commands = [
      { name: 'init', description: 'Initialize new Evolith project' },
      { name: 'validate', description: 'Validate project against governance' },
      { name: 'gate', description: 'Phase gate evaluation and status' },
      { name: 'sdlc', description: 'SDLC phase management' },
      { name: 'adr', description: 'ADR registry and management' },
      { name: 'docs', description: 'Documentation scaffolding' },
      { name: 'scaffold', description: 'Architecture pattern scaffolding' },
      { name: 'drift', description: 'Architecture drift detection' },
      { name: 'completion', description: 'Shell completion and hooks' },
      { name: 'fixtures', description: 'Generate test fixtures' },
      { name: 'history', description: 'Project history and DORA metrics' },
      { name: 'profile', description: 'CLI configuration profiles' },
      { name: 'upgrade', description: 'Upgrade Evolith project' },
      { name: 'api', description: 'Browse API surface (this command)' },
    ];

    this.promptService.showInfo(chalk.bold('\n⌨️  CLI Commands (14 of 21)\n'));
    for (const cmd of commands) {
      this.promptService.showInfo(`  ${chalk.green('●')} ${chalk.cyan(cmd.name.padEnd(15))} ${cmd.description}`);
    }
    this.promptService.showInfo(chalk.dim('\n  Use --inspect <command-name> for detailed options'));
  }

  private async inspectOperation(operationName: string): Promise<void> {
    this.promptService.showIntro(`Inspecting: ${operationName}`);

    const toolSchemas: Record<string, { description: string; inputSchema: object; outputSchema: object }> = {
      'gate-evaluate': {
        description: 'Evaluate phase gate compliance for a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'Path to project root' },
            phase: { type: 'string', enum: ['phase-0', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'phase-5'] },
            strict: { type: 'boolean', description: 'Fail on warnings vs errors', default: false },
          },
          required: ['projectPath', 'phase'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            passed: { type: 'boolean' },
            gateId: { type: 'string' },
            phase: { type: 'string' },
            evidenceResults: { type: 'array' },
            blockingChecks: { type: 'array' },
          },
        },
      },
      'validate-artifacts': {
        description: 'Validate that required project artifacts exist',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: { type: 'string' },
            artifactPattern: { type: 'string', description: 'Glob pattern for artifacts' },
          },
          required: ['projectPath'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            missing: { type: 'array', items: { type: 'string' } },
            found: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      'agent-create': {
        description: 'Create a new agent configuration in rulesets/agents/',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Agent name (kebab-case)' },
            type: { type: 'string', enum: ['coding', 'review', 'security', 'architecture'] },
            capabilities: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'type'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            created: { type: 'boolean' },
            path: { type: 'string' },
            agentConfig: { type: 'object' },
          },
        },
      },
    };

    const resourceSchemas: Record<string, { description: string; mimeType: string }> = {
      'evolith://rulesets': {
        description: 'List of all available rulesets in Evolith Core',
        mimeType: 'application/json',
      },
      'evolith://phase-gates': {
        description: 'Phase gate definitions and requirements',
        mimeType: 'application/json',
      },
      'evolith://core/info': {
        description: 'General information about the Evolith Core',
        mimeType: 'application/json',
      },
    };

    const commandSchemas: Record<string, { description: string; options: Array<{ flags: string; description: string }> }> = {
      'init': {
        description: 'Initialize a new Evolith project',
        options: [
          { flags: '-n, --name <name>', description: 'Project name' },
          { flags: '-t, --type <type>', description: 'Project type (library, app, api)' },
          { flags: '-r, --runtime <runtime>', description: 'Runtime (nodejs, dotnet, python)' },
          { flags: '--dry-run', description: 'Show what would be created' },
        ],
      },
      'validate': {
        description: 'Validate project against governance rules',
        options: [
          { flags: '--ruleset <name>', description: 'Specific ruleset to validate against' },
          { flags: '--strict', description: 'Fail on warnings' },
          { flags: '--report', description: 'Output validation report' },
        ],
      },
      'gate': {
        description: 'Phase gate evaluation and status commands',
        options: [
          { flags: 'evaluate', description: 'Evaluate gate compliance' },
          { flags: 'status', description: 'Show current gate status' },
          { flags: '--phase <phase>', description: 'Specific phase to evaluate' },
        ],
      },
    };

    if (toolSchemas[operationName]) {
      const schema = toolSchemas[operationName];
      this.promptService.showInfo(chalk.bold('\n🔧 MCP Tool Schema\n'));
      this.promptService.showInfo(`  Description: ${schema.description}`);
      this.promptService.showInfo(chalk.bold('\n📥 Input Schema:'));
      this.promptService.showInfo(JSON.stringify(schema.inputSchema, null, 2));
      this.promptService.showInfo(chalk.bold('\n📤 Output Schema:'));
      this.promptService.showInfo(JSON.stringify(schema.outputSchema, null, 2));
    } else if (resourceSchemas[operationName]) {
      const schema = resourceSchemas[operationName];
      this.promptService.showInfo(chalk.bold('\n📋 MCP Resource Schema\n'));
      this.promptService.showInfo(`  Description: ${schema.description}`);
      this.promptService.showInfo(`  MIME Type: ${schema.mimeType}`);
    } else if (commandSchemas[operationName]) {
      const schema = commandSchemas[operationName];
      this.promptService.showInfo(chalk.bold('\n⌨️ CLI Command Schema\n'));
      this.promptService.showInfo(`  Description: ${schema.description}`);
      this.promptService.showInfo(chalk.bold('\n⚙️ Options:'));
      for (const opt of schema.options) {
        this.promptService.showInfo(`  ${chalk.cyan(opt.flags.padEnd(25))} ${opt.description}`);
      }
    } else {
      this.promptService.showError(`Unknown operation: ${operationName}`);
      this.promptService.showInfo('Try one of:');
      this.promptService.showInfo('  Tools: gate-evaluate, validate-artifacts, agent-create');
      this.promptService.showInfo('  Resources: evolith://rulesets, evolith://phase-gates, evolith://core/info');
      this.promptService.showInfo('  Commands: init, validate, gate');
    }
  }

  private async showHelp(): Promise<void> {
    this.promptService.showIntro('Evolith API Browser');
    this.promptService.showInfo('Browse and inspect the Evolith API surface.\n');

    this.promptService.showInfo(chalk.bold('Usage:'));
    this.promptService.showInfo('  evolith api --list                    List all API categories');
    this.promptService.showInfo('  evolith api --list --category tools   List MCP tools');
    this.promptService.showInfo('  evolith api --inspect <name>          Inspect specific operation');
    this.promptService.showInfo('  evolith api --inspect gate-evaluate   Example: inspect a tool');
    this.promptService.showInfo('  evolith api --inspect init            Example: inspect a command\n');

    this.promptService.showInfo(chalk.bold('Categories:'));
    this.promptService.showInfo('  tools     - MCP tools (JSON-RPC operations)');
    this.promptService.showInfo('  resources - MCP resources (read-only data)');
    this.promptService.showInfo('  schemas   - Phase-gate validation schemas');
    this.promptService.showInfo('  commands  - CLI native commands\n');

    this.promptService.showInfo(chalk.bold('Examples:'));
    this.promptService.showInfo('  evolith api --list --category tools');
    this.promptService.showInfo('  evolith api --inspect gate-evaluate');
    this.promptService.showInfo('  evolith api --inspect evolith://rulesets');
    this.promptService.showInfo('  evolith api --inspect init');
  }

  @Option({
    flags: '-l, --list',
    description: 'List available API operations',
  })
  parseList(): boolean {
    return true;
  }

  @Option({
    flags: '-i, --inspect <name>',
    description: 'Inspect a specific operation, resource, or command',
  })
  parseInspect(val: string): string {
    return val;
  }

  @Option({
    flags: '-c, --category <category>',
    description: 'Filter by category (tools, resources, schemas, commands)',
  })
  parseCategory(val: string): string {
    return val;
  }
}