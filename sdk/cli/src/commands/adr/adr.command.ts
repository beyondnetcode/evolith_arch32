import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { Inject } from '@nestjs/common';
import { ADRService, CreateADRInput, ADR, ADCMatrix } from '../../domain/services/adr.service';
import { IFileSystem } from '../../domain/interfaces';
import { logger, OperationTimer } from '../../infrastructure/observability';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';

interface ADRCommandOptions {
  create?: boolean;
  list?: boolean;
  get?: string;
  update?: string;
  matrix?: boolean;
  status?: string;
  reason?: string;
  dryRun?: boolean;
}

@Command({
  name: 'adr',
  description: 'Gestión de Architecture Decision Records (ADRs)',
})
export class ADRCommand extends BaseEvolithCommand {
  private readonly timer = new OperationTimer();

  constructor(
    @Inject('IFileSystem') private readonly fileSystem: IFileSystem,
    promptService: PromptService
  ) {
    super('ADRCommand', promptService);
  }

  async executeCommand(
    passedParam: string[],
    options?: ADRCommandOptions,
  ): Promise<void> {
    this.timer.start('ADRCommand.executeCommand');
    const fs = this.fileSystem;

    if (options?.create) {
      await this.createADR(fs, options.dryRun);
    } else if (options?.list) {
      await this.listADRs(fs);
    } else if (options?.get) {
      await this.getADR(fs, options.get);
    } else if (options?.update) {
      await this.updateADR(fs, options.update, options.status, options.reason, options.dryRun);
    } else if (options?.matrix) {
      await this.showMatrix(fs);
    } else {
      await this.interactiveMode(fs, options?.dryRun);
    }

    this.timer.end();
  }

  private async interactiveMode(fs: IFileSystem, dryRun = false): Promise<void> {
    console.clear();
    this.promptService.showIntro('Evolith ADR - Architecture Decision Records');

    const action = await this.promptService.select({
      message: '¿Qué acción deseas realizar?',
      options: [
        { value: 'create', label: 'Crear ADR', hint: 'Nuevo Architecture Decision Record' },
        { value: 'list', label: 'Listar ADRs', hint: 'Ver todos los ADRs' },
        { value: 'matrix', label: 'Ver Matriz', hint: 'Ver ADR Matrix summary' },
        { value: 'get', label: 'Ver ADR', hint: 'Detalles de un ADR específico' },
        { value: 'update', label: 'Actualizar Status', hint: 'Cambiar estado de un ADR' },
      ],
    });

    switch (action) {
      case 'create':
        await this.createADR(fs, dryRun);
        break;
      case 'list':
        await this.listADRs(fs);
        break;
      case 'matrix':
        await this.showMatrix(fs);
        break;
      case 'get':
        const id = await this.promptService.text({ message: 'ID del ADR (ej: ADR-0001):' });
        await this.getADR(fs, id as string);
        break;
      case 'update':
        const updateId = await this.promptService.text({ message: 'ID del ADR:' });
        const newStatus = await this.promptService.select({
          message: 'Nuevo estado:',
          options: [
            { value: 'Accepted', label: 'Accepted' },
            { value: 'Deprecated', label: 'Deprecated' },
            { value: 'Superseded', label: 'Superseded' },
            { value: 'Amended', label: 'Amended' },
          ],
        });
        const reason = await this.promptService.text({ message: 'Razón del cambio:' });
        await this.updateADR(fs, updateId as string, newStatus as string, reason as string, dryRun);
        break;
    }
  }

