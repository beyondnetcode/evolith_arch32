import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';
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
