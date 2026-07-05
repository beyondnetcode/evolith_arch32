import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiTags } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiEnvelopeResponse } from '../decorators/swagger-envelope.decorator';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';

export class ComposableValidateDto {
  @ApiProperty({ description: 'Opaque workspace reference issued by the Tracker BFF', example: 'op_01j7wq8e2n' })
  @IsString()
  @MinLength(1)
  workspaceRef!: string;

  @ApiPropertyOptional({ enum: ['native', 'opa'], default: 'native' })
  @IsOptional()
  @IsString()
  engine?: 'native' | 'opa';

  @ApiPropertyOptional({ enum: ['modular-monolith', 'distributed-modules', 'microservices', 'serverless', 'edge-computing', 'event-driven', 'data-mesh', 'agentic-ai'] })
  @IsOptional()
  @IsString()
  topology?: string;

  @ApiPropertyOptional({ enum: ['discovery', 'design', 'construction', 'qa', 'release', 'f1', 'f2', 'f3', 'f4', 'f5'], description: 'Canonical SDLC phase ids; legacy f1..f5 accepted as deprecated aliases (GT-343).' })
  @IsOptional()
  @IsString()
  phase?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ruleset?: string;

  @ApiPropertyOptional({ enum: ['adr-0002', 'adr-0005', 'adr-0010', 'adr-0018', 'adr-0032', 'adr-0040', 'adr-0050'] })
  @IsOptional()
  @IsString()
  adr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  file?: string;
}

@ApiTags('composable-validation')
@Controller({ path: 'validate', version: '1' })
export class ComposableValidateController {
  constructor(private readonly workspaceResolver: WorkspaceReferenceResolverService) {}

  @Post('composable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Composable validation (SDLC, Architecture, Ruleset, ADR, Ad-hoc)' })
  @ApiBody({ type: ComposableValidateDto })
  @ApiEnvelopeResponse(undefined, { description: 'Composable validation results' })
  async composableValidate(@Body() body: ComposableValidateDto) {
    // WorkspaceReferenceResolverService.resolve() already validates the ref format
    // and ensures the resolved path stays within WORKSPACE_ROOT (no path traversal).
    const satellitePath = this.workspaceResolver.resolve(body.workspaceRef);
    const corePath = this.workspaceResolver.corePath();

    const { ComposableValidationEngine } = await import('@beyondnet/evolith-core-domain/application/validators/modes/composable-validation-engine');
    const { SdlcValidationMode } = await import('@beyondnet/evolith-core-domain/application/validators/modes/sdlc-validation.mode');
    const { ArchitectureValidationMode } = await import('@beyondnet/evolith-core-domain/application/validators/modes/architecture-validation.mode');
    const { RulesetValidationMode } = await import('@beyondnet/evolith-core-domain/application/validators/modes/ruleset-validation.mode');
    const { AdrValidationMode } = await import('@beyondnet/evolith-core-domain/application/validators/modes/adr-validation.mode');
    const { AdhocValidationMode } = await import('@beyondnet/evolith-core-domain/application/validators/modes/adhoc-validation.mode');

    const engine = new ComposableValidationEngine();
    engine.registerMode(new SdlcValidationMode());
    engine.registerMode(new ArchitectureValidationMode());
    engine.registerMode(new RulesetValidationMode());
    engine.registerMode(new AdrValidationMode());
    engine.registerMode(new AdhocValidationMode());

    return engine.execute({
      satellitePath,
      corePath,
      engine: body.engine ?? 'native',
      topology: body.topology,
      phase: body.phase,
      rulesetId: body.ruleset,
      adrId: body.adr,
      filePath: body.file,
    });
  }
}
