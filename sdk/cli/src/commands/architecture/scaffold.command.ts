import { Command, CommandRunner, Option } from 'nest-commander';
import { intro, outro, select, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { WorkspaceManagerStrategy } from '../../core/architecture/workspace-manager.strategy';
import { NxWorkspaceStrategy } from '../../core/architecture/nx-workspace.strategy';

@Command({
  name: 'scaffold',
  description: 'Scaffolds the Evolith Monolithic Modular and Microfrontends architecture in the current workspace',
})
export class ScaffoldCommand extends CommandRunner {
  private strategy: WorkspaceManagerStrategy = new NxWorkspaceStrategy();

  async run(passedParam: string[], options?: Record<string, any>): Promise<void> {
    console.log();
    intro(chalk.bgBlue.white.bold(' Evolith Architecture Scaffolding '));

    let frontendFramework = options?.frontend;
    if (!frontendFramework) {
      frontendFramework = await select({
        message: '¿Qué framework de Frontend utilizarás para los Microfrontends?',
        options: [
          { value: 'react', label: 'React' },
          { value: 'angular', label: 'Angular' },
        ],
      }) as string;
    }

    let orm = options?.orm;
    if (!orm) {
      orm = await select({
        message: '¿Qué ORM usarás para la capa de persistencia compartida?',
        options: [
          { value: 'prisma', label: 'Prisma' },
          { value: 'typeorm', label: 'TypeORM' },
        ],
      }) as string;
    }

    const s = spinner();
    s.start('Iniciando el proceso de andamiaje...');

    try {
      // 1. Instalar dependencias
      s.message('Instalando plugins y dependencias base...');
      await this.strategy.installDependencies(frontendFramework, orm);

      // 2. Generar Backend API
      s.message('Generando la Service API (NestJS)...');
      await this.strategy.generateApiApp('tracker-api');

      // 3. Generar Microfrontends
      s.message(`Generando Microfrontends Host y Remotes (${frontendFramework.toUpperCase()})...`);
      await this.strategy.generateHostApp('tracker-host', ['tracker-remote-agile', 'tracker-remote-qa'], frontendFramework);

      // 4. Generar Shells (Kernels Compartidos)
      s.message('Generando Shells transversales...');
      await this.strategy.generateLibrary('workflow-engine', 'shell');
      await this.strategy.generateLibrary('integration-fabric', 'shell');
      await this.strategy.generateLibrary('tenant-config', 'shell');

      // 5. Generar Dominios (Capas Puras)
      s.message('Generando Bounded Contexts (DDD)...');
      await this.strategy.generateLibrary('discovery', 'domain');
      await this.strategy.generateLibrary('design', 'domain');
      await this.strategy.generateLibrary('construction', 'domain');
      await this.strategy.generateLibrary('qa', 'domain');
      await this.strategy.generateLibrary('release', 'domain');

      // 6. Generar Shared
      s.message('Generando repositorios compartidos...');
      await this.strategy.generateLibrary('db-schema', 'shared');
      await this.strategy.generateLibrary('mocks', 'shared');

      s.stop('Andamiaje arquitectónico completado exitosamente.');
      outro(chalk.green('✅ Toda la topología Evolith ha sido generada en el directorio ./src.'));
    } catch (error) {
      s.stop('Error durante el andamiaje.');
      outro(chalk.red('❌ El proceso falló. Revisa los logs anteriores para más detalles.'));
    }
  }

  @Option({
    flags: '--frontend [framework]',
    description: 'Framework para el frontend (react, angular)',
  })
  parseFrontend(val: string): string {
    return val;
  }

  @Option({
    flags: '--orm [orm]',
    description: 'ORM para base de datos (prisma, typeorm)',
  })
  parseOrm(val: string): string {
    return val;
  }
}

