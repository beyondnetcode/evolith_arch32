import { Controller, Post, Body, Param } from '@nestjs/common';
import { EvaluateGateUseCase } from '@evolith/core-domain/application/use-cases';

@Controller('gates')
export class GatesController {
  constructor(private readonly evaluateGateUseCase: EvaluateGateUseCase) {}

  @Post(':gateId/evaluate')
  async evaluateGate(
    @Param('gateId') gateId: string,
    @Body() body: { satellitePath: string; corePath?: string }
  ) {
    const result = await this.evaluateGateUseCase.execute({
      satellitePath: body.satellitePath,
      gateId,
      corePath: body.corePath,
    });
    
    return result;
  }
}
