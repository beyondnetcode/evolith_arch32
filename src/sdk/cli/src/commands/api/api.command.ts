import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';
import {
  CATEGORIES, TOOLS, RESOURCES, SCHEMAS, COMMANDS,
  TOOL_SCHEMAS, RESOURCE_SCHEMAS, COMMAND_SCHEMAS,
} from './api.catalog';

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
  constructor(promptService?: PromptService, configService?: ConfigService) {
    super('ApiCommand', promptService, configService);
  }

  async executeCommand(passedParam: string[], options?: ApiCommandOptions): Promise<void> {
    if (options?.inspect) return this.inspectOperation(options.inspect);
    if (options?.list) return this.listOperations(options.category);
    return this.showHelp();
  }

  private async listOperations(category?: string): Promise<void> {
    this.promptService.showIntro('Evolith API Surface');

    if (category) {
      const cat = CATEGORIES.find(c => c.name === category);
      if (cat) return this.listCategory(cat.name);
      this.promptService.showError(`Unknown category: ${category}`);
      this.promptService.showInfo('Available categories: tools, resources, schemas, commands');
      return;
    }

    this.promptService.showInfo(chalk.bold('\n📦 Available API Surface\n'));
    for (const cat of CATEGORIES) {
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
      case 'tools': return this.printEntries(`🔧 MCP Tools (${TOOLS.length})`, TOOLS, 28, '\n  Use --inspect <tool-name> for detailed schema\n  Run "evolith-mcp serve" to start the MCP server');
      case 'schemas': return this.printEntries(`📐 Phase-Gate Schemas (${SCHEMAS.length})`, SCHEMAS, 20, '\n  Use --inspect <schema-name> for detailed structure');
      case 'commands': return this.printEntries(`⌨️  CLI Commands (${COMMANDS.length})`, COMMANDS, 15, '\n  Use --inspect <command-name> for detailed options');
      case 'resources':
        this.promptService.showInfo(chalk.bold(`\n📋 MCP Resources (${RESOURCES.length})\n`));
        for (const res of RESOURCES) {
          this.promptService.showInfo(`  ${chalk.green('●')} ${chalk.cyan(res.name.padEnd(20))} ${chalk.dim(res.uri)}`);
          this.promptService.showInfo(`    ${res.description}`);
        }
        this.promptService.showInfo(chalk.dim('\n  Use --inspect <resource-uri> for detailed schema'));
        return;
      default:
        this.promptService.showError(`Unknown category: ${categoryName}`);
    }
  }

  private printEntries(header: string, entries: Array<{ name: string; description: string }>, pad: number, footer: string): void {
    this.promptService.showInfo(chalk.bold(`\n${header}\n`));
    for (const e of entries) {
      this.promptService.showInfo(`  ${chalk.green('●')} ${chalk.cyan(e.name.padEnd(pad))} ${e.description}`);
    }
    this.promptService.showInfo(chalk.dim(footer));
  }

  private async inspectOperation(operationName: string): Promise<void> {
    this.promptService.showIntro(`Inspecting: ${operationName}`);

    if (TOOL_SCHEMAS[operationName]) {
      const schema = TOOL_SCHEMAS[operationName];
      this.promptService.showInfo(chalk.bold('\n🔧 MCP Tool Schema\n'));
      this.promptService.showInfo(`  Description: ${schema.description}`);
      this.promptService.showInfo(chalk.bold('\n📥 Input Schema:'));
      this.promptService.showInfo(JSON.stringify(schema.inputSchema, null, 2));
      this.promptService.showInfo(chalk.bold('\n📤 Output Schema:'));
      this.promptService.showInfo(JSON.stringify(schema.outputSchema, null, 2));
      return;
    }
    if (RESOURCE_SCHEMAS[operationName]) {
      const schema = RESOURCE_SCHEMAS[operationName];
      this.promptService.showInfo(chalk.bold('\n📋 MCP Resource Schema\n'));
      this.promptService.showInfo(`  Description: ${schema.description}`);
      this.promptService.showInfo(`  MIME Type: ${schema.mimeType}`);
      return;
    }
    if (COMMAND_SCHEMAS[operationName]) {
      const schema = COMMAND_SCHEMAS[operationName];
      this.promptService.showInfo(chalk.bold('\n⌨️ CLI Command Schema\n'));
      this.promptService.showInfo(`  Description: ${schema.description}`);
      this.promptService.showInfo(chalk.bold('\n⚙️ Options:'));
      for (const opt of schema.options) {
        this.promptService.showInfo(`  ${chalk.cyan(opt.flags.padEnd(25))} ${opt.description}`);
      }
      return;
    }

    this.promptService.showError(`Unknown operation: ${operationName}`);
    this.promptService.showInfo('Try one of:');
    this.promptService.showInfo('  Tools: gate-evaluate, validate-artifacts, agent-create');
    this.promptService.showInfo('  Resources: evolith://rulesets, evolith://phase-gates, evolith://core/info');
    this.promptService.showInfo('  Commands: init, validate, gate');
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

  @Option({ flags: '-l, --list', description: 'List available API operations' })
  parseList(): boolean { return true; }

  @Option({ flags: '-i, --inspect <name>', description: 'Inspect a specific operation, resource, or command' })
  parseInspect(val: string): string { return val; }

  @Option({ flags: '-c, --category <category>', description: 'Filter by category (tools, resources, schemas, commands)' })
  parseCategory(val: string): string { return val; }
}
