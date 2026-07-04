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

  private corePath(): string {
    return this.config.getOrThrow('CORE_PATH');
  }
}
