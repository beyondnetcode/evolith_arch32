import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases';
import { ArchitectureDriftService } from '@evolith/core-domain/application/validators';
import { ValidateSatelliteDto, DetectDriftDto } from '../dtos/architecture.dto';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';

@Controller('architecture')
export class ArchitectureController {
  constructor(
    private readonly driftService: ArchitectureDriftService,
    private readonly validateSatelliteUseCase: ValidateSatelliteUseCase,
    private readonly workspaceResolver: WorkspaceReferenceResolverService,
  ) {}

  @Post('validate-satellite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a satellite project against architecture rules' })
  @ApiBody({ type: ValidateSatelliteDto })
  @ApiResponse({ status: 200, description: 'Validation results' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async validateSatellite(@Body() body: ValidateSatelliteDto) {
    return this.validateSatelliteUseCase.execute({
      satellitePath: this.workspaceResolver.resolve(body.workspaceRef),
      corePath: this.workspaceResolver.corePath(),
    });
  }

  @Post('detect-drift')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detect architecture drift in a project' })
  @ApiBody({ type: DetectDriftDto })
  @ApiResponse({ status: 200, description: 'Drift detection results' })
  async detectDrift(@Body() body: DetectDriftDto) {
    return this.driftService.detectDrift({
      projectPath: this.workspaceResolver.resolve(body.workspaceRef),
      corePath: this.workspaceResolver.corePath(),
      declaredLevel: body.declaredLevel as any,
    });
  }
}
