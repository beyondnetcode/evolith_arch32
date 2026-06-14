import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class InitProjectDto {
  @ApiProperty({ description: 'Target directory path', example: '/workspace' })
  @IsString()
  @MinLength(1)
  targetPath!: string;

  @ApiProperty({ description: 'Project name', example: 'my-service' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ description: 'Project type', example: 'nestjs' })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ description: 'Additional options' })
  @IsOptional()
  options?: Record<string, unknown>;
}

export class ProposeAdvanceDto {
  @ApiProperty({ description: 'Path to the satellite project', example: '/workspace/my-project' })
  @IsString()
  @MinLength(1)
  satellitePath!: string;

  @ApiPropertyOptional({ description: 'Path to the Core repository' })
  @IsOptional()
  @IsString()
  corePath?: string;

  @ApiProperty({ description: 'Target phase to advance to', example: 'phase-2' })
  @IsString()
  targetPhase!: string;

  @ApiPropertyOptional({ description: 'Trigger deployment after advance' })
  @IsOptional()
  @IsBoolean()
  triggerDeploy?: boolean;
}
