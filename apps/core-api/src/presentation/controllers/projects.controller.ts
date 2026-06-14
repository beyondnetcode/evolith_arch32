import { Controller, Post, Body } from '@nestjs/common';
import { 
  InitializeProjectUseCase,
  ProposePhaseAdvanceUseCase
} from '@evolith/core-domain/application/use-cases';

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly initializeProjectUseCase: InitializeProjectUseCase,
    private readonly proposePhaseAdvanceUseCase: ProposePhaseAdvanceUseCase
  ) {}

  @Post('initialize')
  async initialize(@Body() body: { targetPath: string; name: string; type: string; options?: any }) {
    const result = await this.initializeProjectUseCase.execute({
      targetPath: body.targetPath,
      name: body.name,
      type: body.type as any,
      options: body.options,
    });
    
    return result;
  }

  @Post('propose-advance')
  async proposeAdvance(@Body() body: { satellitePath: string; corePath?: string; targetPhase: string; triggerDeploy?: boolean }) {
    const result = await this.proposePhaseAdvanceUseCase.execute({
      satellitePath: body.satellitePath,
      corePath: body.corePath,
      targetPhase: body.targetPhase as any,
      triggerDeploy: body.triggerDeploy,
    });
    
    return result;
  }
}