  private async createADR(fs: IFileSystem, dryRun = false): Promise<void> {
    logger.info('Creating new ADR', { dryRun });

    const title = await this.promptService.text({
      message: 'Título del ADR:',
      placeholder: 'Use PostgreSQL as primary database',
      validate: (v) => String(v).length < 5 ? 'Título demasiado corto' : undefined,
    }) as string;

    const context = await this.promptService.text({
      message: 'Contexto (describe el problema):',
      placeholder: 'Necesitamos decidir sobre la base de datos...',
    }) as string;

    const decision = await this.promptService.text({
      message: 'Decisión (qué se decidió):',
      placeholder: 'Se decidió usar PostgreSQL porque...',
    }) as string;

    const positive = await this.promptService.text({
      message: 'Consecuencias positivas (una por línea, separadas por pipe |):',
      placeholder: 'Mejora rendimiento | Consistency',
    }) as string;

    const negative = await this.promptService.text({
      message: 'Consecuencias negativas (una por línea, separadas por pipe |):',
      placeholder: 'Mayor complejidad | Costo adicional',
    }) as string;

    const tagsInput = await this.promptService.text({
      message: 'Tags (separados por comma, opcional):',
      placeholder: 'database, backend, infrastructure',
    }) as string;

    const positiveList = positive.split('|').map(l => l.trim()).filter(l => l);
    const negativeList = negative.split('|').map(l => l.trim()).filter(l => l);
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    const service = new ADRService(fs, process.cwd());

    this.promptService.startSpinner('Creando ADR...');

    try {
      const input: CreateADRInput = {
        title: title as string,
        context: context as string,
        decision: decision as string,
        consequences: { positive: positiveList, negative: negativeList },
        tags,
      };

      const adr = await service.create(input, dryRun);
      this.promptService.stopSpinner();

      if (dryRun) {
        this.promptService.showWarning(`[DRY-RUN] ADR ${adr.id} simulated creation`);
      } else {
        this.promptService.showSuccess(`✓ ADR ${adr.id} creado exitosamente`);
      }
      this.promptService.showInfo(`  Título: ${adr.title}`);
      this.promptService.showInfo(`  Estado: ${adr.status}`);
      this.promptService.showInfo(`  Archivo: reference/architecture/adrs/${adr.id}.md`);
    } catch (error) {
      this.promptService.stopSpinner();
      logger.error('Failed to create ADR', { error });
      this.promptService.showError('✗ Error creando ADR');
    }
  }

  private async listADRs(fs: IFileSystem): Promise<void> {
    logger.info('Listing ADRs');

    const service = new ADRService(fs, process.cwd());
    const adrs = await service.list();

    if (adrs.length === 0) {
      this.promptService.showWarning('No hay ADRs registrados. Usa "evolith adr --create" para crear el primero.');
      return;
    }

    this.promptService.showInfo(`\nTotal ADRs: ${adrs.length}\n`);

    const table = adrs.map(adr => ({
      id: adr.id,
      title: adr.title.length > 50 ? adr.title.substring(0, 47) + '...' : adr.title,
      status: adr.status,
      date: adr.date,
    }));

    console.table(table);
  }

  private async getADR(fs: IFileSystem, id: string): Promise<void> {
    logger.info('Getting ADR', { id });

    const service = new ADRService(fs, process.cwd());
    const adr = await service.get(id);

    if (!adr) {
      this.promptService.showError(`ADR ${id} no encontrado`);
      return;
    }

    console.log(chalk.bold(`\n${adr.id}: ${adr.title}\n`));
    console.log(`Status: ${chalk.cyan(adr.status)}`);
    console.log(`Date: ${adr.date}`);
    console.log(`\n${chalk.bold('Context:')}\n${adr.context}`);
    console.log(`\n${chalk.bold('Decision:')}\n${adr.decision}`);
    console.log(`\n${chalk.bold('Consequences:')}`);
    console.log(`${chalk.green('Positive:')} ${adr.consequences.positive.join(', ')}`);
    console.log(`${chalk.red('Negative:')} ${adr.consequences.negative.join(', ')}`);

    if (adr.tags && adr.tags.length > 0) {
      console.log(`\nTags: ${adr.tags.map(t => chalk.yellow(`[${t}]`)).join(' ')}`);
    }
  }

