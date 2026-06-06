import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';
import chalk from 'chalk';
import { startMcpServer, McpTransport } from '../../core/mcp/server';
import { RulesetValidatorService } from '../../core/validators/ruleset-validator.service';

interface McpServeOptions {
  transport?: McpTransport;
  port?: number;
  apiKey?: string;
}

@Command({
  name: 'mcp',
  description: 'Start Evolith MCP server for AI agent integration',
})
export class McpServeCommand extends CommandRunner {
  private readonly logger = new Logger(McpServeCommand.name);

  async run(passedParam: string[], options?: McpServeOptions): Promise<void> {
    const action = passedParam[0] || 'serve';

    if (action === 'serve') {
      const transport = options?.transport || 'stdio';
      const port = options?.port || parseInt(process.env.PORT || '3000', 10);
      const apiKey = options?.apiKey || process.env.EVOLITH_API_KEY;

      if (transport === 'http') {
        console.log(chalk.bgMagenta.white.bold(' Evolith SDK - MCP Server (HTTP) '));
        this.logger.log(`Starting MCP server over HTTP on port ${port}...`);
        if (apiKey) {
          console.log(chalk.cyan('API key authentication enabled'));
        }
      } else {
        console.log(chalk.bgMagenta.white.bold(' Evolith SDK - MCP Server (stdio) '));
        this.logger.log('Starting MCP server over stdio...');
      }

      const validator = new RulesetValidatorService();
      await startMcpServer({
        rulesetValidator: validator,
        transport,
        port,
        apiKey,
      } as any);

      return;
    } else if (action === 'version') {
      console.log('Evolith MCP Server v1.0.0');
      return;
    } else {
      this.logger.warn(`Unknown MCP action: ${action}`);
      console.log(`Unknown action: ${action}. Use 'evolith mcp serve' to start the server.`);
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
}