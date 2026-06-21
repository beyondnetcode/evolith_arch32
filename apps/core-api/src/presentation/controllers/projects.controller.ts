import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import {
  InitializeProjectUseCase,
  ProposePhaseAdvanceUseCase
} from '@evolith/core-domain/application/use-cases';
import { InitProjectDto, ProposeAdvanceDto } from '../dtos/projects.dto';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';

@Controller({ path: 'projects', version: '1' })
export class ProjectsController {
  constructor(
    private readonly initializeProjectUseCase: InitializeProjectUseCase,
    private readonly proposePhaseAdvanceUseCase: ProposePhaseAdvanceUseCase,
    private readonly workspaceResolver: WorkspaceReferenceResolverService,
  ) {}

  @Post('initialize')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initialize a new project' })
  @ApiBody({ type: InitProjectDto })
  @ApiResponse({ status: 201, description: 'Project initialized' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
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
    }, this.workspaceResolver.resolve(body.workspaceRef));
  }

  @Post('propose-advance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Propose a phase advance' })
  @ApiBody({ type: ProposeAdvanceDto })
  @ApiResponse({ status: 200, description: 'Advance proposal results' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async proposeAdvance(@Body() body: ProposeAdvanceDto) {
    return this.proposePhaseAdvanceUseCase.execute({
      fromPhase: body.targetPhase as any,
      toPhase: body.targetPhase as any,
      projectPath: this.workspaceResolver.resolve(body.workspaceRef),
      corePath: this.workspaceResolver.corePath(),
      triggerDeploy: body.triggerDeploy,
    } as any);
  }
}
