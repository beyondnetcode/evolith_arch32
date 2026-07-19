import { SubCommand, Option } from 'nest-commander';
import { Inject } from '@nestjs/common';
import chalk from 'chalk';
import {
  PatternCatalogService,
  type TopologyPatternApplication,
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

interface ForTopologyOptions {
  core?: string;
  format?: string;
}

/**
 * `evolith patterns for-topology <topologyId>` — "which patterns apply to me, how
 * strongly, and what rules do they impose?".
 *
 * Distinct from `patterns list --topology <id>`: that one filters the catalogue and
 * returns bare records, while this returns the per-topology applicability + guidance
 * + enforcing rules, ordered required → recommended → optional (`listByTopology`).
 */
@SubCommand({
  name: 'for-topology',
  arguments: '<topologyId>',
  description: 'Patterns applicable to a topology, ordered required → recommended → optional',
})
export class PatternsForTopologyCommand extends BaseEvolithCommand {
  constructor(
    @Inject('IFileSystem') private readonly fileSystem: IFileSystem,
    @Inject('ILogger') private readonly domainLogger: ILogger,
  ) {
    super('PatternsForTopologyCommand');
  }

  async executeCommand(passedParam: string[], options?: ForTopologyOptions): Promise<void> {
    const opts = options ?? {};
    const json = opts.format === 'json';
    const startedAt = Date.now();
    const meta = buildMeta('evolith patterns for-topology');
    const topologyId = (passedParam?.[0] ?? '').trim();

    if (!topologyId) {
      const message = 'A topology id is required, e.g. `evolith patterns for-topology microservices`.';
      if (json) return emitError('VALIDATION_FAILED', message, meta, startedAt);
      this.promptService.showError(message);
      process.exitCode = 1;
      return;
    }

    const service = new PatternCatalogService(this.fileSystem, this.domainLogger);
    const corePath = resolveCorePath(opts.core, this.profile.core);

    let applications: TopologyPatternApplication[];
    try {
      applications = await service.listByTopology(corePath, topologyId);
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
          topology: topologyId,
          count: applications.length,
          applications: applications.map((a) => ({
            id: a.pattern.id,
            name: a.pattern.name,
            kind: a.pattern.kind,
            category: a.pattern.category,
            applicability: a.applicability,
            guidance: a.guidance,
            enforcedBy: a.enforcedBy.map((e) => ({ ruleId: e.ruleId, engine: e.engine })),
          })),
        },
        meta,
        startedAt,
      );
      return;
    }

    this.printHuman(topologyId, applications);
  }

  private printHuman(topologyId: string, applications: TopologyPatternApplication[]): void {
    if (applications.length === 0) {
      this.promptService.showWarning(`No canonical pattern declares applicability for topology "${topologyId}".`);
      return;
    }

    console.log(chalk.bold(`\nPatterns applicable to ${chalk.cyan(topologyId)}: ${applications.length}\n`));
    for (const a of applications) {
      console.log(
        `  ${chalk.cyan(a.pattern.id)} ${chalk.bold(a.applicability.toUpperCase())} — ${a.pattern.name}`,
      );
      if (a.guidance) console.log(`    ${chalk.gray(a.guidance)}`);
      if (a.enforcedBy.length) {
        console.log(`    ${chalk.gray(`enforced by: ${a.enforcedBy.map((e) => e.ruleId).join(', ')}`)}`);
      }
    }
    console.log('');
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
