import { Command, CommandRunner } from 'nest-commander';
import { Logger } from '@nestjs/common';
import chalk from 'chalk';
import { startMcpServer } from '../../core/mcp/server';
import { RulesetValidatorService } from '../../core/validators/ruleset-validator.service';

@Command({
  name: 'mcp',
  description: 'Start Evolith MCP server for AI agent integration via stdio',
})
export class McpServeCommand extends CommandRunner {
  private readonly logger = new Logger(McpServeCommand.name);

  async run(passedParam: string[]): Promise<void> {
    const action = passedParam[0] || 'serve';

    if (action === 'serve') {
      console.log(chalk.bgMagenta.white.bold(' Evolith SDK - MCP Server '));
      this.logger.log('Starting MCP server over stdio...');

      const validator = new RulesetValidatorService();
      await startMcpServer({ rulesetValidator: validator });

      return;
    } else if (action === 'version') {
      console.log('Evolith MCP Server v1.0.0');
      return;
    } else {
      this.logger.warn(`Unknown MCP action: ${action}`);
      console.log(`Unknown action: ${action}. Use 'evolith mcp serve' to start the server.`);
    }
  }
}