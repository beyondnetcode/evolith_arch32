import { Controller, Post, Body, Param, HttpCode, HttpStatus, BadRequestException, Optional } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { EvaluateGateUseCase } from '@beyondnet/evolith-core-domain/application/use-cases';
import { EvaluateGateDto } from '../dtos/gates.dto';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';
import { MetricsService } from '../../infrastructure/metrics/metrics.service';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';
import { createSuccessEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain';

@Controller({ path: 'gates', version: '1' })
export class GatesController {
  constructor(
    private readonly evaluateGateUseCase: EvaluateGateUseCase,
    private readonly workspaceResolver: WorkspaceReferenceResolverService,
    // Optional so unit tests that don't assert metrics need not provide it.
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  @Post(':gateId/evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate a specific phase gate' })
  @ApiParam({ name: 'gateId', description: 'Gate identifier', example: 'PG0-01' })
  @ApiBody({ type: EvaluateGateDto })
  @ApiEnvelopeResponse(undefined, { description: 'Gate evaluation results' })
  async evaluateGate(
    @Param('gateId') gateId: string,
    @Body() body: EvaluateGateDto
  ) {
    const phase = this.mapGateIdToPhase(gateId);
    const start = Date.now();
    const result = await this.evaluateGateUseCase.execute({
      phase,
      projectPath: this.workspaceResolver.resolve(body.workspaceRef),
      corePath: this.workspaceResolver.corePath(),
      evaluatedBy: body.evaluatedBy,
    });
    // GT-542: emit the flagship gate pass/fail + latency signal.
    // Gate evaluate has no tenant in its DTO → the bounded label collapses to `other`.
    this.metrics?.recordGateEvaluation(result.gateId ?? gateId, String(result.verdict), String(phase), undefined, (Date.now() - start) / 1000);
    // GT-411: Return pre-built ADR-0073 envelope with canonical command name.
    return createSuccessEnvelope(result, {
      command: 'evolith gate evaluate',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    });
  }

  private mapGateIdToPhase(gateId: string) {
    const match = gateId.match(/(\d+)/);
    switch (match?.[1]) {
      case '1': return 'discovery';
      case '2': return 'design';
      case '3': return 'construction';
      case '4': return 'qa';
      case '5': return 'release';
      // An unknown gate id must be rejected, not silently evaluated as discovery
      // — otherwise the caller gets a valid-looking verdict for the wrong gate.
      default: throw new BadRequestException(`Unknown gate id "${gateId}" — expected one of PG1..PG5`);
    }
  }
}
