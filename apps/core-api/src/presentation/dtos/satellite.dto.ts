import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

// GT-367: Base DTO for satellite registration
export class CreateSatelliteDto {
  @ApiProperty({ description: 'Unique satellite identifier', example: 'sat_001' })
  @IsString()
  @MinLength(1)
  id!: string;

  @ApiProperty({ description: 'Human-readable satellite name', example: 'auth-service' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ description: 'Path to the core satellite this one extends', example: '/cores/auth' })
  @IsOptional()
  @IsString()
  parentCorePath?: string;
}

// GT-367: DTO for updating a satellite record
// GT-371: Extended with linking fields
export class UpdateSatelliteDto {
  @ApiPropertyOptional({ description: 'Human-readable satellite name', example: 'auth-service' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'GT-371: ID of the parent core satellite to link to',
    example: 'sat_core_001',
  })
  @IsOptional()
  @IsString()
  linkedSatelliteId?: string;

  @ApiPropertyOptional({
    description: 'GT-371: Path to the parent core satellite',
    example: '/cores/auth',
  })
  @IsOptional()
  @IsString()
  parentCorePath?: string;

  @ApiPropertyOptional({
    description: 'GT-371: ISO timestamp of when the link was established (auto-set by the service)',
    example: '2026-06-28T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  linkedAt?: string;
}

// GT-371: Request body for the link endpoint
export class LinkSatelliteDto {
  @ApiProperty({
    description: 'ID of the target (parent core) satellite to link to',
    example: 'sat_core_001',
  })
  @IsString()
  @MinLength(1)
  targetSatelliteId!: string;
}

// GT-367: Registry entry shape (internal, not a class-validator DTO)
export interface SatelliteRecord {
  id: string;
  name: string;
  status: 'registered' | 'linked';
  parentCorePath?: string;
  linkedSatelliteId?: string;
  linkedAt?: string;
  registeredAt: string;
}
