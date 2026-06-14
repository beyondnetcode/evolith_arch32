import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class ValidateSatelliteDto {
  @ApiProperty({ description: 'Path to the satellite project', example: '/workspace/my-project' })
  @IsString()
  @MinLength(1)
  satellitePath!: string;

  @ApiPropertyOptional({ description: 'Path to the Core repository', example: '/workspace/evolith' })
  @IsOptional()
  @IsString()
  corePath?: string;
}

export class DetectDriftDto {
  @ApiProperty({ description: 'Path to the project', example: '/workspace/my-project' })
  @IsString()
  @MinLength(1)
  projectPath!: string;

  @ApiPropertyOptional({ description: 'Path to the Core repository' })
  @IsOptional()
  @IsString()
  corePath?: string;

  @ApiPropertyOptional({ description: 'Declared architecture maturity level', example: 'F2' })
  @IsOptional()
  @IsString()
  declaredLevel?: string;
}
