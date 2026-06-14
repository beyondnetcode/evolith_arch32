import { IsString, IsArray, IsOptional, MinLength } from 'class-validator';

export class TransitionPhaseDto {
  @IsString()
  @MinLength(1)
  from!: string;

  @IsString()
  @MinLength(1)
  to!: string;

  @IsArray()
  @IsString({ each: true })
  tools!: string[];

  @IsString()
  @MinLength(1)
  cwd!: string;
}

export class GateStatusQueryDto {
  @IsString()
  @MinLength(1)
  cwd!: string;
}
