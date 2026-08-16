import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import { ApiOperation, ApiBody } from '@nestjs/swagger';
import { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases';
import { RulesetValidatorService } from '@beyondnet/evolith-core-domain/application/validators';
import { TopologyCatalogService } from '@beyondnet/evolith-core-domain/application/services';
import { OverlayFileSystem } from '@beyondnet/evolith-core-domain/infrastructure/overlay/overlay-file-system';
import { EvaluationOrchestrator } from '@beyondnet/evolith-core-domain/evaluation';
import type {
  EvaluationContext,
  IEvaluationPipeline,
  IWorkspaceReferenceResolver,
} from '@beyondnet/evolith-core-domain/evaluation';
import type {
  IFileSystem,
  ILogger,
  IConfigParser,
} from '@beyondnet/evolith-core-domain/domain/interfaces';
import type { IRulesetRepository } from '@beyondnet/evolith-core-domain/domain/ports/ruleset-repository.port';
import { EvaluationContextDto } from '../dtos/evaluation.dto';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';
import {
  CORE_VERSION,
  EVALUATION_ORCHESTRATOR_FACTORY,
  makeEvaluationOrchestratorFactory,
  type EvaluationOrchestratorFactory,
} from '../../application/evaluation/evaluation-orchestrator.factory';
import { MetricsService } from '../../infrastructure/metrics/metrics.service';
import { EvaluationTelemetryService } from '../../infrastructure/observability/evaluation-telemetry.service';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';
import {
  createSuccessEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain';

/** Synthetic root the inline satellite content is served from (never written to disk). */
const INMEM_SATELLITE_ROOT = '/inmem/satellite';

/**
 * Synthetic workspaceRef used ONLY to satisfy the orchestrator's port contract on
 * the inline branch. It is never resolved against disk: the per-request resolver
 * below always answers with the in-memory root.
 */
const INLINE_WORKSPACE_REF = 'inline';

/**
 * POST /api/v1/evaluate — the stateless Core evaluation entry point (ADR-0101).
 *
 * Canonical path: a consumer sends an EvaluationContext (opaque `workspaceRef`,
 * never a raw path) and the Core returns an EvaluationResult, wrapped in the
 * ADR-0073 envelope by the global EnvelopeInterceptor.
 *
 * Inline path (additive, highest priority): when `evaluationInput.files` is
 * present, the Core evaluates that in-memory satellite content directly — no
 * disk read/write of the satellite, no network — while still reading its OWN
 * rulesets from disk. Keeps `workspaceRef`/`satellitePath` semantics unchanged.
 * GT-573: it goes through the SAME EvaluationOrchestrator as the canonical path
 * and therefore returns the SAME `EvaluationResult` — one operation, one shape.
 *
 * Legacy path (backward compatible): when `workspaceRef`/`evaluationInput` are
 * absent and `satellitePath` is present, the previous satellite-path evaluation
 * is used.
 */
/**
 * GT-659 — the refs a caller named, from the context it already sends.
 *
 * `EvaluationContextDto` has declared `rulesetRef` and `policyRefs` since the
 * contract was written and the result echoed `rulesetRef` back as provenance,
 * while every evaluation ran the whole corpus regardless. Reading them here is
 * what makes the field mean what its name says.
 *
 * Returns `undefined` when the caller named nothing — NOT an empty array. The two
 * must not collapse: an empty selection treated as a selection would evaluate
 * zero rules and report a pass.
 */
function selectionFrom(body: { rulesetRef?: string; policyRefs?: readonly string[] }): string[] | undefined {
  const refs = [body.rulesetRef, ...(body.policyRefs ?? [])].filter(
    (x): x is string => typeof x === 'string' && x.trim() !== '',
  );
  return refs.length ? [...new Set(refs.map((x) => x.trim()))] : undefined;
}

@Controller({ path: 'evaluate', version: '1' })
export class EvaluationController {
  constructor(
    private readonly orchestrator: EvaluationOrchestrator,
    private readonly validateSatelliteUseCase: ValidateSatelliteUseCase,
    // Per-request overlay dependencies (only used for the inline branch). Optional
    // so unit tests that don't exercise the inline path need not provide them.
    @Optional() @Inject('IFileSystem') private readonly fs?: IFileSystem,
    @Optional() @Inject('ILogger') private readonly logger?: ILogger,
    @Optional()
    @Inject('IConfigParser')
    private readonly configParser?: IConfigParser,
    @Optional()
    @Inject('IRulesetRepository')
    private readonly rulesetRepo?: IRulesetRepository,
    @Optional() private readonly topologyCatalog?: TopologyCatalogService,
    @Optional()
    private readonly workspaceResolver?: WorkspaceReferenceResolverService,
    @Optional() private readonly metrics?: MetricsService,
    // GT-573: the SAME orchestrator factory the canonical branch is built from,
    // so the inline branch cannot drift into a second response shape.
    @Optional()
    @Inject(EVALUATION_ORCHESTRATOR_FACTORY)
    private readonly makeOrchestrator?: EvaluationOrchestratorFactory,
    // GT-587: the standard-vocabulary half of the same signal. Optional for the same
    // reason `metrics` is, and LAST on purpose: several specs construct this controller
    // positionally, so inserting a parameter mid-list silently shifts every argument
    // after it — which is exactly how this landed as nine red tests the first time.
    @Optional() private readonly evaluationTelemetry?: EvaluationTelemetryService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Evaluate an EvaluationContext (gates, artifacts, rules, compliance) and return an EvaluationResult',
  })
  @ApiBody({ type: EvaluationContextDto })
  @ApiEnvelopeResponse(undefined, {
    description:
      'EvaluationResult (canonical) or legacy verdict, in the ADR-0073 envelope',
  })
  async evaluate(@Body() body: EvaluationContextDto) {
    const start = Date.now();
    // GT-542: the phase label for the emitted gate/evaluation metric.
    const phase = String(body.phase ?? body.phaseId ?? 'unknown');

    // Inline path (additive, highest priority): evaluate in-memory satellite
    // content. Stateless — the incoming files are never written to disk and no
    // network is used for them; only the Core's own rulesets are read from disk.
    if (body.evaluationInput?.files) {
      return this.evaluateInline(body, start, phase);
    }

    // Canonical path: opaque workspaceRef → stateless EvaluationContext → EvaluationResult.
    if (body.workspaceRef) {
      const ctx = body as unknown as EvaluationContext;
      const result = await this.orchestrator.evaluate(ctx);
      // GT-542: emit the evaluation verdict + latency signal.
      this.metrics?.recordGateEvaluation('evaluate', String(result.overallVerdict), phase, body.tenant?.tenantId, (Date.now() - start) / 1000);
      // GT-587: the same outcome under the OpenTelemetry GenAI vocabulary, on the
      // request's own span. Additive — the private series above is untouched.
      this.evaluationTelemetry?.record(result);
      // GT-411: Return pre-built ADR-0073 envelope with canonical command name.
      return createSuccessEnvelope(result, {
        command: 'evolith evaluate',
        executedAt: new Date().toISOString(),
        durationMs: 0,
        correlationId: `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
      });
    }

    // Legacy path: satellite filesystem path (pre-ADR-0101). Returns the legacy verdict envelope.
    if (body.satellitePath) {
      const { evaluationVerdict } = await this.validateSatelliteUseCase.execute(
        {
          satellitePath: body.satellitePath,
          corePath: body.corePath,
          rulesetRefs: selectionFrom(body),
          // GT-676 — the floor the caller asked for reaches the engine on this
          // surface too, so a REST verdict is reproducible from a CLI one.
          maxSkippedFraction: body.maxSkippedFraction,
          manifest: {
            satellitePath: body.satellitePath,
            corePath: body.corePath,
            topology: body.topology,
            phase: body.phase,
          },
        },
      );
      // GT-542: legacy path exposes a boolean pass/fail → map to the canonical verdict label.
      this.metrics?.recordGateEvaluation('evaluate', evaluationVerdict?.passed ? 'PASS' : 'FAIL', phase, body.tenant?.tenantId, (Date.now() - start) / 1000);
      return evaluationVerdict!.outputEnvelope;
    }

    throw new BadRequestException(
      'Provide `evaluationInput.files` (inline), `workspaceRef` (canonical), or `satellitePath` (legacy)',
    );
  }

  /**
   * Runs the SAME validation/evaluation the satellite path uses, but against a
   * synthetic satellite root served from the in-memory `files` map. The Core's
   * own rulesets are still read from real disk via the fallback IFileSystem.
   *
   * GT-573: the result travels through the SAME `EvaluationOrchestrator` the
   * `workspaceRef` branch uses, so the response is the canonical
   * `EvaluationResult` (`overallVerdict` / `outcome` / `results.gate[]` /
   * `evaluatedAt`) and not the legacy `{ topology, gates, summary }` envelope.
   * The consumer's mapper can therefore tell a FAIL from "not evaluated" —
   * previously every inline FAIL was persisted as `SKIPPED`.
   */
  private async evaluateInline(body: EvaluationContextDto, start: number, phase: string) {
    if (!this.fs || !this.logger || !this.configParser || !this.rulesetRepo) {
      throw new BadRequestException(
        'Inline evaluation is not configured on this Core instance',
      );
    }

    // corePath resolved exactly as the existing flows do: explicit override, or
    // the Core's configured CORE_PATH (so the Core rules are found on disk).
    const corePath = body.corePath || this.workspaceResolver?.corePath();
    if (!corePath) {
      throw new BadRequestException(
        'Unable to resolve corePath for inline evaluation',
      );
    }

    const overlayFs = new OverlayFileSystem(
      INMEM_SATELLITE_ROOT,
      body.evaluationInput!.files,
      this.fs,
    );

    // A per-request validator + use-case bound to the overlay fs. No shared
    // state is mutated; nothing is written to disk for the incoming content.
    const validator = new RulesetValidatorService({
      fileSystem: overlayFs,
      logger: this.logger,
      configParser: this.configParser,
      rulesetRepo: this.rulesetRepo,
      topologyCatalog: this.topologyCatalog,
    });
    const useCase = new ValidateSatelliteUseCase(validator);

    // The two ports the orchestrator abstracts, bound to the in-memory overlay.
    // Everything else (core version, kind evaluators, canonical mapping) is the
    // shared factory's — there is no second envelope to keep in sync.
    const pipeline: IEvaluationPipeline = {
      // GT-614: same forwarding as the canonical branch — one operation, one
      // behaviour, including which stages a single-kind request pays for.
      evaluate: async (manifest, plan) => {
        const out = await useCase.execute({
          satellitePath: manifest.satellitePath,
          corePath: manifest.corePath,
          manifest,
          plan,
          rulesetRefs: selectionFrom(body),
          // GT-676 — the floor the caller asked for reaches the engine on this
          // surface too, so a REST verdict is reproducible from a CLI one.
          maxSkippedFraction: body.maxSkippedFraction,
        });
        if (!out.evaluationVerdict) {
          throw new Error('Inline evaluation pipeline produced no verdict');
        }
        return out.evaluationVerdict;
      },
    };
    const resolver: IWorkspaceReferenceResolver = {
      // Never touches disk: the inline satellite lives entirely in the overlay.
      resolve: async () => ({ satellitePath: INMEM_SATELLITE_ROOT, corePath }),
    };

    const orchestrator = this.makeOrchestrator
      ? this.makeOrchestrator(pipeline, resolver)
      : makeEvaluationOrchestratorFactory([], CORE_VERSION)(pipeline, resolver);

    const ctx: EvaluationContext = {
      ...(body as unknown as EvaluationContext),
      // `kinds` is required by the canonical contract; the inline callers that
      // predate it send none, and the core kinds run unconditionally anyway.
      kinds: body.kinds ?? [],
      workspaceRef: INLINE_WORKSPACE_REF,
      // Fold the legacy aliases into their canonical names, preserving the
      // pre-GT-573 precedence (legacy first), so the SatelliteManifest the
      // pipeline receives is byte-identical to before. Values pass through
      // verbatim — the pipeline itself normalizes canonical / legacy `f1..f5`
      // ids via `toLegacyPhaseId`. Only the RESPONSE shape changes.
      topologyRef: body.topology ?? body.topologyRef,
      phaseId: (body.phase ?? body.phaseId) as EvaluationContext['phaseId'],
    };

    const result = await orchestrator.evaluate(ctx);
    // GT-542: emit the inline evaluation verdict + latency signal.
    this.metrics?.recordGateEvaluation('evaluate', String(result.overallVerdict), phase, body.tenant?.tenantId, (Date.now() - start) / 1000);
    // GT-587: both branches return the SAME EvaluationResult (GT-573), so both must
    // emit the SAME standard events — an inline evaluation that stayed silent would
    // make the telemetry depend on which transport the caller happened to use.
    this.evaluationTelemetry?.record(result);
    // GT-573: the canonical EvaluationResult, in the same ADR-0073 envelope the
    // workspaceRef branch returns.
    return createSuccessEnvelope(result, {
      command: 'evolith evaluate',
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      correlationId:
        body.correlationId ??
        `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    });
  }
}
