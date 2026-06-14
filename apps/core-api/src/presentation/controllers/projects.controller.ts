import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiSecurity } from '@nestjs/swagger';
import {
  InitializeProjectUseCase,
  ProposePhaseAdvanceUseCase
} from '@evolith/core-domain/application/use-cases';
import { InitProjectDto, ProposeAdvanceDto } from '../dtos/projects.dto';

@ApiSecurity('api-key')
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly initializeProjectUseCase: InitializeProjectUseCase,
    private readonly proposePhaseAdvanceUseCase: ProposePhaseAdvanceUseCase
  ) {}

  @Post('initialize')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initialize a new project' })
  @ApiBody({ type: InitProjectDto })
  @ApiResponse({ status: 201, description: 'Project initialized' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
  async initialize(@Body() body: InitProjectDto) {
    return this.initializeProjectUseCase.execute({
      targetPath: body.targetPath,
      name: body.name,
      type: body.type as any,
      options: body.options,
    });
  }

  @Post('propose-advance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Propose a phase advance' })
  @ApiBody({ type: ProposeAdvanceDto })
  @ApiResponse({ status: 200, description: 'Advance proposal results' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
  async proposeAdvance(@Body() body: ProposeAdvanceDto) {
    return this.proposePhaseAdvanceUseCase.execute({
      satellitePath: body.satellitePath,
      corePath: body.corePath,
      targetPhase: body.targetPhase as any,
      triggerDeploy: body.triggerDeploy,
    });
  }
}
