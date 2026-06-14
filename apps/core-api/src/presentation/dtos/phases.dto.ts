import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, MinLength } from 'class-validator';

export class TransitionPhaseDto {
  @ApiProperty({ description: 'Current phase', example: 'phase-0' })
  @IsString()
  @MinLength(1)
  from!: string;

  @ApiProperty({ description: 'Target phase', example: 'phase-1' })
  @IsString()
  @MinLength(1)
  to!: string;

  @ApiProperty({ description: 'Tools to execute during transition', example: ['lint', 'test'] })
  @IsArray()
  @IsString({ each: true })
  tools!: string[];

  @ApiProperty({ description: 'Working directory', example: '/workspace/my-project' })
  @IsString()
  @MinLength(1)
  cwd!: string;
}
