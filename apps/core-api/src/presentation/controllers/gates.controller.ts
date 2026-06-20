import { Controller, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { EvaluateGateUseCase } from '@evolith/core-domain/application/use-cases';
import { EvaluateGateDto } from '../dtos/gates.dto';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';

@Controller('gates')
export class GatesController {
  constructor(
    private readonly evaluateGateUseCase: EvaluateGateUseCase,
    private readonly workspaceResolver: WorkspaceReferenceResolverService,
  ) {}

  @Post(':gateId/evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate a specific phase gate' })
  @ApiParam({ name: 'gateId', description: 'Gate identifier', example: 'PG0-01' })
  @ApiBody({ type: EvaluateGateDto })
  @ApiResponse({ status: 200, description: 'Gate evaluation results' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async evaluateGate(
    @Param('gateId') gateId: string,
    @Body() body: EvaluateGateDto
  ) {
    return this.evaluateGateUseCase.execute({
      phase: this.mapGateIdToPhase(gateId),
      projectPath: this.workspaceResolver.resolve(body.workspaceRef),
      corePath: this.workspaceResolver.corePath(),
    });
  }

  private mapGateIdToPhase(gateId: string) {
    const match = gateId.match(/(\d+)/);
    switch (match?.[1]) {
      case '1': return 'discovery';
      case '2': return 'design';
      case '3': return 'construction';
      case '4': return 'qa';
      case '5': return 'release';
      default: return 'discovery';
    }
  }
}
