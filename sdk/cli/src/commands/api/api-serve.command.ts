import { Command, Option } from 'nest-commander';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api.module';
import chalk from 'chalk';

interface ApiServeOptions {
  port?: number;
}

@Command({
  name: 'api',
  description: 'Start Evolith Core API Server for external integrations (e.g. Tracker Chatbox)',
})
export class ApiServeCommand extends BaseEvolithCommand {
  constructor() {
    super('ApiServeCommand');
  }

  async executeCommand(passedParam: string[], options?: ApiServeOptions): Promise<void> {
    const port = options?.port || parseInt(process.env.PORT || '3000', 10);
    
    this.promptService.showIntro('Evolith SDK - API Server');
    this.logger.log(`Bootstrapping NestJS API on port ${port}...`);

    try {
      const app = await NestFactory.create(ApiModule);
      app.enableCors(); // Importante para permitir conexión desde el frontend Tracker
      await app.listen(port);
      this.promptService.showInfo(chalk.green(`API Server running on http://localhost:${port}`));
      
      // Mantenemos el proceso vivo
      await new Promise(() => {}); 
    } catch (error: any) {
      this.logger.error(`Failed to start API server: ${error.message}`);
      this.promptService.showError('Could not start API server.');
    }
  }

  @Option({
    flags: '-p, --port <number>',
    description: 'HTTP server port (default: 3000)',
  })
  parsePort(val: string): number {
    return parseInt(val, 10) || 3000;
  }
}
