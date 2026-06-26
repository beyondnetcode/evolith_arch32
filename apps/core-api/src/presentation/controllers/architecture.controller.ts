import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus, NotFoundException, UseInterceptors, Inject } from '@nestjs/common';
import { CACHE_MANAGER, CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ApiOperation, ApiBody } from '@nestjs/swagger';
import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases';
import { ArchitectureDriftService } from '@evolith/core-domain/application/validators';
import { ValidateSatelliteDto, DetectDriftDto } from '../dtos/architecture.dto';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';
import { TopologyCatalogService } from '@evolith/core-domain/application/services';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';
import { CacheKeys, CacheTTL as TTL } from '../../infrastructure/cache/cache-keys';

@Controller({ path: 'architecture', version: '1' })
export class ArchitectureController {
  constructor(
    private readonly driftService: ArchitectureDriftService,
    private readonly validateSatelliteUseCase: ValidateSatelliteUseCase,
    private readonly workspaceResolver: WorkspaceReferenceResolverService,
    private readonly topologyCatalog: TopologyCatalogService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}


  @Get('topologies')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(TTL.topology)
  @ApiOperation({ summary: 'List all available architecture topologies' })
  @ApiEnvelopeResponse(undefined, { isArray: true, description: 'List of topology manifests' })
  async listTopologies() {
    return this.topologyCatalog.list(this.workspaceResolver.corePath());
  }

  @Get('topologies/:id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(TTL.topology)
  @ApiOperation({ summary: 'Get a specific architecture topology by ID' })
  @ApiEnvelopeResponse(undefined, { description: 'Topology manifest details' })
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
  @ApiEnvelopeResponse(undefined, { description: 'Validation results' })
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
  @ApiEnvelopeResponse(undefined, { description: 'Drift detection results' })
  async detectDrift(@Body() body: DetectDriftDto) {
    return this.driftService.detectDrift({
      projectPath: this.workspaceResolver.resolve(body.workspaceRef),
      corePath: this.workspaceResolver.corePath(),
      declaredLevel: body.declaredLevel as any,
    });
  }

  @Post('cache/invalidate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate topology cache' })
  @ApiEnvelopeResponse(undefined, { description: 'Cache invalidation result' })
  async invalidateCache() {
    await this.cache.del(CacheKeys.topology.list);
    return { invalidated: true, keys: [CacheKeys.topology.list] };
  }
}
