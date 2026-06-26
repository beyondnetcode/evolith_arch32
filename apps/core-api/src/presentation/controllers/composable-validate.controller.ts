/**
 * GT-312: Composable Validation REST Controller
 * Exposes the composable validation engine as REST endpoints.
 */

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';

export interface ComposableValidateDto {
  path: string;
  corePath?: string;
  engine?: 'native' | 'opa';
  topology?: string;
  phase?: string;
  ruleset?: string;
  adr?: string;
  file?: string;
}

@ApiTags('composable-validation')
@Controller({ path: 'validate', version: '1' })
export class ComposableValidateController {
  @Post('composable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate using the composable engine (GT-312)',
    description: 'Supports multiple validation modes: SDLC, Architecture, Ruleset, ADR, Ad-hoc. Can combine modes.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the satellite repository' },
        corePath: { type: 'string', description: 'Optional path to Evolith Core repository' },
        engine: { type: 'string', enum: ['native', 'opa'], default: 'native' },
        topology: {
          type: 'string',
          enum: ['modular-monolith', 'distributed-modules', 'microservices', 'serverless', 'edge-computing', 'event-driven', 'data-mesh', 'agentic-ai'],
          description: 'Architecture topology to validate',
        },
        phase: { type: 'string', enum: ['f1', 'f2', 'f3', 'f4', 'f5'], description: 'SDLC phase to validate' },
        ruleset: { type: 'string', description: 'Specific ruleset to validate' },
        adr: {
          type: 'string',
          enum: ['adr-0002', 'adr-0005', 'adr-0010', 'adr-0018', 'adr-0032', 'adr-0040', 'adr-0050'],
          description: 'ADR rules to validate',
        },
        file: { type: 'string', description: 'Individual file to validate (ad-hoc mode)' },
      },
      required: ['path'],
    },
  })
  @ApiEnvelopeResponse(undefined, { description: 'Composable validation results' })
  async composableValidate(@Body() body: ComposableValidateDto) {
    const { ComposableValidationEngine } = await import('@evolith/core-domain/application/validators/modes/composable-validation-engine');
    const { SdlcValidationMode } = await import('@evolith/core-domain/application/validators/modes/sdlc-validation.mode');
    const { ArchitectureValidationMode } = await import('@evolith/core-domain/application/validators/modes/architecture-validation.mode');
    const { RulesetValidationMode } = await import('@evolith/core-domain/application/validators/modes/ruleset-validation.mode');
    const { AdrValidationMode } = await import('@evolith/core-domain/application/validators/modes/adr-validation.mode');
    const { AdhocValidationMode } = await import('@evolith/core-domain/application/validators/modes/adhoc-validation.mode');

    const engine = new ComposableValidationEngine();
    engine.registerMode(new SdlcValidationMode());
    engine.registerMode(new ArchitectureValidationMode());
    engine.registerMode(new RulesetValidationMode());
    engine.registerMode(new AdrValidationMode());
    engine.registerMode(new AdhocValidationMode());

    const context = {
      satellitePath: body.path,
      corePath: body.corePath,
      engine: body.engine || 'native',
      topology: body.topology,
      phase: body.phase,
      rulesetId: body.ruleset,
      adrId: body.adr,
      filePath: body.file,
    };

    return engine.execute(context);
  }
}
