import { Command, Option } from 'nest-commander';
import chalk from 'chalk';
import { Inject } from '@nestjs/common';
import { StandardsService, StandardCategory } from '../../domain/services/standards.service';
import { IFileSystem } from '../../domain/interfaces';
import { logger } from '../../infrastructure/observability';
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

    if (options?.init) {
      await this.initializeStandards(fs);
    } else if (options?.list) {
      await this.listStandards(fs, options.category);
    } else if (options?.get) {
      await this.getStandard(fs, options.get);
    } else if (options?.validate) {
      await this.validateStandards(fs, options.validate);
    } else if (options?.export) {
      await this.exportStandard(fs, options.export, options.format);
    } else {
      await this.interactiveMode(fs);
    }
  }

  private async interactiveMode(fs: IFileSystem): Promise<void> {
    console.clear();
    this.promptService.showIntro('Evolith Standards - Corporate Standards Management');

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
        await this.initializeStandards(fs);
        break;
      case 'list':
        await this.listStandards(fs);
        break;
      case 'get':
        const id = await this.promptService.text({ message: 'ID del Standard:' });
        await this.getStandard(fs, id as string);
        break;
      case 'validate':
        const code = await this.promptService.text({ message: 'Código a validar:' });
        await this.validateStandards(fs, code as string);
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
        await this.exportStandard(fs, exportId as string, format as string);
        break;
    }
  }

  private async initializeStandards(fs: IFileSystem): Promise<void> {
    logger.info('Initializing standards directory structure');

    const service = new StandardsService(fs, process.cwd());
    this.promptService.startSpinner('Inicializando...');

    try {
      await service.initialize();
      this.promptService.stopSpinner();
      this.promptService.showSuccess('✓ Estructura de standards creada');
      this.promptService.showInfo('  Ubicación: reference/standards/');
      this.promptService.showInfo('  Subcarpetas: rulesets/, templates/');
      this.promptService.showInfo('\nPara ver los standards disponibles, usa: evolith standards --list');
    } catch (error) {
      this.promptService.stopSpinner();
      logger.error('Failed to initialize standards', { error });
      this.promptService.showError('✗ Error inicializando standards');
    }
  }

  private async listStandards(fs: IFileSystem, category?: string): Promise<void> {
    logger.info('Listing standards', { category });

    const service = new StandardsService(fs, process.cwd());
    const cat = category as StandardCategory | undefined;
    const standards = await service.list(cat);

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

  private async getStandard(fs: IFileSystem, id: string): Promise<void> {
    logger.info('Getting standard', { id });

    const service = new StandardsService(fs, process.cwd());
    const standard = await service.get(id);

    if (!standard) {
      this.promptService.showError(`Standard ${id} no encontrado`);
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

  private async validateStandards(fs: IFileSystem, code: string): Promise<void> {
    if (!code) {
      this.promptService.showError('Código requerido para validación');
      return;
    }

    logger.info('Validating code against standards');

    const service = new StandardsService(fs, process.cwd());
    const result = await service.validate(code);

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

  private async exportStandard(fs: IFileSystem, id: string, format?: string): Promise<void> {
    logger.info('Exporting standard', { id, format });

    const service = new StandardsService(fs, process.cwd());
    const fmt = (format as 'json' | 'markdown') || 'markdown';

    try {
      const output = await service.export(id, fmt);
      this.promptService.showInfo(`\n${output}\n`);
    } catch (error) {
      logger.error('Failed to export standard', { error });
      this.promptService.showError(`Error exportando standard: ${error}`);
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