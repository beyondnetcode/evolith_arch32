import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import {
  buildCapabilityManifest,
  type CapabilityManifest,
} from '@beyondnet/evolith-core-domain/capabilities/capabilities-manifest';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';

/**
 * GT-513 — live capability manifest surface.
 *
 * `GET /api/v1/capabilities` returns the versioned {@link CapabilityManifest}
 * assembled by the domain's {@link buildCapabilityManifest}. The payload is
 * wrapped in the ADR-0073 success envelope by the global `EnvelopeInterceptor`,
 * so the handler returns the raw manifest.
 */
@Controller({ path: 'capabilities', version: '1' })
export class CapabilitiesController {
  @Get()
  @ApiOperation({ summary: 'Return the Core capability manifest' })
  @ApiEnvelopeResponse(undefined, { description: 'Core capability manifest' })
  getCapabilities(): CapabilityManifest {
    return buildCapabilityManifest();
  }
}
