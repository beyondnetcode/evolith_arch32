import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ArchitecturePlanService } from './architecture-plan.service';
import { EvaluateArchitecturePlanDto } from './architecture-plan.dto';
import { ApiEnvelopeResponse } from '../presentation/decorators/swagger-envelope.decorator';

@ApiTags('architecture-plans')
@Controller({ path: 'architecture-plans', version: '1' })
export class ArchitecturePlanController {
  constructor(private readonly service: ArchitecturePlanService) {}

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Evaluate an architecture-plan draft statelessly and return the enriched plan (ADR-0104)',
  })
  @ApiBody({ type: EvaluateArchitecturePlanDto })
  @ApiEnvelopeResponse(undefined, {
    description: 'Enriched ArchitecturePlan (advisory governance) in the ADR-0073 envelope',
  })
  async evaluate(@Body() planData: EvaluateArchitecturePlanDto) {
    // The Core API is stateless. It receives the draft from the CLI/Tracker,
    // passes it through the Engine (OPA) and returns the evaluated plan.
    return this.service.evaluatePlan(planData);
  }
}
