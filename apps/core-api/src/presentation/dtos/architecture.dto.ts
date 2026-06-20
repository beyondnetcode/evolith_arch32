import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class ValidateSatelliteDto {
  @ApiProperty({ description: 'Opaque workspace reference issued by the Tracker BFF', example: 'op_01j7wq8e2n' })
  @IsString()
  @MinLength(1)
  workspaceRef!: string;

}

export class DetectDriftDto {
  @ApiProperty({ description: 'Opaque workspace reference issued by the Tracker BFF', example: 'op_01j7wq8e2n' })
  @IsString()
  @MinLength(1)
  workspaceRef!: string;

  @ApiPropertyOptional({ description: 'Declared architecture maturity level', example: 'F2' })
  @IsOptional()
  @IsString()
  declaredLevel?: string;
}
