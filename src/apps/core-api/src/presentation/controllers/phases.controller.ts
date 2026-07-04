import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiBody } from '@nestjs/swagger';
import { PhaseTransitionUseCase } from '@evolith/core-domain/application/use-cases';
import { TransitionPhaseDto } from '../dtos/phases.dto';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';
import { createSuccessEnvelope, OUTPUT_ENVELOPE_SCHEMA_VERSION } from '@evolith/core-domain';

@Controller({ path: 'phases', version: '1' })
export class PhasesController {
  constructor(
    private readonly phaseTransitionUseCase: PhaseTransitionUseCase,
    private readonly workspaceResolver: WorkspaceReferenceResolverService,
  ) {}

  @Post('transition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute a phase transition' })
  @ApiBody({ type: TransitionPhaseDto })
  @ApiEnvelopeResponse(undefined, { description: 'Transition results' })
  async transition(@Body() body: TransitionPhaseDto) {
    const result = await this.phaseTransitionUseCase.execute(
      body.from,
      body.to,
      body.tools,
      this.workspaceResolver.resolve(body.workspaceRef),
    );
    // GT-411: Return pre-built ADR-0073 envelope with canonical command name.
    return createSuccessEnvelope(result, {
      command: 'evolith phase transition',
      executedAt: new Date().toISOString(),
      durationMs: 0,
      correlationId: `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    });
  }
}
