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
      name: body.name,
      runtime: (body.options?.runtime as string) || body.type || 'nodejs',
      monorepo: (body.options?.monorepo as string) || 'npm-workspaces',
      architecture: (body.options?.architecture as string) || 'clean',
      database: (body.options?.database as string) || 'postgresql',
      apiProtocol: (body.options?.apiProtocol as string) || 'rest',
      ciCd: (body.options?.ciCd as string) || 'github-actions',
      observability: (body.options?.observability as string) || 'opentelemetry',
      features: Array.isArray(body.options?.features) ? (body.options.features as string[]) : [],
      agents: Array.isArray(body.options?.agents) ? (body.options.agents as string[]) : [],
    }, body.targetPath);
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
      fromPhase: body.targetPhase as any,
      toPhase: body.targetPhase as any,
      projectPath: body.satellitePath,
      corePath: body.corePath,
      triggerDeploy: body.triggerDeploy,
    } as any);
  }
}
