import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiBody } from '@nestjs/swagger';
import { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases';
import { EvaluationOrchestrator } from '@beyondnet/evolith-core-domain/evaluation';
import type { EvaluationContext } from '@beyondnet/evolith-core-domain/evaluation';
import { EvaluationContextDto } from '../dtos/evaluation.dto';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';
import { createSuccessEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain';

/**
 * POST /api/v1/evaluate — the stateless Core evaluation entry point (ADR-0101).
 *
 * Canonical path: a consumer sends an EvaluationContext (opaque `workspaceRef`,
 * never a raw path) and the Core returns an EvaluationResult, wrapped in the
 * ADR-0073 envelope by the global EnvelopeInterceptor.
 *
 * Legacy path (backward compatible): when `workspaceRef` is absent and
 * `satellitePath` is present, the previous satellite-path evaluation is used.
 */
@Controller({ path: 'evaluate', version: '1' })
export class EvaluationController {
  constructor(
    private readonly orchestrator: EvaluationOrchestrator,
    private readonly validateSatelliteUseCase: ValidateSatelliteUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate an EvaluationContext (gates, artifacts, rules, compliance) and return an EvaluationResult' })
  @ApiBody({ type: EvaluationContextDto })
  @ApiEnvelopeResponse(undefined, { description: 'EvaluationResult (canonical) or legacy verdict, in the ADR-0073 envelope' })
  async evaluate(@Body() body: EvaluationContextDto) {
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
      const { evaluationVerdict } = await this.validateSatelliteUseCase.execute({
        satellitePath: body.satellitePath,
        corePath: body.corePath,
        manifest: {
          satellitePath: body.satellitePath,
          corePath: body.corePath,
          topology: body.topology,
          phase: body.phase,
        },
      });
      return evaluationVerdict!.outputEnvelope;
    }

    throw new BadRequestException('Provide either `workspaceRef` (canonical) or `satellitePath` (legacy)');
  }
}
