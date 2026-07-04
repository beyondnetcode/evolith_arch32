import * as path from 'path';
import { Inject } from '@nestjs/common';
import { Command, Option } from 'nest-commander';
import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases/validate-satellite.use-case';
import { createSuccessEnvelope } from '@evolith/core-domain';
import type { IFileSystem, ILogger } from '@evolith/core-domain/domain/interfaces';
import {
  EvaluationOrchestrator,
  createDefaultKindEvaluators,
  type EvaluationContext,
  type IEvaluationPipeline,
  type IWorkspaceReferenceResolver,
} from '@evolith/core-domain/evaluation';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';

const CORE_VERSION = '1.0.5';

interface EvaluateCommandOptions {
  context?: string;
  workspace?: string;
  core?: string;
  phase?: string;
  topology?: string;
  format?: string;
}

/**
 * `evolith evaluate` — CLI surface of the stateless Core Evaluation Engine
 * (GT-378 / ADR-0101), at parity (BR-008) with `POST /api/v1/evaluate`.
 *
 * Sends a canonical EvaluationContext to the EvaluationOrchestrator and prints
 * the EvaluationResult in the ADR-0073 envelope. Locally (trusted), the opaque
 * `workspaceRef` is interpreted as a local path.
 */
@Command({
  name: 'evaluate',
  description: 'Evaluate an EvaluationContext (gates, artifacts, rules, compliance) and print an EvaluationResult',
})
export class EvaluateCommand extends BaseEvolithCommand {
  constructor(
    private readonly useCase: ValidateSatelliteUseCase,
    @Inject('IFileSystem') private readonly fileSystem: IFileSystem,
    @Inject('ILogger') private readonly coreLogger: ILogger,
    promptService: PromptService,
    configService?: ConfigService,
  ) {
    super('EvaluateCommand', promptService, configService);
  }

  async executeCommand(_passed: string[], options?: EvaluateCommandOptions): Promise<void> {
    const ctx = await this.buildContext(options);

    const pipeline: IEvaluationPipeline = {
      evaluate: async (manifest) => {
        const out = await this.useCase.execute({
          satellitePath: manifest.satellitePath,
          corePath: manifest.corePath,
          manifest,
        });
        if (!out.evaluationVerdict) {
          throw new Error('Evaluation pipeline produced no verdict');
        }
        return out.evaluationVerdict;
      },
    };

    // CLI is local and trusted: workspaceRef is a local path.
    const resolver: IWorkspaceReferenceResolver = {
      resolve: async (ref: string) => ({
        satellitePath: path.resolve(ref),
        corePath: options?.core || this.profile.core || undefined,
      }),
    };

    // BR-008 parity: register the same KindEvaluator set as core-api so non-core
    // kinds (architecture/checkpoint/topology/blueprint/deployment) actually evaluate
    // here instead of silently returning nothing.
    const evaluators = createDefaultKindEvaluators({
      fileSystem: this.fileSystem,
      logger: this.coreLogger,
      resolveCorePath: () => options?.core || this.profile.core || process.cwd(),
    });
    const orchestrator = new EvaluationOrchestrator(pipeline, resolver, CORE_VERSION, evaluators);
    const result = await orchestrator.evaluate(ctx);

    const envelope = createSuccessEnvelope(result, {
      command: 'evolith evaluate',
      executedAt: result.evaluatedAt,
      durationMs: 0,
      correlationId: result.correlationId ?? `cli-eval-${result.evaluatedAt}`,
      schemaVersion: result.schemaVersion,
    });

    const format = options?.format || 'json';
    if (format === 'json') {
      console.log(JSON.stringify(envelope, null, 2));
    } else {
      this.promptService.showInfo(`Verdict: ${result.overallVerdict} (${result.outcome}) — confidence ${result.confidence.toFixed(2)}`);
      if (result.gaps.length > 0) {
        this.promptService.showWarning(`${result.gaps.length} gap(s), ${result.requiredActions.length} required action(s)`);
      }
      console.log(JSON.stringify(envelope, null, 2));
    }
  }

  private async buildContext(options?: EvaluateCommandOptions): Promise<EvaluationContext> {
    if (options?.context) {
      const fs = await import('fs-extra');
      const resolved = path.resolve(options.context);
      const raw = await fs.readFile(resolved, 'utf-8');
      const parsed = JSON.parse(raw) as EvaluationContext;
      // Default workspaceRef to the satellite profile/cwd if the file omits it.
      if (!parsed.workspaceRef) {
        return { ...parsed, workspaceRef: this.profile.satellite || process.cwd() };
      }
      return parsed;
    }

    // Build a minimal context from flags.
    return {
      kinds: ['gate', 'compliance'],
      workspaceRef: options?.workspace || this.profile.satellite || process.cwd(),
      phaseId: options?.phase as EvaluationContext['phaseId'],
      topologyRef: options?.topology,
    };
  }

  @Option({ flags: '--context [path]', description: 'Path to a JSON file with a canonical EvaluationContext' })
  parseContext(val: string): string {
    return val;
  }

  @Option({ flags: '-w, --workspace [path]', description: 'Local workspace path (interpreted as workspaceRef; default: profile/cwd)' })
  parseWorkspace(val: string): string {
    return val;
  }

  @Option({ flags: '-c, --core [path]', description: 'Path to the Evolith Core repository (default: auto-detect)' })
  parseCore(val: string): string {
    return val;
  }

  @Option({ flags: '-p, --phase [id]', description: 'Canonical SDLC phase id (discovery|design|construction|qa|release)' })
  parsePhase(val: string): string {
    return val;
  }

  @Option({ flags: '-t, --topology [id]', description: 'Topology reference/override' })
  parseTopology(val: string): string {
    return val;
  }

  @Option({ flags: '-f, --format [string]', description: 'Output format (json | text). Default: json' })
  parseFormat(val: string): string {
    return val;
  }
}
