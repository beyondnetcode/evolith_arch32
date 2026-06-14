import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiSecurity } from '@nestjs/swagger';
import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases';
import { ArchitectureDriftService } from '@evolith/core-domain/application/validators';
import { ValidateSatelliteDto, DetectDriftDto } from '../dtos/architecture.dto';

@ApiSecurity('api-key')
@Controller('architecture')
export class ArchitectureController {
  constructor(
    private readonly driftService: ArchitectureDriftService,
    private readonly validateSatelliteUseCase: ValidateSatelliteUseCase
  ) {}

  @Post('validate-satellite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a satellite project against architecture rules' })
  @ApiBody({ type: ValidateSatelliteDto })
  @ApiResponse({ status: 200, description: 'Validation results' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
  async validateSatellite(@Body() body: ValidateSatelliteDto) {
    return this.validateSatelliteUseCase.execute({
      satellitePath: body.satellitePath,
      corePath: body.corePath,
    });
  }

  @Post('detect-drift')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detect architecture drift in a project' })
  @ApiBody({ type: DetectDriftDto })
  @ApiResponse({ status: 200, description: 'Drift detection results' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API key' })
  async detectDrift(@Body() body: DetectDriftDto) {
    return this.driftService.detectDrift({
      projectPath: body.projectPath,
      corePath: body.corePath,
      declaredLevel: body.declaredLevel as any,
    });
  }
}
