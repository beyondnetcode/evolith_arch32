import { Command, CommandRunner, Option } from 'nest-commander';
import { intro, outro, select, text, multiselect, spinner } from '@clack/prompts';
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
          { value: 'vue', label: 'Vue 3 (Vite)' },
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

    const phase = await select({
      message: '¿En qué fase de la Estrategia Evolutiva (Evolutionary Roadmap) se encuentra este proyecto?',
      options: [
        { value: '1', label: 'Fase 1: The Lean Foundation (Modular Monolith MVP)' },
        { value: '2', label: 'Fase 2: Scale and Decoupling (Service Extraction)' },
        { value: '3', label: 'Fase 3: North Star (Microservices & Microfrontends)' },
      ],
    }) as string;

    const apiName = await text({
      message: '¿Cuál será el nombre de la API principal (Backend)?',
      placeholder: 'tracker-api',
      defaultValue: 'tracker-api'
    }) as string;

    let webAppName = '';
    let hostName = '';
    let remotesInput = '';
    let remotes: string[] = [];

    if (phase === '1') {
      webAppName = await text({
        message: '¿Cuál será el nombre de la aplicación Web estándar (SPA)?',
        placeholder: 'tracker-web',
        defaultValue: 'tracker-web'
      }) as string;
    } else {
      hostName = await text({
        message: '¿Cuál será el nombre de la aplicación Host (Microfrontend Web principal)?',
        placeholder: 'tracker-host',
        defaultValue: 'tracker-host'
      }) as string;

      remotesInput = await text({
        message: 'Ingresa los nombres de los Microfrontends Remotos separados por comas:',
        placeholder: 'trackerRemoteAgile, trackerRemoteQa',
        defaultValue: 'trackerRemoteAgile, trackerRemoteQa'
      }) as string;

      remotes = remotesInput.split(',').map(r => r.trim()).filter(r => r.length > 0);
    }

    const domains = await multiselect({
      message: 'Selecciona las fases SDLC de Evolith que este proyecto va a implementar:',
      options: [
        { value: 'discovery', label: 'Discovery' },
        { value: 'design', label: 'Design' },
        { value: 'construction', label: 'Construction' },
        { value: 'qa', label: 'QA' },
        { value: 'release', label: 'Release' },
      ],
      required: true
    }) as string[];

    const s = spinner();
    s.start('Iniciando el proceso de andamiaje...');

    try {
      // 1. Instalar dependencias
      s.message('Instalando plugins y dependencias base...');
      await this.strategy.installDependencies(frontendFramework, orm);

      // 2. Generar Backend API
      s.message(`Generando la Service API (NestJS) [${apiName}]...`);
      await this.strategy.generateApiApp(apiName);

      // 3. Generar Frontend
      if (phase === '1') {
        s.message(`Generando Single Page App estándar (${frontendFramework.toUpperCase()}) [${webAppName}]...`);
        await this.strategy.generateStandardWebApp(webAppName, frontendFramework);
      } else {
        s.message(`Generando Microfrontends Host y Remotes (${frontendFramework.toUpperCase()})...`);
        await this.strategy.generateHostApp(hostName, remotes, frontendFramework);
      }

      // 4. Generar Shells (Kernels Compartidos)
      s.message('Generando Shells transversales...');
      await this.strategy.generateLibrary('workflow-engine', 'shell');
      await this.strategy.generateLibrary('integration-fabric', 'shell');
      await this.strategy.generateLibrary('tenant-config', 'shell');

      // 5. Generar Dominios (Capas Puras)
      s.message('Generando Bounded Contexts (DDD)...');
      for (const domain of domains) {
        await this.strategy.generateLibrary(domain, 'domain');
      }

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

