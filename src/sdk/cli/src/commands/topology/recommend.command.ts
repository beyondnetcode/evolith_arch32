import { SubCommand, Option } from 'nest-commander';
import { Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import chalk from 'chalk';
import {
  TopologyRecommendationService,
  type TopologyRecommendationRules,
  type TopologyRecommendationSignals,
  type TopologyRecommendation,
} from '@beyondnet/evolith-core-domain/application/services';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import {
  createSuccessEnvelope,
  createErrorEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import * as path from 'node:path';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { resolveRulesets } from '../../infrastructure/paths/rulesets-resolver';

interface RecommendOptions {
  core?: string;
  signals?: TopologyRecommendationSignals;
  teamCount?: number;
  deploymentIndependence?: boolean;
  highScale?: boolean;
  asyncIntegration?: boolean;
  dataProductSharing?: boolean;
  spikyLoad?: boolean;
  latencyTolerant?: boolean;
  edgeOrOffline?: boolean;
  aiAgents?: boolean;
  format?: string;
}

/**
 * `evolith topology recommend` — advisory topology recommendation (GT-430 / ADR-0104).
 *
 * Given technical signals (individual flags and/or a `--signals` JSON payload),
 * loads `src/rulesets/architecture/topology-recommendation.rules.json` from the
 * core repository and prints the recommended composition + rationale. Stateless
 * and non-binding: the Core RECOMMENDS (Discovery), the tenant CONFIRMS (Design).
 *
 * BR-008 parity with `POST /api/v1/architecture/recommend-topology` and the
 * `evolith-topology-recommend` MCP tool — all share
 * {@link TopologyRecommendationService.recommend}.
 */
@SubCommand({
  name: 'recommend',
  description: 'Recommend a topology composition from technical signals (advisory, non-binding)',
})
export class RecommendCommand extends BaseEvolithCommand {
  constructor(@Inject('IFileSystem') private readonly fileSystem: IFileSystem) {
    super('RecommendCommand');
  }

  async executeCommand(_passedParam: string[], options?: RecommendOptions): Promise<void> {
    const opts = options ?? {};
    // Resolve rulesets from an explicit --core/profile override, else the
    // rulesets bundled with the CLI. Never fall back to process.cwd().
    const coreOverride = opts.core || this.profile.core || undefined;
    const json = opts.format === 'json';
    const startedAt = Date.now();
    const meta = {
      command: 'evolith topology recommend',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: randomUUID(),
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    };

    // Individual flags refine (override) whatever the --signals JSON payload sets.
    const flagSignals: Record<string, number | boolean> = {};
    if (opts.teamCount !== undefined) flagSignals.teamCount = opts.teamCount;
    if (opts.deploymentIndependence) flagSignals.deploymentIndependence = true;
    if (opts.highScale) flagSignals.highScale = true;
    if (opts.asyncIntegration) flagSignals.asyncIntegration = true;
    if (opts.dataProductSharing) flagSignals.dataProductSharing = true;
    if (opts.spikyLoad) flagSignals.spikyLoad = true;
    if (opts.latencyTolerant) flagSignals.latencyTolerant = true;
    if (opts.edgeOrOffline) flagSignals.edgeOrOffline = true;
    if (opts.aiAgents) flagSignals.aiAgents = true;
    const signals: TopologyRecommendationSignals = { ...(opts.signals ?? {}), ...flagSignals };

    try {
      const { rulesetsRoot } = resolveRulesets(coreOverride);
      const rulesPath = path.join(rulesetsRoot, 'architecture', 'topology-recommendation.rules.json');
      const rules = JSON.parse(await this.fileSystem.readFile(rulesPath)) as TopologyRecommendationRules;
      const result = new TopologyRecommendationService().recommend(rules, signals);

      if (json) {
        console.log(JSON.stringify(createSuccessEnvelope(result, { ...meta, durationMs: Date.now() - startedAt }), null, 2));
        return;
      }

      this.printRecommendation(result);
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

  private printRecommendation(result: TopologyRecommendation): void {
    console.log(chalk.bold('\n🧭 Recommended Topology Composition\n'));
    console.log(`${chalk.bold('Composition:')} ${chalk.cyan(result.composition)}`);
    console.log(chalk.gray('(advisory & non-binding — the tenant confirms in Design)'));

    console.log(chalk.bold('\nRationale:'));
    for (const r of result.rationale) {
      console.log(`  ${chalk.green('•')} ${chalk.bold(r.topology)} ${chalk.gray(`[${r.ruleId}]`)}`);
      console.log(`    ${chalk.gray(r.reason)}`);
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
    flags: '-s, --signals <json>',
    description: 'Technical signals as a JSON object, e.g. \'{"asyncIntegration":true,"teamCount":4}\'',
  })
  parseSignals(val: string): TopologyRecommendationSignals {
    try {
      const parsed = JSON.parse(val);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('signals must be a JSON object');
      }
      return parsed as TopologyRecommendationSignals;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid --signals payload: ${message}`);
    }
  }

  @Option({
    flags: '--team-count <n>',
    description: 'Number of autonomous teams/squads',
  })
  parseTeamCount(val: string): number {
    const n = parseInt(val, 10);
    if (isNaN(n)) throw new Error(`Invalid --team-count: "${val}"`);
    return n;
  }

  @Option({ flags: '--deployment-independence', description: 'Modules need independent CI/CD lifecycles' })
  parseDeploymentIndependence(): boolean {
    return true;
  }

  @Option({ flags: '--high-scale', description: 'High, independent scaling requirements' })
  parseHighScale(): boolean {
    return true;
  }

  @Option({ flags: '--async-integration', description: 'Asynchronous / event-driven integration' })
  parseAsyncIntegration(): boolean {
    return true;
  }

  @Option({ flags: '--data-product-sharing', description: 'Cross-domain analytical data sharing' })
  parseDataProductSharing(): boolean {
    return true;
  }

  @Option({ flags: '--spiky-load', description: 'Spiky / bursty workload profile' })
  parseSpikyLoad(): boolean {
    return true;
  }

  @Option({ flags: '--latency-tolerant', description: 'Workload tolerates higher latency' })
  parseLatencyTolerant(): boolean {
    return true;
  }

  @Option({ flags: '--edge-or-offline', description: 'Edge or offline-first execution' })
  parseEdgeOrOffline(): boolean {
    return true;
  }

  @Option({ flags: '--ai-agents', description: 'AI agents participate in the runtime' })
  parseAiAgents(): boolean {
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
