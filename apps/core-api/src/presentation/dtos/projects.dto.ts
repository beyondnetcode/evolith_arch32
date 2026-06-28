import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class InitProjectDto {
  @ApiProperty({ description: 'Opaque workspace reference issued by the Tracker BFF', example: 'op_01j7wq8e2n' })
  @IsString()
  @MinLength(1)
  workspaceRef!: string;

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
  @ApiProperty({ description: 'Opaque workspace reference issued by the Tracker BFF', example: 'op_01j7wq8e2n' })
  @IsString()
  @MinLength(1)
  workspaceRef!: string;

  @ApiPropertyOptional({ description: 'Current phase (gate to evaluate exit from). Defaults to targetPhase when omitted by the BFF.', example: 'phase-1' })
  @IsOptional()
  @IsString()
  currentPhase?: string;

  @ApiProperty({ description: 'Target phase to advance to', example: 'phase-2' })
  @IsString()
  targetPhase!: string;

  @ApiPropertyOptional({ description: 'Trigger deployment after advance' })
  @IsOptional()
  @IsBoolean()
  triggerDeploy?: boolean;
}
