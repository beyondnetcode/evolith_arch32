import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { WatcherService } from '../../core/mcp/watcher.service';
import { McpServerService } from '../../core/mcp/mcp-server.service';

@Command({
  name: 'mcp',
  description: 'Inicia el servidor MCP para integración IDE y Watcher',
})
export class McpServeCommand extends CommandRunner {
  private readonly logger = new Logger(McpServeCommand.name);

  constructor(
    private readonly watcherService: WatcherService,
    private readonly mcpServer: McpServerService,
  ) {
    super();
  }

  async run(passedParam: string[]): Promise<void> {
    const action = passedParam[0] || 'serve';

    if (action === 'serve') {
      p.intro(chalk.bgMagenta.white.bold(' Evolith SDK - MCP Serve '));
      this.logger.log('Arrancando servicios en background...');
      
      this.watcherService.startWatching();
      // El MCP Server se arranca solo por el ciclo de vida OnModuleInit

      p.log.info('El servidor MCP está corriendo por stdio. Presiona Ctrl+C para detenerlo.');

      // Mantener el proceso vivo
      return new Promise(() => {});
    } else {
      this.logger.warn(`Acción MCP desconocida: ${action}`);
    }
  }
}
