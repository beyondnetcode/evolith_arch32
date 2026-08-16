import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { randomUUID } from 'node:crypto';
import { Inject } from '@nestjs/common';
import { ADRService, CreateADRInput } from '@beyondnet/evolith-core-domain/domain/services/adr.service';
import { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { logger, OperationTimer } from '../../infrastructure/observability';
import {
  createSuccessEnvelope,
  createErrorEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
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
  format?: string;
}

@Command({
  name: 'adr',
  description: 'Manage Architecture Decision Records (ADRs)',
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
    const json = (options?.format as string | undefined) === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith adr',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    if (options?.create) {
      await this.createADR(fs, options.dryRun, json, meta, startedAt);
    } else if (options?.list) {
      await this.listADRs(fs, json, meta, startedAt);
    } else if (options?.get) {
      await this.getADR(fs, options.get, json, meta, startedAt);
    } else if (options?.update) {
      await this.updateADR(fs, options.update, options.status, options.reason, options.dryRun, json, meta, startedAt);
    } else if (options?.matrix) {
      await this.showMatrix(fs, json, meta, startedAt);
    } else {
      await this.interactiveMode(fs, options?.dryRun, json, meta, startedAt);
    }

    this.timer.end();
  }

  private async interactiveMode(fs: IFileSystem, dryRun = false, json = false, meta?: any, startedAt?: number): Promise<void> {
    if (!json) {
      console.clear();
      this.promptService.showIntro('Evolith ADR - Architecture Decision Records');
    }

    const action = await this.promptService.select({
      message: 'What would you like to do?',
      options: [
        { value: 'create', label: 'Crear ADR', hint: 'Nuevo Architecture Decision Record' },
        { value: 'list', label: 'List ADRs', hint: 'See every ADR' },
        { value: 'matrix', label: 'Ver Matriz', hint: 'Ver ADR Matrix summary' },
        { value: 'get', label: 'View ADR', hint: 'Details of a specific ADR' },
        { value: 'update', label: 'Actualizar Status', hint: 'Change an ADR status' },
      ],
    });

    switch (action) {
      case 'create':
        await this.createADR(fs, dryRun, json, meta, startedAt);
        break;
      case 'list':
        await this.listADRs(fs, json, meta, startedAt);
        break;
      case 'matrix':
        await this.showMatrix(fs, json, meta, startedAt);
        break;
      case 'get':
        const id = await this.promptService.text({ message: 'ADR id (e.g. ADR-0001):' });
        await this.getADR(fs, id as string, json, meta, startedAt);
        break;
      case 'update':
        const updateId = await this.promptService.text({ message: 'ADR id:' });
        const newStatus = await this.promptService.select({
          message: 'New status:',
          options: [
            { value: 'Accepted', label: 'Accepted' },
            { value: 'Deprecated', label: 'Deprecated' },
            { value: 'Superseded', label: 'Superseded' },
            { value: 'Amended', label: 'Amended' },
          ],
        });
        const reason = await this.promptService.text({ message: 'Reason for the change:' });
        await this.updateADR(fs, updateId as string, newStatus as string, reason as string, dryRun, json, meta, startedAt);
        break;
    }
  }

  private async createADR(fs: IFileSystem, dryRun = false, json = false, meta?: any, startedAt?: number): Promise<void> {
    logger.info('Creating new ADR', { dryRun });

    const title = await this.promptService.text({
      message: 'ADR title:',
      placeholder: 'Use PostgreSQL as primary database',
      validate: (v) => String(v).length < 5 ? 'Title is too short' : undefined,
    }) as string;

    const context = await this.promptService.text({
      message: 'Context (describe the problem):',
      placeholder: 'We need to decide on the database...',
    }) as string;

    const decision = await this.promptService.text({
      message: 'Decision (what was decided):',
      placeholder: 'We decided to use PostgreSQL because...',
    }) as string;

    const positive = await this.promptService.text({
      message: 'Positive consequences (one per line, pipe-separated |):',
      placeholder: 'Better performance | Consistency',
    }) as string;

    const negative = await this.promptService.text({
      message: 'Negative consequences (one per line, pipe-separated |):',
      placeholder: 'More complexity | Extra cost',
    }) as string;

    const tagsInput = await this.promptService.text({
      message: 'Tags (comma-separated, optional):',
      placeholder: 'database, backend, infrastructure',
    }) as string;

    const positiveList = positive.split('|').map(l => l.trim()).filter(l => l);
    const negativeList = negative.split('|').map(l => l.trim()).filter(l => l);
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    const service = new ADRService(fs, process.cwd());

    if (!json) {
      this.promptService.startSpinner('Creating ADR...');
    }

    try {
      const input: CreateADRInput = {
        title: title as string,
        context: context as string,
        decision: decision as string,
        consequences: { positive: positiveList, negative: negativeList },
        tags,
      };

      const adr = await service.create(input, dryRun);
      if (!json) {
        this.promptService.stopSpinner();
      }

      const result = {
        success: true,
        adr: { id: adr.id, title: adr.title, status: adr.status },
      };

      if (json) {
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
      } else {
        if (dryRun) {
          this.promptService.showWarning(`[DRY-RUN] ADR ${adr.id} simulated creation`);
        } else {
          this.promptService.showSuccess(`✓ ADR ${adr.id} created`);
        }
        this.promptService.showInfo(`  Title: ${adr.title}`);
        this.promptService.showInfo(`  Status: ${adr.status}`);
        this.promptService.showInfo(`  File: reference/architecture/adrs/${adr.id}.md`);
      }
    } catch (error) {
      if (!json) {
        this.promptService.stopSpinner();
      }
      logger.error('Failed to create ADR', { error });
      if (json) {
        process.exitCode = 1;
        const message = error instanceof Error ? error.message : String(error);
        console.log(JSON.stringify(createErrorEnvelope('IO_ERROR', message, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
      } else {
        this.promptService.showError('✗ Failed to create the ADR');
      }
    }
  }

  private async listADRs(fs: IFileSystem, json = false, meta?: any, startedAt?: number): Promise<void> {
    logger.info('Listing ADRs');

    const service = new ADRService(fs, process.cwd());
    const adrs = await service.list();

    const result = {
      count: adrs.length,
      adrs: adrs.map(adr => ({
        id: adr.id,
        title: adr.title,
        status: adr.status,
        date: adr.date,
      })),
    };

    if (json) {
      console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
      return;
    }

    if (adrs.length === 0) {
      this.promptService.showWarning('No ADRs registered. Run "evolith adr --create" to add the first one.');
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

  private async getADR(fs: IFileSystem, id: string, json = false, meta?: any, startedAt?: number): Promise<void> {
    logger.info('Getting ADR', { id });

    const service = new ADRService(fs, process.cwd());
    const adr = await service.get(id);

    if (!adr) {
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('IO_ERROR', `ADR ${id} not found`, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
      } else {
        this.promptService.showError(`ADR ${id} not found`);
      }
      return;
    }

    if (json) {
      console.log(JSON.stringify(createSuccessEnvelope(adr, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
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

  private async updateADR(fs: IFileSystem, id: string, status?: string, reason?: string, dryRun = false, json = false, meta?: any, startedAt?: number): Promise<void> {
    logger.info('Updating ADR status', { id, status, dryRun });

    if (!status) {
      const message = 'A status is required. Use --status <Accepted|Deprecated|Superseded|Amended>';
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('VALIDATION_FAILED', message, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
      } else {
        this.promptService.showError(message);
      }
      return;
    }

    const service = new ADRService(fs, process.cwd());
    if (!json) {
      this.promptService.startSpinner(`Updating ADR ${id}...`);
    }

    try {
      const updated = await service.updateStatus(id, status as 'Accepted' | 'Deprecated' | 'Superseded' | 'Amended', reason, dryRun);
      if (!json) {
        this.promptService.stopSpinner();
      }

      if (updated) {
        const result = {
          success: true,
          id,
          newStatus: status,
          dryRun,
        };

        if (json) {
          console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
        } else {
          if (dryRun) {
            this.promptService.showWarning(`[DRY-RUN] ADR ${id} update simulated to ${status}`);
          } else {
            this.promptService.showSuccess(`✓ ADR ${id} updated to ${status}`);
          }
        }
      } else {
        const message = `ADR ${id} not found`;
        if (json) {
          process.exitCode = 1;
          console.log(JSON.stringify(createErrorEnvelope('IO_ERROR', message, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
        } else {
          this.promptService.showError(message);
        }
      }
    } catch (error) {
      if (!json) {
        this.promptService.stopSpinner();
      }
      logger.error('Failed to update ADR', { error });
      if (json) {
        process.exitCode = 1;
        const message = error instanceof Error ? error.message : String(error);
        console.log(JSON.stringify(createErrorEnvelope('IO_ERROR', message, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
      } else {
        this.promptService.showError('✗ Failed to update the ADR');
      }
    }
  }

  private async showMatrix(fs: IFileSystem, json = false, meta?: any, startedAt?: number): Promise<void> {
    logger.info('Showing ADR Matrix');

    const service = new ADRService(fs, process.cwd());
    const matrix = await service.getMatrix();

    if (json) {
      console.log(JSON.stringify(createSuccessEnvelope(matrix, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
      return;
    }

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
    description: 'List every ADR',
  })
  parseList(): boolean {
    return true;
  }

  @Option({
    flags: '-g, --get [id]',
    description: 'View a specific ADR',
  })
  parseGet(val: string): string {
    return val;
  }

  @Option({
    flags: '-u, --update [id]',
    description: 'Update an ADR status',
  })
  parseUpdate(val: string): string {
    return val;
  }

  @Option({
    flags: '-s, --status [status]',
    description: 'New status: Accepted, Deprecated, Superseded, Amended',
  })
  parseStatus(val: string): string {
    return val;
  }

  @Option({
    flags: '-r, --reason [text]',
    description: 'Reason for the status change',
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
    description: 'Dry run: change nothing on disk',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '-f, --format <string>',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }
}