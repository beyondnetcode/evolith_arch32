import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class InitProjectDto {
  @IsString()
  @MinLength(1)
  targetPath!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  type!: string;

  @IsOptional()
  options?: Record<string, unknown>;
}

export class ProposeAdvanceDto {
  @IsString()
  @MinLength(1)
  satellitePath!: string;

  @IsOptional()
  @IsString()
  corePath?: string;

  @IsString()
  targetPhase!: string;

  @IsOptional()
  @IsBoolean()
  triggerDeploy?: boolean;
}
