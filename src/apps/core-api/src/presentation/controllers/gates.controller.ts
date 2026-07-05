import { Controller, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { EvaluateGateUseCase } from '@beyondnet/evolith-core-domain/application/use-cases';
import { EvaluateGateDto } from '../dtos/gates.dto';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';
import { createSuccessEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@beyondnet/evolith-core-domain';

@Controller({ path: 'gates', version: '1' })
export class GatesController {
  constructor(
    private readonly evaluateGateUseCase: EvaluateGateUseCase,
    private readonly workspaceResolver: WorkspaceReferenceResolverService,
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
    const result = await this.evaluateGateUseCase.execute({
      phase: this.mapGateIdToPhase(gateId),
      projectPath: this.workspaceResolver.resolve(body.workspaceRef),
      corePath: this.workspaceResolver.corePath(),
    });
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
      default: return 'discovery';
    }
  }
}
