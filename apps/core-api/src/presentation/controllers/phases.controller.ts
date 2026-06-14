import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiSecurity } from '@nestjs/swagger';
import { PhaseTransitionUseCase } from '@evolith/core-domain/application/use-cases';
import { TransitionPhaseDto } from '../dtos/phases.dto';

@ApiSecurity('api-key')
@Controller('phases')
export class PhasesController {
  constructor(
    private readonly phaseTransitionUseCase: PhaseTransitionUseCase
  ) {}

  @Post('transition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute a phase transition' })
  @ApiBody({ type: TransitionPhaseDto })
  @ApiResponse({ status: 200, description: 'Transition results' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
  async transition(@Body() body: TransitionPhaseDto) {
    return this.phaseTransitionUseCase.execute(
      body.from,
      body.to,
      body.tools,
      body.cwd,
    );
  }
}
