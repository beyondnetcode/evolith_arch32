import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiBody, ApiParam } from '@nestjs/swagger';
import { SatelliteRegistryService } from '../../application/services/satellite-registry.service';
import {
  CreateSatelliteDto,
  UpdateSatelliteDto,
  LinkSatelliteDto,
} from '../dtos/satellite.dto';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';

/**
 * GT-367: Satellite registry CRUD endpoints.
 * GT-371: Extended with POST /satellites/:id/link for satellite-to-satellite linking.
 */
@Controller({ path: 'satellites', version: '1' })
export class SatellitesController {
  constructor(private readonly registryService: SatelliteRegistryService) {}

  // ── GT-367 ────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new satellite' })
  @ApiBody({ type: CreateSatelliteDto })
  @ApiEnvelopeResponse(undefined, { status: 201, description: 'Satellite registered' })
  register(@Body() body: CreateSatelliteDto) {
    return this.registryService.register(body.id, body.name, body.parentCorePath);
  }

  @Get()
  @ApiOperation({ summary: 'List all registered satellites' })
  @ApiEnvelopeResponse(undefined, { description: 'List of satellite records' })
  findAll() {
    return this.registryService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a satellite by ID' })
  @ApiParam({ name: 'id', description: 'Satellite ID' })
  @ApiEnvelopeResponse(undefined, { description: 'Satellite record' })
  findOne(@Param('id') id: string) {
    const record = this.registryService.findById(id);
    if (!record) {
      throw new NotFoundException(`Satellite '${id}' not found`);
    }
    return record;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a satellite record' })
  @ApiParam({ name: 'id', description: 'Satellite ID' })
  @ApiBody({ type: UpdateSatelliteDto })
  @ApiEnvelopeResponse(undefined, { description: 'Updated satellite record' })
  update(@Param('id') id: string, @Body() body: UpdateSatelliteDto) {
    return this.registryService.update(id, body);
  }

  // ── GT-371 ────────────────────────────────────────────────────────────────

  /**
   * Link a satellite to a parent core satellite.
   *
   * POST /api/v1/satellites/:id/link
   * Body: { targetSatelliteId: string }
   *
   * Sets source.linkedSatelliteId = target.id, source.status = 'linked',
   * source.linkedAt = <now ISO>. Both source and target must already exist in
   * the registry.
   */
  @Post(':id/link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GT-371 — Link a satellite to a parent core satellite' })
  @ApiParam({ name: 'id', description: 'Source satellite ID to be linked' })
  @ApiBody({ type: LinkSatelliteDto })
  @ApiEnvelopeResponse(undefined, { description: 'Updated source satellite record after linking' })
  link(@Param('id') id: string, @Body() body: LinkSatelliteDto) {
    return this.registryService.link(id, body.targetSatelliteId);
  }
}
