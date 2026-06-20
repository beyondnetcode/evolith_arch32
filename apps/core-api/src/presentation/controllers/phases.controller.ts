import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PhaseTransitionUseCase } from '@evolith/core-domain/application/use-cases';
import { TransitionPhaseDto } from '../dtos/phases.dto';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';

@Controller('phases')
export class PhasesController {
  constructor(
    private readonly phaseTransitionUseCase: PhaseTransitionUseCase,
    private readonly workspaceResolver: WorkspaceReferenceResolverService,
  ) {}

  @Post('transition')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute a phase transition' })
  @ApiBody({ type: TransitionPhaseDto })
  @ApiResponse({ status: 200, description: 'Transition results' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async transition(@Body() body: TransitionPhaseDto) {
    return this.phaseTransitionUseCase.execute(
      body.from,
      body.to,
      body.tools,
      this.workspaceResolver.resolve(body.workspaceRef),
    );
  }
}
