import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsArray, ValidateNested, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class EvidenceFactDto {
  @ApiProperty({ description: 'Path or identifier of the evaluated artifact', example: 'rulesets/compliance-baseline/compliance-baseline.rules.json' })
  @IsString()
  artifact!: string;

  @ApiPropertyOptional({ description: 'Optional status', example: 'passed' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class WaiverFactDto {
  @ApiProperty({ description: 'Rule or criterion waived', example: 'GOV-001' })
  @IsString()
  criterion!: string;

  @ApiProperty({ description: 'Waiver status', example: 'approved' })
  @IsString()
  status!: string;

  @ApiPropertyOptional({ description: 'Waiver expiration date (ISO 8601)', example: '2027-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;
}

export class GateMandatoryEvidenceDto {
  @ApiProperty({ description: 'Required artifact name or pattern' })
  @IsString()
  artifact!: string;
}

export class GateBlockingCriterionDto {
  @ApiProperty({ description: 'Criterion identifier' })
  @IsString()
  criterion!: string;
}

export class GateFactsDto {
  @ApiPropertyOptional({ description: 'Numeric phase identifier', example: 1 })
  @IsOptional()
  @IsNumber()
  phase?: number;

  @ApiPropertyOptional({ description: 'Mandatory evidence', type: [GateMandatoryEvidenceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GateMandatoryEvidenceDto)
  mandatoryEvidence?: GateMandatoryEvidenceDto[];

  @ApiPropertyOptional({ description: 'Blocking criteria', type: [GateBlockingCriterionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GateBlockingCriterionDto)
  blockingCriteria?: GateBlockingCriterionDto[];
}

export class EvaluationFactsDto {
  @ApiPropertyOptional({ description: 'Echoed canonical context + declared sub-configs' })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Phase-gate shape consumed by phase-gates.rego', type: GateFactsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GateFactsDto)
  gate?: GateFactsDto;

  @ApiPropertyOptional({ description: 'Presented-artifact evidence', type: [EvidenceFactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceFactDto)
  evidence?: EvidenceFactDto[];

  @ApiPropertyOptional({ description: 'Waivers for phase-gates.rego', type: [WaiverFactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaiverFactDto)
  waiver?: WaiverFactDto[];

  @ApiPropertyOptional({ description: 'Opaque tenant echo for the gate audit field', example: 'tenant-123' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'ISO-8601 date for waiver-expiry comparison' })
  @IsOptional()
  @IsDateString()
  evaluationDate?: string;
}

export class SatelliteManifestDto {
  @ApiProperty({ description: 'Filesystem path to the satellite repository', example: '/path/to/satellite' })
  @IsString()
  satellitePath!: string;

  @ApiPropertyOptional({ description: 'Optional explicit path to the Evolith Core repository' })
  @IsOptional()
  @IsString()
  corePath?: string;

  @ApiPropertyOptional({ description: 'Optional topology override. If omitted, the pipeline auto-detects.' })
  @IsOptional()
  @IsString()
  topology?: string;

  @ApiPropertyOptional({ description: 'Optional SDLC phase. If provided, the pipeline evaluates only the gates for that phase.' })
  @IsOptional()
  @IsString()
  phase?: string;

  @ApiPropertyOptional({ description: 'Declared facts projected from the canonical EvaluationContext', type: EvaluationFactsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EvaluationFactsDto)
  facts?: EvaluationFactsDto;
}
