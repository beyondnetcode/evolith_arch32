import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { startMcpServer, McpTransport } from '../../infrastructure/mcp/server';
import { RulesetValidatorService } from '@evolith/core-domain/application/validators/ruleset-validator.service';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';

interface McpServeOptions {
  transport?: McpTransport;
  port?: number;
  apiKey?: string;
  noConfirm?: boolean;
}

@Command({
  name: 'mcp',
  description: 'Start Evolith MCP server for AI agent integration',
})
export class McpServeCommand extends BaseEvolithCommand {
  constructor(private readonly validator: RulesetValidatorService) {
    super('McpServeCommand');
  }

  async executeCommand(passedParam: string[], options?: McpServeOptions): Promise<void> {
    const action = passedParam[0] || 'serve';

    if (action === 'serve') {
      const transport = options?.transport || 'stdio';
      const port = options?.port || parseInt(process.env.PORT || '3000', 10);
      const apiKey = options?.apiKey || process.env.EVOLITH_API_KEY;
      const noConfirm = options?.noConfirm ?? false;

      if (transport === 'http') {
        this.promptService.showIntro('Evolith SDK - MCP Server (HTTP)');
        this.logger.log(`Starting MCP server over HTTP on port ${port}...`);
        if (apiKey) {
          this.promptService.showInfo(chalk.cyan('API key authentication enabled'));
        }
        if (noConfirm) {
          this.promptService.showWarning(chalk.yellow('Confirmation prompts disabled (--no-confirm)'));
        }
      } else {
        this.promptService.showIntro('Evolith SDK - MCP Server (stdio)');
        this.logger.log('Starting MCP server over stdio...');
        if (noConfirm) {
          this.promptService.showWarning(chalk.yellow('Confirmation prompts disabled (--no-confirm)'));
        }
      }

      const validator = this.validator;
      await startMcpServer({
        rulesetValidator: validator,
        transport,
        port,
        apiKey,
        noConfirm,
      });

      return;
    } else if (action === 'version') {
      this.promptService.showInfo('Evolith MCP Server v1.0.0');
      return;
    } else {
      this.logger.warn(`Unknown MCP action: ${action}`);
      this.promptService.showError(`Unknown action: ${action}. Use 'evolith mcp serve' to start the server.`);
    }
  }

  @Option({
    flags: '-t, --transport <stdio|http>',
    description: 'Transport type: stdio (default) or http',
  })
  parseTransport(val: string): McpTransport {
    return val as McpTransport;
  }

  @Option({
    flags: '-p, --port <number>',
    description: 'HTTP server port (default: 3000)',
  })
  parsePort(val: string): number {
    return parseInt(val, 10) || 3000;
  }

  @Option({
    flags: '--api-key <key>',
    description: 'API key for authentication',
  })
  parseApiKey(val: string): string {
    return val;
  }

  @Option({
    flags: '--no-confirm',
    description: 'Skip interactive confirmation prompts for mutative operations (CI/automation mode)',
  })
  parseNoConfirm(): boolean {
    return true;
  }
}
