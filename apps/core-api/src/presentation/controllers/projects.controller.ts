import { Controller, Post, Body } from '@nestjs/common';
import {
  InitializeProjectUseCase,
  ProposePhaseAdvanceUseCase
} from '@evolith/core-domain/application/use-cases';
import { InitProjectDto, ProposeAdvanceDto } from '../dtos/projects.dto';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly initializeProjectUseCase: InitializeProjectUseCase,
    private readonly proposePhaseAdvanceUseCase: ProposePhaseAdvanceUseCase
  ) {}

  @Post('initialize')
  async initialize(@Body() body: InitProjectDto) {
    return this.initializeProjectUseCase.execute({
      targetPath: body.targetPath,
      name: body.name,
      type: body.type as any,
      options: body.options,
    });
  }

  @Post('propose-advance')
  async proposeAdvance(@Body() body: ProposeAdvanceDto) {
    return this.proposePhaseAdvanceUseCase.execute({
      satellitePath: body.satellitePath,
      corePath: body.corePath,
      targetPhase: body.targetPhase as any,
      triggerDeploy: body.triggerDeploy,
    });
  }
}
