import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases';
import { ArchitectureDriftService } from '@evolith/core-domain/application/validators';
import { ValidateSatelliteDto, DetectDriftDto } from '../dtos/architecture.dto';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';
import { TopologyCatalogService } from '@evolith/core-domain/application/services';

@Controller({ path: 'architecture', version: '1' })
export class ArchitectureController {
  constructor(
    private readonly driftService: ArchitectureDriftService,
    private readonly validateSatelliteUseCase: ValidateSatelliteUseCase,
    private readonly workspaceResolver: WorkspaceReferenceResolverService,
    private readonly topologyCatalog: TopologyCatalogService,
  ) {}


  @Get('topologies')
  @ApiOperation({ summary: 'List all available architecture topologies' })
  @ApiResponse({ status: 200, description: 'List of topology manifests' })
  async listTopologies() {
    return this.topologyCatalog.list(this.workspaceResolver.corePath());
  }

  @Get('topologies/:id')
  @ApiOperation({ summary: 'Get a specific architecture topology by ID' })
  @ApiResponse({ status: 200, description: 'Topology manifest details' })
  @ApiResponse({ status: 404, description: 'Topology not found' })
  async getTopology(@Param('id') id: string) {
    const topology = await this.topologyCatalog.get(this.workspaceResolver.corePath(), id);
    if (!topology) {
      throw new NotFoundException(`Topology ${id} not found`);
    }
    return topology;
  }

  @Post('validate-satellite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a satellite project against architecture rules' })
  @ApiBody({ type: ValidateSatelliteDto })
  @ApiResponse({ status: 200, description: 'Validation results' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async validateSatellite(@Body() body: ValidateSatelliteDto) {
    return this.validateSatelliteUseCase.execute({
      satellitePath: this.workspaceResolver.resolve(body.workspaceRef),
      corePath: this.workspaceResolver.corePath(),
    });
  }

  @Post('detect-drift')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detect architecture drift in a project' })
  @ApiBody({ type: DetectDriftDto })
  @ApiResponse({ status: 200, description: 'Drift detection results' })
  async detectDrift(@Body() body: DetectDriftDto) {
    return this.driftService.detectDrift({
      projectPath: this.workspaceResolver.resolve(body.workspaceRef),
      corePath: this.workspaceResolver.corePath(),
      declaredLevel: body.declaredLevel as any,
    });
  }
}
