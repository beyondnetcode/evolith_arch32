import { Controller, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiParam, ApiSecurity } from '@nestjs/swagger';
import { EvaluateGateUseCase } from '@evolith/core-domain/application/use-cases';
import { EvaluateGateDto } from '../dtos/gates.dto';

@ApiSecurity('api-key')
@Controller('gates')
export class GatesController {
  constructor(private readonly evaluateGateUseCase: EvaluateGateUseCase) {}

  @Post(':gateId/evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate a specific phase gate' })
  @ApiParam({ name: 'gateId', description: 'Gate identifier', example: 'PG0-01' })
  @ApiBody({ type: EvaluateGateDto })
  @ApiResponse({ status: 200, description: 'Gate evaluation results' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
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
