import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

/** Deployment topology of the satellite */
export enum SatelliteTopology {
  ModularMonolith = 'modular-monolith',
  Microservices = 'microservices',
  Serverless = 'serverless',
  Hybrid = 'hybrid',
}

/** SDLC phase alias */
export enum SatellitePhase {
  F0 = 'f0',
  F1 = 'f1',
  F2 = 'f2',
  F3 = 'f3',
  F4 = 'f4',
  F5 = 'f5',
}

/** Operational mode of the satellite */
export enum SatelliteMode {
  Active = 'active',
  Maintenance = 'maintenance',
  Deprecated = 'deprecated',
}

/** Lifecycle status of the satellite registry entry */
export enum SatelliteStatus {
  Active = 'active',
  Inactive = 'inactive',
  Archived = 'archived',
}

export class RegisterSatelliteDto {
  @ApiProperty({ description: 'Human-readable name of the satellite', example: 'auth-service' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Owner team or individual', example: 'platform-team' })
  @IsString()
  owner!: string;

  @ApiProperty({ description: 'Remote repository URL (HTTPS)', example: 'https://github.com/acme/auth-service' })
  @IsString()
  repoUrl!: string;

  @ApiProperty({ description: 'Clone URL (HTTPS)', example: 'https://github.com/acme/auth-service.git' })
  @IsString()
  cloneUrl!: string;

  @ApiProperty({ description: 'SSH clone URL', example: 'git@github.com:acme/auth-service.git' })
  @IsString()
  sshUrl!: string;

  @ApiProperty({ enum: SatelliteTopology, description: 'Deployment topology' })
  @IsEnum(SatelliteTopology)
  topology!: SatelliteTopology;

  @ApiProperty({ enum: SatellitePhase, description: 'Current SDLC phase' })
  @IsEnum(SatellitePhase)
  phase!: SatellitePhase;

  @ApiProperty({ enum: SatelliteMode, description: 'Operational mode' })
  @IsEnum(SatelliteMode)
  mode!: SatelliteMode;

  @ApiPropertyOptional({ description: 'Short description of the satellite' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Evolith Core version this satellite targets', example: '1.0.0' })
  @IsOptional()
  @IsString()
  coreVersion?: string;

  @ApiPropertyOptional({ description: 'Arbitrary metadata key-value pairs' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateSatelliteDto {
  @ApiPropertyOptional({ enum: SatelliteStatus, description: 'New lifecycle status' })
  @IsOptional()
  @IsEnum(SatelliteStatus)
  status?: SatelliteStatus;

  @ApiPropertyOptional({ enum: SatelliteTopology, description: 'Updated topology' })
  @IsOptional()
  @IsEnum(SatelliteTopology)
  topology?: SatelliteTopology;

  @ApiPropertyOptional({ enum: SatellitePhase, description: 'Updated SDLC phase' })
  @IsOptional()
  @IsEnum(SatellitePhase)
  phase?: SatellitePhase;

  @ApiPropertyOptional({ description: 'Updated metadata key-value pairs' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
