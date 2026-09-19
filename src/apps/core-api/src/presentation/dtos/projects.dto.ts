import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, Matches, MinLength } from 'class-validator';

export class InitProjectDto {
  @ApiProperty({ description: 'Opaque workspace reference issued by the Tracker BFF', example: 'op_01j7wq8e2n' })
  @IsString()
  @MinLength(1)
  workspaceRef!: string;

  @ApiProperty({ description: 'Project name — becomes the directory under the workspace, so one path segment only', example: 'my-service' })
  @IsString()
  @MinLength(1)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/, {
    message: 'name must be a single directory name: letters, digits, ".", "-" or "_" (cannot start with "." or "-")',
  })
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
