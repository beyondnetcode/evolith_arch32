import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { randomUUID } from 'node:crypto';
import { Inject } from '@nestjs/common';
import { StandardsService, StandardCategory } from '@beyondnet/evolith-core-domain/domain/services/standards.service';
import { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { logger } from '../../infrastructure/observability';
import {
  createSuccessEnvelope,
  createErrorEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';

interface StandardsCommandOptions {
  init?: boolean;
  list?: boolean;
  get?: string;
  validate?: string;
  export?: string;
  format?: string;
  category?: string;
}

@Command({
  name: 'standards',
  description: 'Gestión de estándares Evolith (arquitectura, gobernanza, operaciones)',
})
export class StandardsCommand extends BaseEvolithCommand {
  constructor(@Inject('IFileSystem') private readonly fileSystem: IFileSystem) {
    super('StandardsCommand');
  }

  async executeCommand(
    passedParam: string[],
    options?: StandardsCommandOptions,
  ): Promise<void> {
    const fs = this.fileSystem;
    const json = (options?.format as string | undefined) === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith standards',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    if (options?.init) {
      await this.initializeStandards(fs, json, meta, startedAt);
    } else if (options?.list) {
      await this.listStandards(fs, options.category, json, meta, startedAt);
    } else if (options?.get) {
      await this.getStandard(fs, options.get, json, meta, startedAt);
    } else if (options?.validate) {
      await this.validateStandards(fs, options.validate, json, meta, startedAt);
    } else if (options?.export) {
      await this.exportStandard(fs, options.export, options.format, json, meta, startedAt);
    } else {
      await this.interactiveMode(fs, json, meta, startedAt);
    }
  }

  private async interactiveMode(fs: IFileSystem, json = false, meta?: any, startedAt?: number): Promise<void> {
    if (!json) {
      console.clear();
      this.promptService.showIntro('Evolith Standards - Corporate Standards Management');
    }

    const action = await this.promptService.select({
      message: '¿Qué acción deseas realizar?',
      options: [
        { value: 'init', label: 'Inicializar', hint: 'Crear estructura de standards' },
        { value: 'list', label: 'Listar Standards', hint: 'Ver todos los standards' },
        { value: 'get', label: 'Ver Standard', hint: 'Detalles de un standard' },
        { value: 'validate', label: 'Validar Código', hint: 'Validar contra standards' },
        { value: 'export', label: 'Exportar', hint: 'Exportar standard a MD/JSON' },
      ],
    });

    switch (action) {
      case 'init':
        await this.initializeStandards(fs, json, meta, startedAt);
        break;
      case 'list':
        await this.listStandards(fs, undefined, json, meta, startedAt);
        break;
      case 'get':
        const id = await this.promptService.text({ message: 'ID del Standard:' });
        await this.getStandard(fs, id as string, json, meta, startedAt);
        break;
      case 'validate':
        const code = await this.promptService.text({ message: 'Código a validar:' });
        await this.validateStandards(fs, code as string, json, meta, startedAt);
        break;
      case 'export':
        const exportId = await this.promptService.text({ message: 'ID del Standard:' });
        const format = await this.promptService.select({
          message: 'Formato:',
          options: [
            { value: 'markdown', label: 'Markdown' },
            { value: 'json', label: 'JSON' },
          ],
        });
        await this.exportStandard(fs, exportId as string, format as string, json, meta, startedAt);
        break;
    }
  }

  private async initializeStandards(fs: IFileSystem, json = false, meta?: any, startedAt?: number): Promise<void> {
    logger.info('Initializing standards directory structure');

    const service = new StandardsService(fs, process.cwd());
    if (!json) {
      this.promptService.startSpinner('Inicializando...');
    }

    try {
      await service.initialize();
      const result = {
        success: true,
        location: 'reference/standards/',
        subFolders: ['rulesets/', 'templates/'],
      };

      if (json) {
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
      } else {
        this.promptService.stopSpinner();
        this.promptService.showSuccess('✓ Estructura de standards creada');
        this.promptService.showInfo('  Ubicación: reference/standards/');
        this.promptService.showInfo('  Subcarpetas: rulesets/, templates/');
        this.promptService.showInfo('\nPara ver los standards disponibles, usa: evolith standards --list');
      }
    } catch (error) {
      if (!json) {
        this.promptService.stopSpinner();
      }
      logger.error('Failed to initialize standards', { error });
      if (json) {
        process.exitCode = 1;
        const message = error instanceof Error ? error.message : String(error);
        console.log(JSON.stringify(createErrorEnvelope('IO_ERROR', message, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
      } else {
        this.promptService.showError('✗ Error inicializando standards');
      }
    }
  }

  private async listStandards(fs: IFileSystem, category?: string, json = false, meta?: any, startedAt?: number): Promise<void> {
    logger.info('Listing standards', { category });

    const service = new StandardsService(fs, process.cwd());
    const cat = category as StandardCategory | undefined;
    const standards = await service.list(cat);

    const result = {
      count: standards.length,
      standards: standards.map(s => ({
        id: s.id,
        name: s.name,
        version: s.version,
        category: s.category,
        rulesCount: s.rules.length,
      })),
    };

    if (json) {
      console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
      return;
    }

    if (standards.length === 0) {
      this.promptService.showWarning('No hay standards registrados.');
      this.promptService.showInfo('Usa "evolith standards --init" para inicializar la estructura.');
      return;
    }

    this.promptService.showInfo(`\nTotal Standards: ${standards.length}\n`);

    const table = standards.map(s => ({
      id: s.id,
      name: s.name,
      version: s.version,
      category: s.category,
      rules: s.rules.length,
    }));

    console.table(table);
  }

  private async getStandard(fs: IFileSystem, id: string, json = false, meta?: any, startedAt?: number): Promise<void> {
    logger.info('Getting standard', { id });

    const service = new StandardsService(fs, process.cwd());
    const standard = await service.get(id);

    if (!standard) {
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('IO_ERROR', `Standard ${id} no encontrado`, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
      } else {
        this.promptService.showError(`Standard ${id} no encontrado`);
      }
      return;
    }

    if (json) {
      console.log(JSON.stringify(createSuccessEnvelope(standard, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
      return;
    }

    this.promptService.showInfo(chalk.bold(`\n${standard.name}`));
    this.promptService.showInfo(`ID: ${standard.id} | Version: ${standard.version} | Category: ${standard.category}`);
    this.promptService.showInfo(`\n${standard.description}\n`);

    if (standard.rules.length > 0) {
      this.promptService.showInfo(chalk.bold('Rules:'));
      standard.rules.forEach(rule => {
        const icon = rule.severity === 'error' ? '🔴' : rule.severity === 'warning' ? '🟡' : '🔵';
        this.promptService.showInfo(`  ${icon} [${rule.severity}] ${rule.id}: ${rule.name}`);
        this.promptService.showInfo(`      ${rule.description}`);
        if (rule.remediation) {
          this.promptService.showInfo(`      → ${rule.remediation}`);
        }
      });
    }
  }

  private async validateStandards(fs: IFileSystem, code: string, json = false, meta?: any, startedAt?: number): Promise<void> {
    if (!code) {
      const message = 'Código requerido para validación';
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createSuccessEnvelope({ error: message }, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
      } else {
        this.promptService.showError(message);
      }
      return;
    }

    logger.info('Validating code against standards');

    const service = new StandardsService(fs, process.cwd());
    const result = await service.validate(code);

    if (json) {
      console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
      return;
    }

    this.promptService.showInfo(chalk.bold('\nValidation Results'));
    this.promptService.showInfo(`Total Rules: ${result.totalRules}`);
    this.promptService.showInfo(chalk.green(`Passed: ${result.passed}`));
    this.promptService.showInfo(chalk.red(`Failed: ${result.failed}`));

    if (result.failed > 0) {
      this.promptService.showInfo(chalk.bold('\nFailed Rules:'));
      result.results
        .filter(r => !r.passed)
        .forEach(r => {
          const icon = r.severity === 'error' ? '🔴' : '🟡';
          this.promptService.showInfo(`  ${icon} ${r.standardId}/${r.ruleId}: ${r.ruleName}`);
          this.promptService.showInfo(`      ${r.message}`);
        });
    }
  }

  private async exportStandard(fs: IFileSystem, id: string, format?: string, json = false, meta?: any, startedAt?: number): Promise<void> {
    logger.info('Exporting standard', { id, format });

    const service = new StandardsService(fs, process.cwd());
    const fmt = (format as 'json' | 'markdown') || 'markdown';

    try {
      const output = await service.export(id, fmt);
      if (json) {
        const result = {
          id,
          format: fmt,
          output,
        };
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
      } else {
        this.promptService.showInfo(`\n${output}\n`);
      }
    } catch (error) {
      logger.error('Failed to export standard', { error });
      if (json) {
        process.exitCode = 1;
        const message = error instanceof Error ? error.message : String(error);
        console.log(JSON.stringify(createSuccessEnvelope({ success: false, error: message }, { ...meta, durationMs: Date.now() - (startedAt || Date.now()) }), null, 2));
      } else {
        this.promptService.showError(`Error exportando standard: ${error}`);
      }
    }
  }

  @Option({
    flags: '--init',
    description: 'Inicializar estructura de standards',
  })
  parseInit(): boolean {
    return true;
  }

  @Option({
    flags: '-l, --list',
    description: 'Listar todos los standards',
  })
  parseList(): boolean {
    return true;
  }

  @Option({
    flags: '-g, --get [id]',
    description: 'Ver standard específico',
  })
  parseGet(val: string): string {
    return val;
  }

  @Option({
    flags: '-v, --validate [code]',
    description: 'Validar código contra standards',
  })
  parseValidate(val: string): string {
    return val;
  }

  @Option({
    flags: '-e, --export [id]',
    description: 'Exportar standard',
  })
  parseExport(val: string): string {
    return val;
  }

  @Option({
    flags: '-f, --format [format]',
    description: 'Formato de exportación: markdown, json',
  })
  parseFormat(val: string): string {
    return val;
  }

  @Option({
    flags: '-c, --category [category]',
    description: 'Filtrar por categoría',
  })
  parseCategory(val: string): string {
    return val;
  }
}