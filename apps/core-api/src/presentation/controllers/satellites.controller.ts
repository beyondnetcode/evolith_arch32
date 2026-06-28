import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { SatelliteRegistryService } from '../../application/services/satellite-registry.service';
import { RegisterSatelliteDto, UpdateSatelliteDto } from '../dtos/satellite.dto';

/** ADR-0073 response envelope */
function envelope<T>(data: T, version = '1') {
  return {
    success: true,
    data,
    meta: {
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
      version,
    },
  };
}

@ApiTags('satellites')
@Controller({ path: 'satellites', version: '1' })
export class SatellitesController {
  constructor(private readonly registry: SatelliteRegistryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new satellite' })
  @ApiBody({ type: RegisterSatelliteDto })
  register(@Body() dto: RegisterSatelliteDto) {
    const record = this.registry.create(dto);
    return envelope(record);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all satellites' })
  findAll() {
    return envelope(this.registry.findAll());
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a satellite by id' })
  @ApiParam({ name: 'id', description: 'Satellite UUID' })
  findOne(@Param('id') id: string) {
    return envelope(this.registry.findById(id));
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update status or metadata of a satellite' })
  @ApiParam({ name: 'id', description: 'Satellite UUID' })
  @ApiBody({ type: UpdateSatelliteDto })
  update(@Param('id') id: string, @Body() dto: UpdateSatelliteDto) {
    return envelope(this.registry.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a satellite (sets status to archived)' })
  @ApiParam({ name: 'id', description: 'Satellite UUID' })
  remove(@Param('id') id: string) {
    return envelope(this.registry.softDelete(id));
  }
}
