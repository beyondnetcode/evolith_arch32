import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases';
import { ArchitectureDriftService } from '@evolith/core-domain/application/validators';

@Controller('architecture')
export class ArchitectureController {
  constructor(
    private readonly driftService: ArchitectureDriftService,
    private readonly validateSatelliteUseCase: ValidateSatelliteUseCase
  ) {}

  @Post('validate-satellite')
  async validateSatellite(@Body() body: { satellitePath: string; corePath?: string }) {
    const result = await this.validateSatelliteUseCase.execute({
      satellitePath: body.satellitePath,
      corePath: body.corePath,
    });
    
    return result;
  }

  @Post('detect-drift')
  async detectDrift(@Body() body: { projectPath: string; corePath?: string; declaredLevel?: any }) {
    const result = await this.driftService.detectDrift({
      projectPath: body.projectPath,
      corePath: body.corePath,
      declaredLevel: body.declaredLevel,
    });
    
    return result;
  }
}
