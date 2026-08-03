import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { CoreReferenceQueryService } from '../../application/services/core-reference-query.service';
import { EnvConfig } from '../../infrastructure/config/env.validation';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';

@Controller({ path: '', version: '1' })
export class ReferenceController {
  constructor(
    private readonly queries: CoreReferenceQueryService,
    private readonly config: ConfigService<EnvConfig>,
  ) {}

  @Get('rulesets')
  @ApiOperation({ summary: 'List the Core rulesets available to API clients' })
  @ApiEnvelopeResponse(undefined, { isArray: true, description: 'Ruleset summaries' })
  async listRulesets() {
    return this.queries.listRulesets(this.corePath());
  }

  @Get('rulesets/:id')
  @ApiOperation({ summary: 'Fetch one Core ruleset by its canonical identifier' })
  @ApiParam({ name: 'id', description: 'URL-encoded canonical ruleset identifier' })
  @ApiEnvelopeResponse(undefined, { description: 'Ruleset content' })
  async getRuleset(@Param('id') id: string) {
    const ruleset = await this.queries.getRuleset(this.corePath(), id);
    if (!ruleset) throw new NotFoundException(`Ruleset '${id}' was not found`);
    return ruleset;
  }

  @Get('gates/:gateId')
  @ApiOperation({ summary: 'Fetch the definition of an SDLC phase gate' })
  @ApiParam({ name: 'gateId', example: 'PG1' })
  @ApiEnvelopeResponse(undefined, { description: 'Gate definition' })
  async getGate(@Param('gateId') gateId: string) {
    const gate = await this.queries.getGate(this.corePath(), gateId);
    if (!gate) throw new NotFoundException(`Gate '${gateId}' was not found`);
    return gate;
  }

  @Get('phases/:phase/requirements')
  @ApiOperation({ summary: 'Fetch the evidence and blocking requirements for an SDLC phase' })
  @ApiParam({ name: 'phase', example: '1' })
  @ApiEnvelopeResponse(undefined, { description: 'Phase requirements' })
  async getPhaseRequirements(@Param('phase') phase: string) {
    const requirements = await this.queries.getPhaseRequirements(this.corePath(), phase);
    if (!requirements) throw new NotFoundException(`Phase '${phase}' was not found`);
    return requirements;
  }

  /**
   * GT-650 / ADR-0125 — the single artifact declaration, published.
   *
   * A satellite can now CONSUME the catalogue instead of mirroring it: `evolith_tracker` ships a
   * hand-built `core-standin` copy precisely because there was nothing to read. Every entry
   * carries its schema's published `$id` — never a repository path, which is a fact about one
   * tree at one moment — or its `producedBy`, when the artifact IS a tool's own output. Those two
   * are mutually exclusive, and the difference between «no schema yet» and «deliberately no
   * schema» is the whole reason they are separate fields.
   */
  @Get('phases/artifacts')
  @ApiOperation({ summary: 'The Core artifact registry: every artifact, its phases and its canonical shape' })
  @ApiEnvelopeResponse(undefined, { description: 'Artifact registry' })
  async getArtifactRegistry() {
    const registry = await this.queries.getArtifactRegistry(this.corePath());
    if (!registry) throw new NotFoundException('The artifact registry was not found in this Core');
    return registry;
  }

  @Get('phases/:phase/artifacts')
  @ApiOperation({ summary: 'The artifacts one SDLC phase declares' })
  @ApiParam({ name: 'phase', example: 'construction' })
  @ApiEnvelopeResponse(undefined, { description: 'Artifact registry, filtered to a phase' })
  async getPhaseArtifacts(@Param('phase') phase: string) {
    const registry = await this.queries.getArtifactRegistry(this.corePath(), phase);
    if (!registry) throw new NotFoundException('The artifact registry was not found in this Core');
    return registry;
  }

  private corePath(): string {
    return this.config.getOrThrow('CORE_PATH');
  }
}
