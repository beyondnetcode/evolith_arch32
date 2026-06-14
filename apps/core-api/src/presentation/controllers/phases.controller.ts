import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PhaseTransitionUseCase } from '@evolith/core-domain/application/use-cases';
import { TransitionPhaseDto } from '../dtos/phases.dto';

@Controller('phases')
export class PhasesController {
  constructor(
    private readonly phaseTransitionUseCase: PhaseTransitionUseCase
  ) {}

  @Post('transition')
  @HttpCode(HttpStatus.OK)
  async transition(@Body() body: TransitionPhaseDto) {
    return this.phaseTransitionUseCase.execute(
      body.from,
      body.to,
      body.tools,
      body.cwd,
    );
  }
}
