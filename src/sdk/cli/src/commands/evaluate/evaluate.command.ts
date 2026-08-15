import * as path from 'path';
import { Inject } from '@nestjs/common';
import { Command, Option } from 'nest-commander';
import { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases/validate-satellite.use-case';
import { RulesetValidatorService } from '@beyondnet/evolith-core-domain/application/validators/ruleset-validator.service';
import { createSuccessEnvelope, createErrorEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain';
import { randomUUID } from 'node:crypto';
import type { IFileSystem, ILogger, IConfigParser } from '@beyondnet/evolith-core-domain/domain/interfaces';
import type { IWaiverStore } from '@beyondnet/evolith-core-domain/domain/waiver';
import {
  EvaluationOrchestrator,
  createDefaultKindEvaluators,
  exportEvaluationResultToSarif,
  emitEvaluationEvidence,
  evaluateDriftGate,
  PrCommentFallbackPublisher,
  DRIFT_GATE_SOURCE,
  type CodeownersRule,
  type EvaluationContext,
  type IEvaluationPipeline,
  type IWorkspaceReferenceResolver,
} from '@beyondnet/evolith-core-domain/evaluation';
import {
  createEvaluationIngestClientFromEnv,
  depositEvaluation,
  loadCodeownersFromWorkspace,
  openWaiverStoreForRead,
  MissingWaiverStoreError,
  type TrackerEvaluationIngestClient,
} from '@beyondnet/evolith-infra-providers';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { ConfigService } from '../../infrastructure/config/config.service';
import { resolveRulesets } from '../../infrastructure/paths/rulesets-resolver';
import { resolveCoreOverride } from '../../infrastructure/paths/core-resolver';
import { CLI_EXIT_CODES, exitWith } from '../../infrastructure/cli/exit-codes';

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
  evidence?: string;
  waivers?: string;
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

    // GT-456: Resolve the Core/rulesets root through the unified override chain
    // (--core → EVOLITH_CORE_PATH → profile.core), else the rulesets bundled with
    // the CLI. Never fall back to process.cwd().
    const coreOverride = resolveCoreOverride({ explicit: options?.core, profileCore: this.profile.core });
    const resolvedCoreRoot = resolveRulesets(coreOverride).coreRoot;

    const pipeline: IEvaluationPipeline = {
      // GT-614: forward the execution plan so `--kind compliance` costs what it
      // asks for here too. The CLI is the reference surface; if it kept paying for
      // every gate, the three surfaces would disagree on the same request.
      evaluate: async (manifest, plan) => {
        const out = await this.useCase.execute({
          satellitePath: manifest.satellitePath,
          corePath: manifest.corePath,
          manifest,
          plan,
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

    // GT-677: ONE anchor for every workspace-relative input this command reads —
    // CODEOWNERS and the waiver store. The writer (`evolith waiver`) resolves the
    // store with the same function against the same workspace, which is what makes
    // an approved waiver visible here regardless of the cwd it was approved from.
    const workspaceRoot = path.resolve(ctx.workspaceRef ?? process.cwd());
    let waiverStore: IWaiverStore;
    try {
      // Reading, not writing: an explicit `--waivers` path that is not there must be a
      // loud user error. Adversarial verification of this very fix measured the opposite
      // — `--waivers .evolith/waivers.json` from outside the workspace resolved somewhere
      // empty and the run reported `blocking 95 frozen 0`, suppressing nothing while
      // looking successful. That is GT-677's own defect one level down.
      waiverStore = openWaiverStoreForRead(workspaceRoot, options?.waivers);
    } catch (err) {
      if (err instanceof MissingWaiverStoreError) {
        console.log(
          JSON.stringify(
            createErrorEnvelope('VALIDATION_FAILED', err.message, {
              command: 'evolith evaluate',
              executedAt: result.evaluatedAt,
              durationMs: 0,
              correlationId: result.correlationId ?? `cli-eval-${result.evaluatedAt}`,
              schemaVersion: result.schemaVersion,
            }),
            null,
            2,
          ),
        );
        process.exit(1);
      }
      throw err;
    }

    // GT-518: emit the enforcer-evidence manifest (EVD-01..03 via the unified evidence
    // normalizer) as a side output when requested — independent of the stdout format so
    // SARIF stays a pure SARIF log. Carries the same evidence shape every surface produces.
    if (options?.evidence) {
      const fs = await import('fs-extra');
      // GT-677: the manifest is the artifact CI reads for blockingFailures/frozen. Emitting it
      // waiver-blind while the gate suppresses would make the two disagree inside one run.
      const manifest = emitEvaluationEvidence(result, DRIFT_GATE_SOURCE, { waivers: waiverStore });
      await fs.writeFile(path.resolve(options.evidence), JSON.stringify(manifest, null, 2), 'utf-8');
    }

    // GT-604: the deposit path. `undefined` when this installation is not configured
    // to talk to a Tracker, which is a standalone run and not a failure.
    const ingestClient = createEvaluationIngestClientFromEnv(process.env);

    const format = options?.format || 'json';
    if (format === 'sarif') {
      // GT-518: emit a SARIF 2.1.0 log (gaps/risks as `result`s) for the CI/PR
      // drift gate and any SARIF-consuming code scanner (GitHub code scanning).
      console.log(JSON.stringify(exportEvaluationResultToSarif(result)));
    } else if (format === 'drift') {
      // GT-518: the PR/CI drift gate. Cite the violated ADR + accountable owner
      // (resolved from CODEOWNERS), print the PR-comment body and exit non-zero on
      // block. The live Checks-API publish is deploy-gated behind IChecksPublisher;
      // this is the mandated deploy-gate-free fallback (never a silent no-op).
      const codeowners = await this.loadCodeowners(workspaceRoot);
      const decision = evaluateDriftGate({ result, codeowners, waivers: waiverStore });
      const published = await new PrCommentFallbackPublisher().publish(decision);
      console.log(published.body);
      // GT-604: deposit BEFORE the exit. A run that blocks is precisely the run whose
      // evidence matters, and exiting first would lose exactly those.
      await this.depositEvidence({
        client: ingestClient,
        result,
        violations: decision.evidence.violations,
        surface: 'drift-gate',
        correlationId: envelope.meta.correlationId,
      });
      // The drift gate's non-zero exit means the gate BLOCKS, not that the tool broke.
      if (published.exitCode !== 0) exitWith(CLI_EXIT_CODES.BLOCKED);
      return;
    } else if (format === 'json') {
      console.log(JSON.stringify(envelope, null, 2));
    } else {
      this.promptService.showInfo(`Verdict: ${result.overallVerdict} (${result.outcome}) — confidence ${result.confidence.toFixed(2)}`);
      if (result.gaps.length > 0) {
        this.promptService.showWarning(`${result.gaps.length} gap(s), ${result.requiredActions.length} required action(s)`);
      }
      console.log(JSON.stringify(envelope, null, 2));
    }

    // GT-604: same deposit for the non-drift formats, tagged as the `cli` surface.
    // Before the exit, for the same reason as above.
    await this.depositEvidence({
      client: ingestClient,
      result,
      violations: evaluateDriftGate({
        result,
        codeowners: await this.loadCodeowners(workspaceRoot),
        waivers: waiverStore,
      }).evidence.violations,
      surface: 'cli',
      correlationId: envelope.meta.correlationId,
    });

    // A negative evaluation verdict must exit non-zero so CI can gate on it,
    // mirroring `gate`/`phase` (envelope success=command-ran, exit=verdict).
    if (result.overallVerdict === 'FAIL' || result.outcome === 'rejected') {
      exitWith(CLI_EXIT_CODES.BLOCKED);
    }
  }

  /**
   * GT-604 — deposit this run's verdict in the Tracker's evidence ledger.
   *
   * <p>Every field the ledger row carries is mapped by the SHARED contract
   * (`toEvaluationIngestPayload`, inside the shared client), never here: this
   * command decides only WHICH surface it is and WHICH violations belong to the
   * run. The canonical violations come from `evaluateDriftGate`, the same
   * CODEOWNERS-enriched set the drift gate blocks on, so the ledger's accountable
   * owner is the one the PR comment names.</p>
   *
   * <p>A failed deposit is reported on stderr and changes NOTHING about the
   * verdict or the exit code. Making the gate depend on the ledger's availability
   * would mean a Tracker outage silently opens the gate.</p>
   */
  private async depositEvidence(input: {
    client?: TrackerEvaluationIngestClient;
    result: Parameters<typeof evaluateDriftGate>[0]['result'];
    violations: Parameters<typeof depositEvaluation>[0]['violations'];
    surface: 'cli' | 'drift-gate';
    correlationId: string;
  }): Promise<void> {
    if (!input.client) return;

    await depositEvaluation({
      client: input.client,
      result: input.result,
      violations: input.violations,
      surface: input.surface,
      producerVersion: `evolith-cli@${CORE_VERSION}`,
      // The SAME id the success envelope carries, so the local artifact and the
      // ledger row join on one key instead of on two that look alike.
      correlationId: input.correlationId,
    });
  }

  /**
   * Load the repo's CODEOWNERS for drift-gate owner enrichment. Delegates to the shared
   * infra loader (GT-677) so the MCP surface resolves owners from the same candidate list.
   */
  private async loadCodeowners(workspaceRef: string): Promise<readonly CodeownersRule[]> {
    return loadCodeownersFromWorkspace(workspaceRef);
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

  @Option({ flags: '-f, --format [string]', description: 'Output format (json | text | sarif | drift). Default: json' })
  parseFormat(val: string): string {
    return val;
  }

  @Option({
    flags: '--evidence [path]',
    description: 'Write the enforcer-evidence manifest (EVD-01..03) to a file (GT-518)',
  })
  parseEvidence(val: string): string {
    return val;
  }

  @Option({
    flags: '--waivers [path]',
    description:
      'Waiver store path (default: <workspace>/.evolith/waivers.json). Approved, unexpired, fingerprint-matching waivers suppress findings (GT-677)',
  })
  parseWaivers(val: string): string {
    return val;
  }
}
