import { Command, CommandRunner, Option } from 'nest-commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { getContainer } from '../../core/di/container';
import { ADRService, CreateADRInput, ADR, ADCMatrix } from '../../domain/services/adr.service';
import { logger, OperationTimer } from '../../core/observability';

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
export class ADRCommand extends CommandRunner {
  private readonly timer = new OperationTimer();

  async run(
    passedParam: string[],
    options?: ADRCommandOptions,
  ): Promise<void> {
    this.timer.start('ADRCommand.run');
    const fs = getContainer().createFileSystem() as any;

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

  private async interactiveMode(fs: any, dryRun = false): Promise<void> {
    console.clear();
    p.intro(chalk.bgCyan.white.bold(' Evolith ADR - Architecture Decision Records '));

    const action = await p.select({
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
        const id = await p.text({ message: 'ID del ADR (ej: ADR-0001):' });
        await this.getADR(fs, id as string);
        break;
      case 'update':
        const updateId = await p.text({ message: 'ID del ADR:' });
        const newStatus = await p.select({
          message: 'Nuevo estado:',
          options: [
            { value: 'Accepted', label: 'Accepted' },
            { value: 'Deprecated', label: 'Deprecated' },
            { value: 'Superseded', label: 'Superseded' },
            { value: 'Amended', label: 'Amended' },
          ],
        });
        const reason = await p.text({ message: 'Razón del cambio:' });
        await this.updateADR(fs, updateId as string, newStatus as string, reason as string, dryRun);
        break;
    }
  }

  private async createADR(fs: any, dryRun = false): Promise<void> {
    logger.info('Creating new ADR', { dryRun });

    const title = await p.text({
      message: 'Título del ADR:',
      placeholder: 'Use PostgreSQL as primary database',
      validate: (v) => String(v).length < 5 ? 'Título demasiado corto' : undefined,
    }) as string;

    const context = await p.text({
      message: 'Contexto (describe el problema):',
      placeholder: 'Necesitamos decidir sobre la base de datos...',
    }) as string;

    const decision = await p.text({
      message: 'Decisión (qué se decidió):',
      placeholder: 'Se decidió usar PostgreSQL porque...',
    }) as string;

    const positive = await p.text({
      message: 'Consecuencias positivas (una por línea, separadas por pipe |):',
      placeholder: 'Mejora rendimiento | Consistency',
    }) as string;

    const negative = await p.text({
      message: 'Consecuencias negativas (una por línea, separadas por pipe |):',
      placeholder: 'Mayor complejidad | Costo adicional',
    }) as string;

    const tagsInput = await p.text({
      message: 'Tags (separados por comma, opcional):',
      placeholder: 'database, backend, infrastructure',
    }) as string;

    const positiveList = positive.split('|').map(l => l.trim()).filter(l => l);
    const negativeList = negative.split('|').map(l => l.trim()).filter(l => l);
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    const service = new ADRService(fs, process.cwd());

    const spinner = p.spinner();
    spinner.start('Creando ADR...');

    try {
      const input: CreateADRInput = {
        title: title as string,
        context: context as string,
        decision: decision as string,
        consequences: { positive: positiveList, negative: negativeList },
        tags,
      };

      const adr = await service.create(input, dryRun);
      spinner.stop();

      if (dryRun) {
        p.log.warn(chalk.yellow(`[DRY-RUN] ADR ${adr.id} simulated creation`));
      } else {
        p.log.success(chalk.green(`✓ ADR ${adr.id} creado exitosamente`));
      }
      p.log.info(`  Título: ${adr.title}`);
      p.log.info(`  Estado: ${adr.status}`);
      p.log.info(`  Archivo: reference/architecture/adrs/${adr.id}.md`);
    } catch (error) {
      spinner.stop();
      logger.error('Failed to create ADR', { error });
      p.log.error(chalk.red('✗ Error creando ADR'));
    }
  }

  private async listADRs(fs: any): Promise<void> {
    logger.info('Listing ADRs');

    const service = new ADRService(fs, process.cwd());
    const adrs = await service.list();

    if (adrs.length === 0) {
      p.log.warn('No hay ADRs registrados. Usa "evolith adr --create" para crear el primero.');
      return;
    }

    p.log.info(`\nTotal ADRs: ${adrs.length}\n`);

    const table = adrs.map(adr => ({
      id: adr.id,
      title: adr.title.length > 50 ? adr.title.substring(0, 47) + '...' : adr.title,
      status: adr.status,
      date: adr.date,
    }));

    console.table(table);
  }

  private async getADR(fs: any, id: string): Promise<void> {
    logger.info('Getting ADR', { id });

    const service = new ADRService(fs, process.cwd());
    const adr = await service.get(id);

    if (!adr) {
      p.log.error(chalk.red(`ADR ${id} no encontrado`));
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

  private async updateADR(fs: any, id: string, status: string, reason?: string, dryRun = false): Promise<void> {
    logger.info('Updating ADR status', { id, status, dryRun });

    if (!status) {
      p.log.error('Estado requerido. Usa --status <Accepted|Deprecated|Superseded|Amended>');
      return;
    }

    const service = new ADRService(fs, process.cwd());
    const spinner = p.spinner();
    spinner.start(`Actualizando ADR ${id}...`);

    try {
      const updated = await service.updateStatus(id, status as any, reason, dryRun);
      spinner.stop();

      if (updated) {
        if (dryRun) {
          p.log.warn(chalk.yellow(`[DRY-RUN] ADR ${id} update simulated to ${status}`));
        } else {
          p.log.success(chalk.green(`✓ ADR ${id} actualizado a ${status}`));
        }
      } else {
        p.log.error(chalk.red(`ADR ${id} no encontrado`));
      }
    } catch (error) {
      spinner.stop();
      logger.error('Failed to update ADR', { error });
      p.log.error(chalk.red('✗ Error actualizando ADR'));
    }
  }

  private async showMatrix(fs: any): Promise<void> {
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