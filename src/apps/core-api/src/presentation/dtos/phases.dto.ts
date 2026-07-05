import { ApiProperty } from '@nestjs/swagger';
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

  @ApiProperty({ description: 'Opaque workspace reference issued by the Tracker BFF', example: 'op_01j7wq8e2n' })
  @IsString()
  @MinLength(1)
  workspaceRef!: string;
}
