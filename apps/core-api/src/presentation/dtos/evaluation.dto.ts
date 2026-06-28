import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class EvaluateSatelliteDto {
  @ApiProperty({ description: 'Filesystem path to the satellite repository', example: '/path/to/satellite' })
  @IsString()
  @MinLength(1)
  satellitePath!: string;

  @ApiPropertyOptional({ description: 'Optional explicit path to the Evolith Core repository', example: '/path/to/core' })
  @IsOptional()
  @IsString()
  corePath?: string;

  @ApiPropertyOptional({ description: 'Optional topology override', example: 'modular-monolith' })
  @IsOptional()
  @IsString()
  topology?: string;

  @ApiPropertyOptional({ description: 'Optional SDLC phase to evaluate', example: 'f1' })
  @IsOptional()
  @IsString()
  phase?: string;
}
