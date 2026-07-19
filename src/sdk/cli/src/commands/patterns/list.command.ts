import { SubCommand, Option } from 'nest-commander';
import { Inject } from '@nestjs/common';
import chalk from 'chalk';
import {
  PatternCatalogService,
  type PatternCatalogFilters,
  type PatternCategory,
  type PatternKind,
  type PatternRecord,
} from '@beyondnet/evolith-core-domain/application/services';
import type { IFileSystem, ILogger } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import {
  PATTERN_CATEGORIES,
  PATTERN_KINDS,
  buildMeta,
  classifyCatalogError,
  emitError,
  emitSuccess,
  parseEnforcedFlag,
  resolveCorePath,
} from './patterns.shared';

interface PatternsListOptions {
  core?: string;
  category?: string;
  kind?: string;
  topology?: string;
  enforced?: unknown;
  format?: string;
}

/**
 * `evolith patterns list` — list the canonical pattern catalogue (PAT-NNNN).
 *
 * Thin surface over {@link PatternCatalogService.list}; the filters map 1:1 onto
 * the service's own filters so CLI, MCP and REST answer the same question the
 * same way.
 */
@SubCommand({
  name: 'list',
  description: 'List canonical architectural patterns (PAT-NNNN), optionally filtered',
})
export class PatternsListCommand extends BaseEvolithCommand {
  constructor(
    @Inject('IFileSystem') private readonly fileSystem: IFileSystem,
    @Inject('ILogger') private readonly domainLogger: ILogger,
  ) {
    super('PatternsListCommand');
  }

  async executeCommand(_passedParam: string[], options?: PatternsListOptions): Promise<void> {
    const opts = options ?? {};
    const json = opts.format === 'json';
    const startedAt = Date.now();
    const meta = buildMeta('evolith patterns list');

    let filters: PatternCatalogFilters;
    try {
      filters = this.buildFilters(opts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (json) return emitError('VALIDATION_FAILED', message, meta, startedAt);
      this.promptService.showError(message);
      process.exitCode = 1;
      return;
    }

    const service = new PatternCatalogService(this.fileSystem, this.domainLogger);
    const corePath = resolveCorePath(opts.core, this.profile.core);

    let patterns: PatternRecord[];
    try {
      patterns = await service.list(corePath, filters);
    } catch (error: unknown) {
      const { code, message } = classifyCatalogError(error);
      if (json) return emitError(code, message, meta, startedAt);
      this.promptService.showError(message);
      process.exitCode = 1;
      return;
    }

    if (json) {
      emitSuccess(
        {
          count: patterns.length,
          filters,
          patterns: patterns.map((p) => ({
            id: p.id,
            name: p.name,
            kind: p.kind,
            category: p.category,
            status: p.status,
            enforcedBy: (p.enforcedBy ?? []).map((e) => e.ruleId),
            appliesTo: p.appliesTo.map((a) => ({ topology: a.topology, applicability: a.applicability })),
          })),
        },
        meta,
        startedAt,
      );
      return;
    }

    this.printHuman(patterns);
  }

  /** Rejects unknown enum values up front so a typo cannot silently return everything. */
  private buildFilters(opts: PatternsListOptions): PatternCatalogFilters {
    const filters: PatternCatalogFilters = {};

    if (opts.category) {
      if (!PATTERN_CATEGORIES.includes(opts.category as PatternCategory)) {
        throw new Error(
          `Invalid --category "${opts.category}". Expected one of: ${PATTERN_CATEGORIES.join(', ')}`,
        );
      }
      filters.category = opts.category as PatternCategory;
    }

    if (opts.kind) {
      if (!PATTERN_KINDS.includes(opts.kind as PatternKind)) {
        throw new Error(`Invalid --kind "${opts.kind}". Expected one of: ${PATTERN_KINDS.join(', ')}`);
      }
      filters.kind = opts.kind as PatternKind;
    }

    if (opts.topology) filters.topology = opts.topology;

    const enforced = parseEnforcedFlag(opts.enforced);
    if (enforced !== undefined) filters.enforced = enforced;

    return filters;
  }

  private printHuman(patterns: PatternRecord[]): void {
    if (patterns.length === 0) {
      this.promptService.showWarning('No patterns matched the given filters.');
      return;
    }

    console.log(chalk.bold(`\nCanonical patterns: ${patterns.length}\n`));
    for (const p of patterns) {
      const kindLabel = p.kind === 'anti-pattern' ? chalk.red('[anti-pattern]') : chalk.green('[pattern]');
      const enforcement = (p.enforcedBy ?? []).length;
      console.log(
        `  ${chalk.cyan(p.id)} ${kindLabel} ${p.name} ${chalk.gray(`(${p.category}, ${p.status}, ${enforcement} rule${enforcement === 1 ? '' : 's'})`)}`,
      );
    }
    console.log('');
  }

  @Option({ flags: '-c, --core <path>', description: 'Path to the Evolith core repository (default: profile.core or cwd)' })
  parseCore(val: string): string {
    return val;
  }

  @Option({
    flags: '--category <category>',
    description: `Filter by category: ${PATTERN_CATEGORIES.join(' | ')}`,
  })
  parseCategory(val: string): string {
    return val;
  }

  @Option({ flags: '--kind <kind>', description: 'Filter by kind: pattern | anti-pattern' })
  parseKind(val: string): string {
    return val;
  }

  @Option({ flags: '--topology <topologyId>', description: 'Keep only patterns applicable to this topology' })
  parseTopology(val: string): string {
    return val;
  }

  @Option({
    flags: '--enforced [bool]',
    description: 'true → only patterns backed by a rule; false → only unenforced ones',
  })
  parseEnforced(val: string): string | boolean {
    return val === undefined ? true : val;
  }

  @Option({
    flags: '-f, --format <string>',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }
}
