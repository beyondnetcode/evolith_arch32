import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, IsObject, IsIn, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { SatelliteManifestDto } from './satellite-manifest.dto';

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
