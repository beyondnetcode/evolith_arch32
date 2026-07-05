import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ArchitecturePlanService } from './architecture-plan.service';
import { ArchitecturePlan } from '@beyondnet/evolith-core-domain';

@Controller('v1/architecture-plans')
export class ArchitecturePlanController {
  constructor(private readonly service: ArchitecturePlanService) {}

  @Post('evaluate')
  @HttpCode(200)
  async evaluate(@Body() planData: Partial<ArchitecturePlan>) {
    // The Core API is stateless. It receives the draft from the CLI/Tracker,
    // passes it through the Engine (OPA) and returns the evaluated plan.
    return this.service.evaluatePlan(planData);
  }
}
