import { Test, TestingModule } from '@nestjs/testing';
import { ArchitectureController } from './architecture.controller';
import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases';
import { ArchitectureDriftService } from '@evolith/core-domain/application/validators';

describe('ArchitectureController', () => {
  let controller: ArchitectureController;
  let validateUseCase: { execute: jest.Mock };
  let driftService: { detectDrift: jest.Mock };

  beforeEach(async () => {
    validateUseCase = { execute: jest.fn().mockResolvedValue({ valid: true }) };
    driftService = { detectDrift: jest.fn().mockResolvedValue({ driftDetected: false }) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArchitectureController],
      providers: [
        { provide: ValidateSatelliteUseCase, useValue: validateUseCase },
        { provide: ArchitectureDriftService, useValue: driftService },
      ],
    }).compile();
    controller = module.get<ArchitectureController>(ArchitectureController);
  });

  describe('validateSatellite', () => {
    it('should validate a satellite', async () => {
      await controller.validateSatellite({ satellitePath: '/sat' });
      expect(validateUseCase.execute).toHaveBeenCalledWith({
        satellitePath: '/sat',
        corePath: undefined,
      });
    });

    it('should propagate validation errors', async () => {
      validateUseCase.execute.mockRejectedValue(new Error('Invalid satellite'));
      await expect(
        controller.validateSatellite({ satellitePath: '/bad' })
      ).rejects.toThrow('Invalid satellite');
    });
  });

  describe('detectDrift', () => {
    it('should detect drift with project path', async () => {
      await controller.detectDrift({ projectPath: '/proj' });
      expect(driftService.detectDrift).toHaveBeenCalledWith({
        projectPath: '/proj',
        corePath: undefined,
        declaredLevel: undefined,
      });
    });

    it('should propagate drift detection errors', async () => {
      driftService.detectDrift.mockRejectedValue(new Error('Analysis failed'));
      await expect(
        controller.detectDrift({ projectPath: '/bad' })
      ).rejects.toThrow('Analysis failed');
    });
  });
});
