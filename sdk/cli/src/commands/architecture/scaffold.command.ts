import { Command, Option } from 'nest-commander';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { WorkspaceManagerStrategy } from '../../application/architecture/workspace-manager.strategy';
import { NxWorkspaceStrategy } from '../../infrastructure/architecture/nx-workspace.strategy';
import { commandExecutor } from '../../infrastructure/cli/command-executor';

@Command({
  name: 'scaffold',
  description: 'Scaffolds the Evolith Monolithic Modular and Microfrontends architecture in the current workspace',
})
export class ScaffoldCommand extends BaseEvolithCommand {
  private strategy: WorkspaceManagerStrategy;

  constructor() {
    super('ScaffoldCommand');
    this.strategy = new NxWorkspaceStrategy(commandExecutor, this.promptService);
  }

  async executeCommand(passedParam: string[], options?: Record<string, unknown>): Promise<void> {
    const dryRun = options?.dryRun || false;
    if (this.strategy.setDryRun) {
      this.strategy.setDryRun(dryRun);
    }

    console.log();
    this.promptService.showIntro('Evolith Architecture Scaffolding');

    let frontendFramework = options?.frontend;
    if (!frontendFramework) {
      frontendFramework = await this.promptService.select({
        message: '¿Qué framework de Frontend utilizarás para los Microfrontends?',
        options: [
          { value: 'react', label: 'React' },
          { value: 'angular', label: 'Angular' },
          { value: 'vue', label: 'Vue 3 (Vite)' },
        ],
      });
    }

    let orm = options?.orm;
    if (!orm) {
      orm = await this.promptService.select({
        message: '¿Qué ORM usarás para la capa de persistencia compartida?',
        options: [
          { value: 'prisma', label: 'Prisma' },
          { value: 'typeorm', label: 'TypeORM' },
        ],
      });
    }

    const phase = await this.promptService.select({
      message: '¿En qué fase de la Estrategia Evolutiva (Evolutionary Roadmap) se encuentra este proyecto?',
      options: [
        { value: '1', label: 'Fase 1: The Lean Foundation (Modular Monolith MVP)' },
        { value: '2', label: 'Fase 2: Scale and Decoupling (Service Extraction)' },
        { value: '3', label: 'Fase 3: North Star (Microservices & Microfrontends)' },
      ],
    });

    const apiName = await this.promptService.text({
      message: '¿Cuál será el nombre de la API principal (Backend)?',
      placeholder: 'tracker-api',
      defaultValue: 'tracker-api'
    });

    let webAppName = '';
    let hostName = '';
    let remotesInput = '';
    let remotes: string[] = [];

    if (phase === '1') {
      webAppName = await this.promptService.text({
        message: '¿Cuál será el nombre de la aplicación Web estándar (SPA)?',
        placeholder: 'tracker-web',
        defaultValue: 'tracker-web'
      });
    } else {
      hostName = await this.promptService.text({
        message: '¿Cuál será el nombre de la aplicación Host (Microfrontend Web principal)?',
        placeholder: 'tracker-host',
        defaultValue: 'tracker-host'
      });

      remotesInput = await this.promptService.text({
        message: 'Ingresa los nombres de los Microfrontends Remotos separados por comas:',
        placeholder: 'trackerRemoteAgile, trackerRemoteQa',
        defaultValue: 'trackerRemoteAgile, trackerRemoteQa'
      });

      remotes = remotesInput.split(',').map(r => r.trim()).filter(r => r.length > 0);
    }

    const domains = await this.promptService.multiselect({
      message: 'Selecciona las fases SDLC de Evolith que este proyecto va a implementar:',
      options: [
        { value: 'discovery', label: 'Discovery' },
        { value: 'design', label: 'Design' },
        { value: 'construction', label: 'Construction' },
        { value: 'qa', label: 'QA' },
        { value: 'release', label: 'Release' },
      ],
      required: true
    });

    this.promptService.startSpinner('Iniciando el proceso de andamiaje...');

    // 1. Instalar dependencias
    this.promptService.startSpinner('Instalando plugins y dependencias base...');
    await this.strategy.installDependencies(frontendFramework, orm);

    // 2. Generar Backend API
    this.promptService.startSpinner(`Generando la Service API (NestJS) [${apiName}]...`);
    await this.strategy.generateApiApp(apiName);

    // 3. Generar Frontend
    if (phase === '1') {
      this.promptService.startSpinner(`Generando Single Page App estándar (${frontendFramework.toUpperCase()}) [${webAppName}]...`);
      await this.strategy.generateStandardWebApp(webAppName, frontendFramework);
    } else {
      this.promptService.startSpinner(`Generando Microfrontends Host y Remotes (${frontendFramework.toUpperCase()})...`);
      await this.strategy.generateHostApp(hostName, remotes, frontendFramework);
    }

    // 4. Generar Shells (Kernels Compartidos)
    this.promptService.startSpinner('Generando Shells transversales...');
    await this.strategy.generateLibrary('workflow-engine', 'shell');
    await this.strategy.generateLibrary('integration-fabric', 'shell');
    await this.strategy.generateLibrary('tenant-config', 'shell');

    // 5. Generar Dominios (Capas Puras)
    this.promptService.startSpinner('Generando Bounded Contexts (DDD)...');
    for (const domain of domains) {
      await this.strategy.generateLibrary(domain, 'domain');
    }

    // 6. Generar Shared
    this.promptService.startSpinner('Generando repositorios compartidos...');
    await this.strategy.generateLibrary('db-schema', 'shared');
    await this.strategy.generateLibrary('mocks', 'shared');

    this.promptService.stopSpinner('Andamiaje arquitectónico completado exitosamente.');
    if (dryRun) {
      this.promptService.showWarning('Modo DRY-RUN activado: No se realizaron cambios en el disco.');
    } else {
      this.promptService.showSuccess('Toda la topología Evolith ha sido generada en el directorio ./src.');
    }
    this.promptService.showOutro('Completed');
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

  @Option({
    flags: '-d, --dry-run',
    description: 'Ejecuta en modo simulacro sin alterar archivos',
  })
  parseDryRun(): boolean {
    return true;
  }
}
