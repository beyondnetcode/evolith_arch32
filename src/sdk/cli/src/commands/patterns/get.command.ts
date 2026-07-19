import { SubCommand, Option } from 'nest-commander';
import { Inject } from '@nestjs/common';
import chalk from 'chalk';
import {
  PatternCatalogService,
  type PatternRecord,
} from '@beyondnet/evolith-core-domain/application/services';
import type { IFileSystem, ILogger } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import {
  buildMeta,
  classifyCatalogError,
  emitError,
  emitSuccess,
  resolveCorePath,
} from './patterns.shared';

interface PatternsGetOptions {
  core?: string;
  format?: string;
}

/**
 * `evolith patterns get <id>` — one canonical pattern in full (PAT-0014 / pat-0014).
 *
 * A missing id is a FAILURE, not an empty success: it emits an IO_ERROR envelope
 * and exit code 1 so a script cannot read "not found" as "found".
 */
@SubCommand({
  name: 'get',
  arguments: '<id>',
  description: 'Show one canonical pattern by id (e.g. PAT-0014)',
})
export class PatternsGetCommand extends BaseEvolithCommand {
  constructor(
    @Inject('IFileSystem') private readonly fileSystem: IFileSystem,
    @Inject('ILogger') private readonly domainLogger: ILogger,
  ) {
    super('PatternsGetCommand');
  }

  async executeCommand(passedParam: string[], options?: PatternsGetOptions): Promise<void> {
    const opts = options ?? {};
    const json = opts.format === 'json';
    const startedAt = Date.now();
    const meta = buildMeta('evolith patterns get');
    const id = (passedParam?.[0] ?? '').trim();

    if (!id) {
      const message = 'A pattern id is required, e.g. `evolith patterns get PAT-0014`.';
      if (json) return emitError('VALIDATION_FAILED', message, meta, startedAt);
      this.promptService.showError(message);
      process.exitCode = 1;
      return;
    }

    const service = new PatternCatalogService(this.fileSystem, this.domainLogger);
    const corePath = resolveCorePath(opts.core, this.profile.core);

    let pattern: PatternRecord | undefined;
    try {
      pattern = await service.get(corePath, id);
    } catch (error: unknown) {
      const { code, message } = classifyCatalogError(error);
      if (json) return emitError(code, message, meta, startedAt);
      this.promptService.showError(message);
      process.exitCode = 1;
      return;
    }

    if (!pattern) {
      const message = `Pattern ${id} not found in the canonical catalogue.`;
      if (json) return emitError('IO_ERROR', message, meta, startedAt);
      this.promptService.showError(message);
      process.exitCode = 1;
      return;
    }

    if (json) {
      emitSuccess(pattern, meta, startedAt);
      return;
    }

    this.printHuman(pattern);
  }

  private printHuman(pattern: PatternRecord): void {
    console.log(chalk.bold(`\n${pattern.id}: ${pattern.name}\n`));
    console.log(`Kind:     ${chalk.cyan(pattern.kind)}`);
    console.log(`Category: ${chalk.cyan(pattern.category)}`);
    console.log(`Status:   ${chalk.cyan(pattern.status)}`);
    console.log(`\n${chalk.bold('Problem:')}\n${pattern.problem}`);
    console.log(`\n${chalk.bold('Solution:')}\n${pattern.solution}`);

    if (pattern.appliesTo?.length) {
      console.log(`\n${chalk.bold('Applies to:')}`);
      for (const a of pattern.appliesTo) {
        console.log(`  ${chalk.cyan(a.topology)} — ${a.applicability}`);
      }
    }

    if (pattern.enforcedBy?.length) {
      console.log(`\n${chalk.bold('Enforced by:')}`);
      for (const e of pattern.enforcedBy) {
        console.log(`  ${chalk.yellow(e.ruleId)} ${chalk.gray(`(${e.engine})`)}`);
      }
    }
  }

  @Option({ flags: '-c, --core <path>', description: 'Path to the Evolith core repository (default: profile.core or cwd)' })
  parseCore(val: string): string {
    return val;
  }

  @Option({
    flags: '-f, --format <string>',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }
}
