import * as path from 'path';
import { Inject } from '@nestjs/common';
import { Command, Option } from 'nest-commander';
import { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases/validate-satellite.use-case';
import { RulesetValidatorService } from '@beyondnet/evolith-core-domain/application/validators/ruleset-validator.service';
import { createSuccessEnvelope, createErrorEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain';
import { randomUUID } from 'node:crypto';
import type { IFileSystem, ILogger, IConfigParser } from '@beyondnet/evolith-core-domain/domain/interfaces';
import {
  EvaluationOrchestrator,
  createDefaultKindEvaluators,
  type EvaluationContext,
  type IEvaluationPipeline,
  type IWorkspaceReferenceResolver,
} from '@beyondnet/evolith-core-domain/evaluation';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';
import { resolveRulesets } from '../../infrastructure/paths/rulesets-resolver';

const CORE_VERSION = '1.0.5';

/** A user-input error (bad --context path or malformed JSON), distinct from an internal failure. */
class EvaluateInputError extends Error {}

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
    @Inject('IConfigParser') private readonly configParser: IConfigParser,
    private readonly rulesetValidator: RulesetValidatorService,
    promptService: PromptService,
    configService?: ConfigService,
  ) {
    super('EvaluateCommand', promptService, configService);
  }

  async executeCommand(_passed: string[], options?: EvaluateCommandOptions): Promise<void> {
    let ctx: EvaluationContext;
    try {
      ctx = await this.buildContext(options);
    } catch (err) {
      // A bad --context path or malformed JSON is a user-input error, not an
      // internal failure — emit a VALIDATION_FAILED envelope (not INTERNAL_ERROR
      // with a raw stack) so callers can distinguish their mistake from a bug.
      if (err instanceof EvaluateInputError) {
        const meta = {
          command: 'evolith evaluate',
          executedAt: new Date().toISOString(),
          durationMs: 0,
          correlationId: randomUUID(),
          schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
        };
        console.log(JSON.stringify(createErrorEnvelope('VALIDATION_FAILED', err.message, meta), null, 2));
        process.exit(1);
      }
      throw err;
    }

    // Resolve the Core/rulesets root: an explicit --core/profile override, else
    // the rulesets bundled with the CLI. Never fall back to process.cwd().
    const coreOverride = options?.core || this.profile.core || undefined;
    const resolvedCoreRoot = resolveRulesets(coreOverride).coreRoot;

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
        corePath: resolvedCoreRoot,
      }),
    };

    // BR-008 parity: register the same KindEvaluator set as core-api so non-core
    // kinds (architecture/checkpoint/topology/blueprint/deployment) actually evaluate
    // here instead of silently returning nothing.
    const evaluators = createDefaultKindEvaluators({
      fileSystem: this.fileSystem,
      logger: this.coreLogger,
      configParser: this.configParser,
      rulesetValidator: this.rulesetValidator,
      resolveCorePath: () => resolvedCoreRoot,
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

    // A negative evaluation verdict must exit non-zero so CI can gate on it,
    // mirroring `gate`/`phase` (envelope success=command-ran, exit=verdict).
    if (result.overallVerdict === 'FAIL' || result.outcome === 'rejected') {
      process.exit(1);
    }
  }

  private async buildContext(options?: EvaluateCommandOptions): Promise<EvaluationContext> {
    if (options?.context) {
      const fs = await import('fs-extra');
      const resolved = path.resolve(options.context);
      let raw: string;
      try {
        raw = await fs.readFile(resolved, 'utf-8');
      } catch {
        throw new EvaluateInputError(`Context file not found or unreadable: ${resolved}`);
      }
      let parsed: EvaluationContext;
      try {
        parsed = JSON.parse(raw) as EvaluationContext;
      } catch {
        throw new EvaluateInputError(`Context file is not valid JSON: ${resolved}`);
      }
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
