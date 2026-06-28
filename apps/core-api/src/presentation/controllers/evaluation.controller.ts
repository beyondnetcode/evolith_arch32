import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiBody } from '@nestjs/swagger';
import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases';
import { EvaluateSatelliteDto } from '../dtos/evaluation.dto';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';

@Controller({ path: 'evaluate', version: '1' })
export class EvaluationController {
  constructor(
    private readonly validateSatelliteUseCase: ValidateSatelliteUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate a satellite project SDLC (topology + gates + rules)' })
  @ApiBody({ type: EvaluateSatelliteDto })
  @ApiEnvelopeResponse(undefined, { description: 'Structured evaluation verdict envelope (ADR-0073)' })
  async evaluate(@Body() body: EvaluateSatelliteDto) {
    const { result, evaluationVerdict } = await this.validateSatelliteUseCase.execute({
      satellitePath: body.satellitePath,
      corePath: body.corePath,
      manifest: {
        satellitePath: body.satellitePath,
        corePath: body.corePath,
        topology: body.topology,
        phase: body.phase,
      },
    });

    if (evaluationVerdict?.outputEnvelope) {
      return evaluationVerdict.outputEnvelope;
    }

    return evaluationVerdict || result;
  }
}
