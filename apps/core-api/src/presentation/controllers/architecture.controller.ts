import { Controller, Post, Body } from '@nestjs/common';
import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases';
import { ArchitectureDriftService } from '@evolith/core-domain/application/validators';
import { ValidateSatelliteDto, DetectDriftDto } from '../dtos/architecture.dto';

@Controller('architecture')
export class ArchitectureController {
  constructor(
    private readonly driftService: ArchitectureDriftService,
    private readonly validateSatelliteUseCase: ValidateSatelliteUseCase
  ) {}

  @Post('validate-satellite')
  async validateSatellite(@Body() body: ValidateSatelliteDto) {
    return this.validateSatelliteUseCase.execute({
      satellitePath: body.satellitePath,
      corePath: body.corePath,
    });
  }

  @Post('detect-drift')
  async detectDrift(@Body() body: DetectDriftDto) {
    return this.driftService.detectDrift({
      projectPath: body.projectPath,
      corePath: body.corePath,
      declaredLevel: body.declaredLevel as any,
    });
  }
}
