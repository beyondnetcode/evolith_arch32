import { SubCommand, Option } from 'nest-commander';
import { Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import chalk from 'chalk';
import {
  TopologyCatalogService,
  PhaseArtifactProfileService,
  type TopologyDesignProfile,
  type DownstreamPhase,
  type PhaseArtifactResult,
} from '@beyondnet/evolith-core-domain/application/services';
import type { IFileSystem, ILogger } from '@beyondnet/evolith-core-domain/domain/interfaces';
import {
  createSuccessEnvelope,
  createErrorEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { resolveRulesets } from '../../infrastructure/paths/rulesets-resolver';
import { exitCodeForErrorCode } from '../../infrastructure/cli/exit-codes';

const DOWNSTREAM_PHASES: readonly DownstreamPhase[] = ['construction', 'quality', 'deployment'];

interface PhaseArtifactsOptions {
  core?: string;
  phase?: DownstreamPhase;
  topologies?: string[];
  declared?: string[];
  format?: string;
}

/**
 * `evolith topology phase-artifacts` — advisory downstream phase-artifact
 * completeness (GT-434 / ADR-0104 · DN-06).
 *
 * For a downstream phase (construction/quality/deployment) and a confirmed
 * topology composition, measures the declared artifacts against the UNION of the
 * universal per-phase artifacts and each topology's `spec.phaseProfiles`.
 * Stateless and non-binding: the Core MEASURES; the tenant's gate decides.
 *
 * BR-008 parity with `POST /api/v1/architecture/evaluate-phase-artifacts` and the
 * `evolith-phase-artifacts-evaluate` MCP tool — all share
 * {@link PhaseArtifactProfileService.evaluate}.
 */
@SubCommand({
  name: 'phase-artifacts',
  description: 'Measure downstream-phase artifact completeness for a topology composition (advisory, non-binding)',
})
export class PhaseArtifactsCommand extends BaseEvolithCommand {
  constructor(
    @Inject('IFileSystem') private readonly fileSystem: IFileSystem,
    @Inject('ILogger') private readonly coreLogger: ILogger,
  ) {
    super('PhaseArtifactsCommand');
  }

  async executeCommand(_passedParam: string[], options?: PhaseArtifactsOptions): Promise<void> {
    const opts = options ?? {};
    // Resolve the topology catalog root from an explicit --core/profile override,
    // else the rulesets bundled with the CLI. Never fall back to process.cwd().
    const coreOverride = opts.core || this.profile.core || undefined;
    const json = opts.format === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith topology phase-artifacts',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    const phase = opts.phase;
    if (!phase || !DOWNSTREAM_PHASES.includes(phase)) {
      const message = `--phase must be one of: ${DOWNSTREAM_PHASES.join(', ')}`;
      if (json) {
        process.exitCode = exitCodeForErrorCode('INVALID_PHASE');
        console.log(JSON.stringify(createErrorEnvelope('INVALID_PHASE', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        return;
      }
      throw new Error(message);
    }
    const topologies = opts.topologies ?? [];
    const declared = opts.declared ?? [];

    try {
      const { coreRoot } = resolveRulesets(coreOverride);
      const catalog = new TopologyCatalogService(this.fileSystem, this.coreLogger);
      // Pre-resolve each topology's phaseProfiles once, then pass a sync accessor.
      const profilesByTopo = new Map<string, Partial<Record<DownstreamPhase, TopologyDesignProfile>> | undefined>();
      for (const topo of new Set(topologies)) {
        profilesByTopo.set(topo, (await catalog.get(coreRoot, topo))?.spec.phaseProfiles);
      }
      const getPhaseProfile = (topo: string, p: DownstreamPhase): TopologyDesignProfile | undefined =>
        profilesByTopo.get(topo)?.[p];

      const result = new PhaseArtifactProfileService().evaluate(phase, topologies, declared, getPhaseProfile);

      if (json) {
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        return;
      }

      this.printResult(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (json) {
        process.exitCode = 1;
        console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', message, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        return;
      }
      throw error; // Let BaseEvolithCommand render the failure.
    }
  }

  private printResult(result: PhaseArtifactResult): void {
    console.log(chalk.bold(`\n📦 Phase-Artifact Completeness — ${chalk.cyan(result.phase)}\n`));
    console.log(`${chalk.bold('Completeness:')} ${chalk.cyan(`${result.completeness}/100`)}`);
    console.log(chalk.gray('(advisory & non-binding — the tenant gate decides)'));

    console.log(chalk.bold('\nPresent:'));
    for (const a of result.presentArtifacts) console.log(`  ${chalk.green('✓')} ${a}`);
    console.log(chalk.bold('\nMissing:'));
    for (const a of result.missingArtifacts) console.log(`  ${chalk.red('✗')} ${a}`);
    if (result.conditionalArtifacts.length > 0) {
      console.log(chalk.bold('\nConditional (informational):'));
      for (const a of result.conditionalArtifacts) console.log(`  ${chalk.yellow('?')} ${a}`);
    }
    console.log('');
  }

  @Option({
    flags: '-c, --core <path>',
    description: 'Path to the Evolith core repository (default: profile.core or cwd)',
  })
  parseCore(val: string): string {
    return val;
  }

  @Option({
    flags: '-p, --phase <phase>',
    description: 'Downstream SDLC phase: construction | quality | deployment',
  })
  parsePhase(val: string): DownstreamPhase {
    return val as DownstreamPhase;
  }

  @Option({
    flags: '-t, --topologies <list>',
    description: 'Confirmed topology composition (comma-separated ids), e.g. microservices,event-driven',
  })
  parseTopologies(val: string): string[] {
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }

  @Option({
    flags: '-d, --declared <list>',
    description: 'Artifact kinds declared as present (comma-separated), e.g. test-summary-report,coverage-report',
  })
  parseDeclared(val: string): string[] {
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }

  @Option({
    flags: '-f, --format <string>',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }
}
