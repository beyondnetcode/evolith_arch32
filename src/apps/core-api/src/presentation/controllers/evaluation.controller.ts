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
import type { EvaluationContext } from '@beyondnet/evolith-core-domain/evaluation';
import type {
  IFileSystem,
  ILogger,
  IConfigParser,
} from '@beyondnet/evolith-core-domain/domain/interfaces';
import type { IRulesetRepository } from '@beyondnet/evolith-core-domain/domain/ports/ruleset-repository.port';
import { EvaluationContextDto } from '../dtos/evaluation.dto';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';
import {
  createSuccessEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
} from '@beyondnet/evolith-core-domain';

/** Synthetic root the inline satellite content is served from (never written to disk). */
const INMEM_SATELLITE_ROOT = '/inmem/satellite';

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
 *
 * Legacy path (backward compatible): when `workspaceRef`/`evaluationInput` are
 * absent and `satellitePath` is present, the previous satellite-path evaluation
 * is used.
 */
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
    // Inline path (additive, highest priority): evaluate in-memory satellite
    // content. Stateless — the incoming files are never written to disk and no
    // network is used for them; only the Core's own rulesets are read from disk.
    if (body.evaluationInput?.files) {
      return this.evaluateInline(body);
    }

    // Canonical path: opaque workspaceRef → stateless EvaluationContext → EvaluationResult.
    if (body.workspaceRef) {
      const ctx = body as unknown as EvaluationContext;
      const result = await this.orchestrator.evaluate(ctx);
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
          manifest: {
            satellitePath: body.satellitePath,
            corePath: body.corePath,
            topology: body.topology,
            phase: body.phase,
          },
        },
      );
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
   */
  private async evaluateInline(body: EvaluationContextDto) {
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

    const { evaluationVerdict } = await useCase.execute({
      satellitePath: INMEM_SATELLITE_ROOT,
      corePath,
      manifest: {
        satellitePath: INMEM_SATELLITE_ROOT,
        corePath,
        topology: body.topology ?? body.topologyRef,
        phase: body.phase ?? body.phaseId,
      },
    });
    return evaluationVerdict!.outputEnvelope;
  }
}
