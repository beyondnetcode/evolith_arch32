import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class EvaluateGateDto {
  @ApiProperty({ description: 'Path to the satellite project', example: '/workspace/my-project' })
  @IsString()
  @MinLength(1)
  satellitePath!: string;

  @ApiPropertyOptional({ description: 'Path to the Core repository' })
  @IsOptional()
  @IsString()
  corePath?: string;
}
