import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, IsObject, IsIn, IsArray, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { SatelliteManifestDto } from './satellite-manifest.dto';

/** Categories accepted by `GET /architecture/patterns?category=` — mirrors `pattern.schema.json`. */
export const PATTERN_CATEGORIES = [
  'data-ownership',
  'contracts',
  'resilience',
  'integration',
  'governance',
  'structure',
  'observability',
  'security',
  'ai-safety',
  'delivery',
] as const;

export class ValidateSatelliteDto {
  @ApiProperty({ description: 'Opaque workspace reference issued by the Tracker BFF', example: 'op_01j7wq8e2n' })
  @IsString()
  @MinLength(1)
  workspaceRef!: string;

  @ApiPropertyOptional({ description: 'Optional satellite manifest to trigger the end-to-end evaluation pipeline', type: SatelliteManifestDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SatelliteManifestDto)
  manifest?: SatelliteManifestDto;
}

export class DetectDriftDto {
  @ApiProperty({ description: 'Opaque workspace reference issued by the Tracker BFF', example: 'op_01j7wq8e2n' })
  @IsString()
  @MinLength(1)
  workspaceRef!: string;

  @ApiPropertyOptional({ description: 'Declared architecture maturity level', example: 'F2' })
  @IsOptional()
  @IsString()
  declaredLevel?: string;
}

export class RecommendTopologyDto {
  @ApiPropertyOptional({
    description: 'Technical signals used to recommend a topology composition (advisory, ADR-0104). Boolean signals plus an optional teamCount.',
    example: { deploymentIndependence: true, asyncIntegration: true, teamCount: 4 },
  })
  @IsOptional()
  @IsObject()
  signals?: Record<string, boolean | number>;
}

export class EvaluatePhaseArtifactsDto {
  @ApiProperty({ description: 'Downstream SDLC phase (ADR-0104 / DN-06)', enum: ['construction', 'quality', 'deployment'], example: 'quality' })
  @IsIn(['construction', 'quality', 'deployment'])
  phase!: 'construction' | 'quality' | 'deployment';

  @ApiProperty({ description: 'Confirmed topology composition', type: [String], example: ['microservices', 'event-driven'] })
  @IsArray()
  @IsString({ each: true })
  topologies!: string[];

  @ApiPropertyOptional({ description: 'Artifact kinds the consumer declares as present', type: [String], example: ['test-summary-report', 'coverage-report'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declaredArtifacts?: string[];
}

/**
 * Query filters for `GET /architecture/patterns`. Every field is optional; omitting all of
 * them lists the whole canonical catalogue. Maps 1:1 onto `PatternCatalogFilters` in
 * core-domain — the REST surface adds validation, never a second filtering implementation.
 */
export class ListPatternsQueryDto {
  @ApiPropertyOptional({ description: 'Primary concern the pattern addresses', enum: PATTERN_CATEGORIES, example: 'resilience' })
  @IsOptional()
  @IsIn(PATTERN_CATEGORIES as unknown as string[])
  category?: (typeof PATTERN_CATEGORIES)[number];

  @ApiPropertyOptional({ description: 'Prescriptive pattern or prohibited practice', enum: ['pattern', 'anti-pattern'], example: 'anti-pattern' })
  @IsOptional()
  @IsIn(['pattern', 'anti-pattern'])
  kind?: 'pattern' | 'anti-pattern';

  @ApiPropertyOptional({ description: 'Keep only patterns applicable to this topology', example: 'microservices' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  topology?: string;

  @ApiPropertyOptional({ description: 'true → only patterns backed by at least one enforcing rule; false → only unenforced ones', example: true })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value))
  @IsBoolean()
  enforced?: boolean;
}
