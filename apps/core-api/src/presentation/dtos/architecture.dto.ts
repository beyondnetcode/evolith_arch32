import { IsString, IsOptional, MinLength } from 'class-validator';

export class ValidateSatelliteDto {
  @IsString()
  @MinLength(1)
  satellitePath!: string;

  @IsOptional()
  @IsString()
  corePath?: string;
}

export class DetectDriftDto {
  @IsString()
  @MinLength(1)
  projectPath!: string;

  @IsOptional()
  @IsString()
  corePath?: string;

  @IsOptional()
  @IsString()
  declaredLevel?: string;
}
