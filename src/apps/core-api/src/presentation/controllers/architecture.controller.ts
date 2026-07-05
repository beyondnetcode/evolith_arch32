import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus, NotFoundException, UseInterceptors, Inject } from '@nestjs/common';
import { CACHE_MANAGER, CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ApiOperation, ApiBody } from '@nestjs/swagger';
import { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases';
import { ArchitectureDriftService } from '@beyondnet/evolith-core-domain/application/validators';
import { ValidateSatelliteDto, DetectDriftDto, RecommendTopologyDto, EvaluatePhaseArtifactsDto } from '../dtos/architecture.dto';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';
import { TopologyCatalogService, TopologyRecommendationService, PhaseArtifactProfileService } from '@beyondnet/evolith-core-domain/application/services';
import type { TopologyRecommendationRules, DownstreamPhase } from '@beyondnet/evolith-core-domain/application/services';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';
import { CacheKeys, CacheTTL as TTL } from '../../infrastructure/cache/cache-keys';

@Controller({ path: 'architecture', version: '1' })
export class ArchitectureController {
  constructor(
    private readonly driftService: ArchitectureDriftService,
    private readonly validateSatelliteUseCase: ValidateSatelliteUseCase,
    private readonly workspaceResolver: WorkspaceReferenceResolverService,
    private readonly topologyCatalog: TopologyCatalogService,
    private readonly recommendationService: TopologyRecommendationService,
    private readonly phaseArtifactService: PhaseArtifactProfileService,
    @Inject('IFileSystem') private readonly fileSystem: IFileSystem,
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
  @ApiEnvelopeResponse(undefined, { description: 'Validation results or ADR-0073 envelope if manifest is provided' })
  async validateSatellite(@Body() body: ValidateSatelliteDto) {
    const response = await this.validateSatelliteUseCase.execute({
      satellitePath: this.workspaceResolver.resolve(body.workspaceRef),
      corePath: this.workspaceResolver.corePath(),
      manifest: body.manifest,
    });
    return response.evaluationVerdict?.outputEnvelope ?? response.result;
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

  @Post('recommend-topology')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recommend a topology composition from technical signals (advisory, ADR-0104 / GT-430)' })
  @ApiBody({ type: RecommendTopologyDto })
  @ApiEnvelopeResponse(undefined, { description: 'Recommended topology composition + rationale (non-binding; the tenant confirms)' })
  async recommendTopology(@Body() body: RecommendTopologyDto) {
    const corePath = this.workspaceResolver.corePath();
    // The rulesets live under `src/rulesets/` in the source tree but the
    // container image copies the corpus without the `src/` segment
    // (`/app/corpus/rulesets/...`). Resolve against both layouts so the
    // endpoint works from source (dev) and inside the image.
    const relPath = 'rulesets/architecture/topology-recommendation.rules.json';
    let rulesRaw: string | undefined;
    for (const candidate of [`${corePath}/${relPath}`, `${corePath}/src/${relPath}`]) {
      try {
        rulesRaw = await this.fileSystem.readFile(candidate);
        break;
      } catch {
        // try the next candidate layout
      }
    }
    if (rulesRaw === undefined) {
      throw new NotFoundException(`Topology recommendation rules not found under ${corePath} (tried rulesets/ and src/rulesets/).`);
    }
    const rules = JSON.parse(rulesRaw) as TopologyRecommendationRules;
    return this.recommendationService.recommend(rules, body.signals ?? {});
  }

  @Post('evaluate-phase-artifacts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Measure downstream-phase artifact completeness for a topology composition (advisory, ADR-0104 / DN-06 / GT-434)' })
  @ApiBody({ type: EvaluatePhaseArtifactsDto })
  @ApiEnvelopeResponse(undefined, { description: 'Required/present/missing artifacts + completeness (advisory, non-binding)' })
  async evaluatePhaseArtifacts(@Body() body: EvaluatePhaseArtifactsDto) {
    const corePath = this.workspaceResolver.corePath();
    const profileByTopo = new Map<string, Record<string, unknown> | undefined>();
    for (const topo of body.topologies) {
      const manifest = await this.topologyCatalog.get(corePath, topo);
      profileByTopo.set(topo, manifest?.spec.phaseProfiles);
    }
    const getPhaseProfile = (topo: string, phase: DownstreamPhase) =>
      (profileByTopo.get(topo) as Record<string, any> | undefined)?.[phase];
    return this.phaseArtifactService.evaluate(body.phase, body.topologies, body.declaredArtifacts ?? [], getPhaseProfile);
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