  private async updateADR(fs: IFileSystem, id: string, status?: string, reason?: string, dryRun = false): Promise<void> {
    logger.info('Updating ADR status', { id, status, dryRun });

    if (!status) {
      this.promptService.showError('Estado requerido. Usa --status <Accepted|Deprecated|Superseded|Amended>');
      return;
    }

    const service = new ADRService(fs, process.cwd());
    this.promptService.startSpinner(`Actualizando ADR ${id}...`);

    try {
      const updated = await service.updateStatus(id, status as 'Accepted' | 'Deprecated' | 'Superseded' | 'Amended', reason, dryRun);
      this.promptService.stopSpinner();

      if (updated) {
        if (dryRun) {
          this.promptService.showWarning(`[DRY-RUN] ADR ${id} update simulated to ${status}`);
        } else {
          this.promptService.showSuccess(`✓ ADR ${id} actualizado a ${status}`);
        }
      } else {
        this.promptService.showError(`ADR ${id} no encontrado`);
      }
    } catch (error) {
      this.promptService.stopSpinner();
      logger.error('Failed to update ADR', { error });
      this.promptService.showError('✗ Error actualizando ADR');
    }
  }

  private async showMatrix(fs: IFileSystem): Promise<void> {
    logger.info('Showing ADR Matrix');

    const service = new ADRService(fs, process.cwd());
    const matrix = await service.getMatrix();

    console.log(chalk.bold('\n╔══════════════════════════════════════════════╗'));
    console.log(chalk.bold('║            ADR MATRIX SUMMARY               ║'));
    console.log(chalk.bold('╠══════════════════════════════════════════════╣'));
    console.log(`║  Total ADRs:     ${String(matrix.summary.total).padStart(4)}                       ║`);
    console.log(`║  Proposed:       ${String(matrix.summary.proposed).padStart(4)}                       ║`);
    console.log(`║  Accepted:       ${String(matrix.summary.accepted).padStart(4)}                       ║`);
    console.log(`║  Deprecated:     ${String(matrix.summary.deprecated).padStart(4)}                       ║`);
    console.log(chalk.bold('╠══════════════════════════════════════════════╣'));

    const latestAdrs = matrix.adrs.slice(0, 5);
    if (latestAdrs.length > 0) {
      console.log(chalk.bold('║  Recent ADRs:                                ║'));
      for (const adr of latestAdrs) {
        const title = adr.title.length > 35 ? adr.title.substring(0, 32) + '...' : adr.title;
        console.log(`║  ${adr.id} ${title.padEnd(35)} ║`);
      }
    }
    console.log(chalk.bold('╚══════════════════════════════════════════════╝'));
    console.log(`\nLast updated: ${matrix.lastUpdated}\n`);
  }

  @Option({
    flags: '-c, --create',
    description: 'Crear nuevo ADR',
  })
  parseCreate(): boolean {
    return true;
  }

  @Option({
    flags: '-l, --list',
    description: 'Listar todos los ADRs',
  })
  parseList(): boolean {
    return true;
  }

  @Option({
    flags: '-g, --get [id]',
    description: 'Ver ADR específico',
  })
  parseGet(val: string): string {
    return val;
  }

  @Option({
    flags: '-u, --update [id]',
    description: 'Actualizar estado de ADR',
  })
  parseUpdate(val: string): string {
    return val;
  }

  @Option({
    flags: '-s, --status [status]',
    description: 'Nuevo estado: Accepted, Deprecated, Superseded, Amended',
  })
  parseStatus(val: string): string {
    return val;
  }

  @Option({
    flags: '-r, --reason [text]',
    description: 'Razón del cambio de estado',
  })
  parseReason(val: string): string {
    return val;
  }

  @Option({
    flags: '-m, --matrix',
    description: 'Mostrar ADR Matrix summary',
  })
  parseMatrix(): boolean {
    return true;
  }

  @Option({
    flags: '-d, --dry-run',
    description: 'Ejecuta en modo simulacro sin alterar archivos',
  })
  parseDryRun(): boolean {
    return true;
  }
}