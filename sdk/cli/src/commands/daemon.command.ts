import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { WatcherService } from '../daemon/watcher.service';
import { McpServerService } from '../daemon/mcp-server.service';

@Command({
  name: 'daemon',
  description: 'Inicia el servidor en segundo plano para integración IDE y Watcher',
})
export class DaemonCommand extends CommandRunner {
  private readonly logger = new Logger(DaemonCommand.name);

  constructor(
    private readonly watcherService: WatcherService,
    private readonly mcpServer: McpServerService,
  ) {
    super();
  }

  async run(passedParam: string[]): Promise<void> {
    const action = passedParam[0] || 'start';

    if (action === 'start') {
      p.intro(chalk.bgMagenta.white.bold(' Evolith SDK Daemon '));
      this.logger.log('Arrancando servicios en background...');
      
      this.watcherService.startWatching();
      // El MCP Server se arranca solo por el ciclo de vida OnModuleInit

      p.log.info('El Daemon está corriendo. Presiona Ctrl+C para detenerlo.');

      // Mantener el proceso vivo
      return new Promise(() => {});
    } else {
      this.logger.warn(`Acción daemon desconocida: ${action}`);
    }
  }
}
