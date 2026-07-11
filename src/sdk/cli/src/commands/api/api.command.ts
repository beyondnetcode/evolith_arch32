import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { randomUUID } from 'node:crypto';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';
import { createSuccessEnvelope, createErrorEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import {
  CATEGORIES, TOOLS, RESOURCES, SCHEMAS, COMMANDS,
  TOOL_SCHEMAS, RESOURCE_SCHEMAS, COMMAND_SCHEMAS,
} from './api.catalog';

interface ApiCommandOptions {
  list?: boolean;
  inspect?: string;
  category?: string;
  format?: string;
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
    const json = options?.format === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith api',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
      startedAt,
    };

    try {
      if (options?.inspect) return this.inspectOperation(options.inspect, json, meta);
      if (options?.list) return this.listOperations(options.category, json, meta);
      return this.showHelp(json, meta);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
      } else {
        throw error;
      }
    }
  }

  private async listOperations(category?: string, json = false, meta?: any): Promise<void> {
    if (json) {
      if (category) {
        const cat = CATEGORIES.find(c => c.name === category);
        if (!cat) {
          process.exitCode = 1;
          console.log(JSON.stringify(createErrorEnvelope('VALIDATION_FAILED', `Unknown category: ${category}`, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
          return;
        }
        const result = this.getCategoryData(cat.name);
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        console.log(JSON.stringify(createSuccessEnvelope({ categories: CATEGORIES }, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      }
      return;
    }

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

  private async inspectOperation(operationName: string, json = false, meta?: any): Promise<void> {
    if (TOOL_SCHEMAS[operationName]) {
      const schema = TOOL_SCHEMAS[operationName];
      if (json) {
        const result = {
          type: 'tool',
          name: operationName,
          description: schema.description,
          inputSchema: schema.inputSchema,
          outputSchema: schema.outputSchema,
        };
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.showIntro(`Inspecting: ${operationName}`);
        this.promptService.showInfo(chalk.bold('\n🔧 MCP Tool Schema\n'));
        this.promptService.showInfo(`  Description: ${schema.description}`);
        this.promptService.showInfo(chalk.bold('\n📥 Input Schema:'));
        this.promptService.showInfo(JSON.stringify(schema.inputSchema, null, 2));
        this.promptService.showInfo(chalk.bold('\n📤 Output Schema:'));
        this.promptService.showInfo(JSON.stringify(schema.outputSchema, null, 2));
      }
      return;
    }
    if (RESOURCE_SCHEMAS[operationName]) {
      const schema = RESOURCE_SCHEMAS[operationName];
      if (json) {
        const result = {
          type: 'resource',
          name: operationName,
          description: schema.description,
          mimeType: schema.mimeType,
        };
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.showIntro(`Inspecting: ${operationName}`);
        this.promptService.showInfo(chalk.bold('\n📋 MCP Resource Schema\n'));
        this.promptService.showInfo(`  Description: ${schema.description}`);
        this.promptService.showInfo(`  MIME Type: ${schema.mimeType}`);
      }
      return;
    }
    if (COMMAND_SCHEMAS[operationName]) {
      const schema = COMMAND_SCHEMAS[operationName];
      if (json) {
        const result = {
          type: 'command',
          name: operationName,
          description: schema.description,
          options: schema.options,
        };
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      } else {
        this.promptService.showIntro(`Inspecting: ${operationName}`);
        this.promptService.showInfo(chalk.bold('\n⌨️ CLI Command Schema\n'));
        this.promptService.showInfo(`  Description: ${schema.description}`);
        this.promptService.showInfo(chalk.bold('\n⚙️ Options:'));
        for (const opt of schema.options) {
          this.promptService.showInfo(`  ${chalk.cyan(opt.flags.padEnd(25))} ${opt.description}`);
        }
      }
      return;
    }

    const message = `Unknown operation: ${operationName}`;
    if (json) {
      process.exitCode = 1;
      console.log(JSON.stringify(createErrorEnvelope('VALIDATION_FAILED', message, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
    } else {
      this.promptService.showError(message);
      this.promptService.showInfo('Try one of:');
      this.promptService.showInfo('  Tools: gate-evaluate, validate-artifacts, agent-create');
      this.promptService.showInfo('  Resources: evolith://rulesets, evolith://phase-gates, evolith://core/info');
      this.promptService.showInfo('  Commands: init, validate, gate');
    }
  }

  private async showHelp(json = false, meta?: any): Promise<void> {
    if (json) {
      const result = { categories: CATEGORIES };
      console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - meta.startedAt }), null, 2));
      return;
    }

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

  private getCategoryData(categoryName: string): any {
    switch (categoryName) {
      case 'tools':
        return { category: 'tools', items: TOOLS, count: TOOLS.length };
      case 'resources':
        return { category: 'resources', items: RESOURCES, count: RESOURCES.length };
      case 'schemas':
        return { category: 'schemas', items: SCHEMAS, count: SCHEMAS.length };
      case 'commands':
        return { category: 'commands', items: COMMANDS, count: COMMANDS.length };
      default:
        return { category: categoryName, items: [], count: 0 };
    }
  }

  @Option({ flags: '-l, --list', description: 'List available API operations' })
  parseList(): boolean { return true; }

  @Option({ flags: '-i, --inspect <name>', description: 'Inspect a specific operation, resource, or command' })
  parseInspect(val: string): string { return val; }

  @Option({ flags: '-c, --category <category>', description: 'Filter by category (tools, resources, schemas, commands)' })
  parseCategory(val: string): string { return val; }

  @Option({
    flags: '-f, --format [string]',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string { return val; }
}
