import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsIn } from 'class-validator';

export class EvaluateGateDto {
  @ApiProperty({ description: 'Opaque workspace reference issued by the Tracker BFF', example: 'op_01j7wq8e2n' })
  @IsString()
  @MinLength(1)
  workspaceRef!: string;

  @ApiPropertyOptional({
    description: 'Evaluator kind recorded on the ADR-0073 GateEvidence (parity with the CLI/MCP surfaces). Defaults to "human".',
    enum: ['human', 'agent', 'ci'],
    example: 'ci',
  })
  @IsOptional()
  @IsIn(['human', 'agent', 'ci'])
  evaluatedBy?: 'human' | 'agent' | 'ci';

}
