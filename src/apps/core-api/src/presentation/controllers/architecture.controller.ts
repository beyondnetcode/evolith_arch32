import { Controller, Post, Get, Param, Query, Body, HttpCode, HttpStatus, NotFoundException, InternalServerErrorException, UseInterceptors, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ApiOperation, ApiBody, ApiParam } from '@nestjs/swagger';
import { ValidateSatelliteUseCase } from '@beyondnet/evolith-core-domain/application/use-cases';
import { ArchitectureDriftService } from '@beyondnet/evolith-core-domain/application/validators';
import { ValidateSatelliteDto, DetectDriftDto, RecommendTopologyDto, EvaluatePhaseArtifactsDto, ListPatternsQueryDto } from '../dtos/architecture.dto';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';
import { TopologyCatalogService, TopologyRecommendationService, PhaseArtifactProfileService, PatternCatalogService } from '@beyondnet/evolith-core-domain/application/services';
import type { TopologyRecommendationRules, DownstreamPhase } from '@beyondnet/evolith-core-domain/application/services';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';
import { CacheKeys, CacheTTL as TTL } from '../../infrastructure/cache/cache-keys';

@Controller({ path: 'architecture', version: '1' })
export class ArchitectureController {
  private readonly logger = new Logger(ArchitectureController.name);

  constructor(
    private readonly driftService: ArchitectureDriftService,
    private readonly validateSatelliteUseCase: ValidateSatelliteUseCase,
    private readonly workspaceResolver: WorkspaceReferenceResolverService,
    private readonly topologyCatalog: TopologyCatalogService,
    private readonly patternCatalog: PatternCatalogService,
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

  @Get('topologies/:id/patterns')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(TTL.pattern)
  @ApiOperation({
    summary: 'List the canonical patterns that apply to a topology, with the rules they impose',
    description:
      'Ordered required → recommended → optional; `not-applicable` entries are excluded. Each item carries ' +
      'the pattern, its applicability inside this topology, the per-topology guidance, and the `enforcedBy` ' +
      'rules — i.e. what adopting the topology actually obliges you to satisfy.',
  })
  @ApiParam({ name: 'id', description: 'Topology identifier', example: 'microservices' })
  @ApiEnvelopeResponse(undefined, { isArray: true, description: 'Pattern applications for the topology' })
  async listTopologyPatterns(@Param('id') id: string) {
    return this.readCatalog(() => this.patternCatalog.listByTopology(this.workspaceResolver.corePath(), id));
  }

  @Get('patterns')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(TTL.pattern)
  @ApiOperation({ summary: 'List the canonical architecture patterns (PAT-NNNN), optionally filtered' })
  @ApiEnvelopeResponse(undefined, { isArray: true, description: 'Canonical pattern records' })
  async listPatterns(@Query() query: ListPatternsQueryDto) {
    return this.readCatalog(() => this.patternCatalog.list(this.workspaceResolver.corePath(), query));
  }

  @Get('patterns/:id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(TTL.pattern)
  @ApiOperation({ summary: 'Get one canonical architecture pattern by its PAT identifier (case-insensitive)' })
  @ApiParam({ name: 'id', description: 'Canonical pattern identifier', example: 'PAT-0001' })
  @ApiEnvelopeResponse(undefined, { description: 'Canonical pattern record' })
  async getPattern(@Param('id') id: string) {
    const pattern = await this.readCatalog(() => this.patternCatalog.get(this.workspaceResolver.corePath(), id));
    if (!pattern) {
      throw new NotFoundException(`Pattern ${id} not found`);
    }
    return pattern;
  }

  /**
   * Maps pattern-catalogue faults onto the right HTTP class.
   *
   * `PatternCatalogService` deliberately THROWS when the corpus directory is missing or the
   * scan yields zero records, rather than returning `[]`. That is a server-side deployment
   * fault ("this Core has no corpus"), not a client asking for something that does not exist,
   * so it must be a 500 and never a 404 — a 404 would let a broken image masquerade as an
   * empty-but-healthy catalogue, which is the exact failure this repo already ate once.
   * The underlying message names filesystem paths, so it is logged, not returned: the client
   * gets a stable, sanitized detail and no stack.
   */
  private async readCatalog<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Canonical pattern catalogue unavailable: ${message}`);
      throw new InternalServerErrorException(
        'The canonical pattern catalogue could not be read on this server. The Core corpus is missing or malformed.',
      );
    }
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
