import { Controller, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { EvaluateGateUseCase } from '@evolith/core-domain/application/use-cases';
import { EvaluateGateDto } from '../dtos/gates.dto';

@Controller('gates')
export class GatesController {
  constructor(private readonly evaluateGateUseCase: EvaluateGateUseCase) {}

  @Post(':gateId/evaluate')
  @HttpCode(HttpStatus.OK)
  async evaluateGate(
    @Param('gateId') gateId: string,
    @Body() body: EvaluateGateDto
  ) {
    return this.evaluateGateUseCase.execute({
      satellitePath: body.satellitePath,
      gateId,
      corePath: body.corePath,
    });
  }
}
