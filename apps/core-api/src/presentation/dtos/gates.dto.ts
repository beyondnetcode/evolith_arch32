import { IsString, IsOptional, MinLength } from 'class-validator';

export class EvaluateGateDto {
  @IsString()
  @MinLength(1)
  satellitePath!: string;

  @IsOptional()
  @IsString()
  corePath?: string;
}
