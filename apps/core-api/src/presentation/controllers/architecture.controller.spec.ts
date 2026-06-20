import { Test, TestingModule } from '@nestjs/testing';
import { ArchitectureController } from './architecture.controller';
import { ValidateSatelliteUseCase } from '@evolith/core-domain/application/use-cases';
import { ArchitectureDriftService } from '@evolith/core-domain/application/validators';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';

describe('ArchitectureController', () => {
  let controller: ArchitectureController;
  let validateUseCase: { execute: jest.Mock };
  let driftService: { detectDrift: jest.Mock };
  let workspaceResolver: { resolve: jest.Mock };

  beforeEach(async () => {
    validateUseCase = { execute: jest.fn().mockResolvedValue({ valid: true }) };
    driftService = { detectDrift: jest.fn().mockResolvedValue({ driftDetected: false }) };
    workspaceResolver = { resolve: jest.fn().mockReturnValue('/workspaces/op_01'), corePath: jest.fn().mockReturnValue('/core') } as any;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArchitectureController],
      providers: [
        { provide: ValidateSatelliteUseCase, useValue: validateUseCase },
        { provide: ArchitectureDriftService, useValue: driftService },
        { provide: WorkspaceReferenceResolverService, useValue: workspaceResolver },
      ],
    }).compile();
    controller = module.get<ArchitectureController>(ArchitectureController);
  });

  describe('validateSatellite', () => {
    it('should validate a satellite', async () => {
      await controller.validateSatellite({ workspaceRef: 'op_01' });
      expect(validateUseCase.execute).toHaveBeenCalledWith({
        satellitePath: '/workspaces/op_01',
        corePath: '/core',
      });
      expect(workspaceResolver.resolve).toHaveBeenCalledWith('op_01');
    });

    it('should propagate validation errors', async () => {
      validateUseCase.execute.mockRejectedValue(new Error('Invalid satellite'));
      await expect(
        controller.validateSatellite({ workspaceRef: 'op_bad' })
      ).rejects.toThrow('Invalid satellite');
    });
  });

  describe('detectDrift', () => {
    it('should detect drift with project path', async () => {
      await controller.detectDrift({ workspaceRef: 'op_01' });
      expect(driftService.detectDrift).toHaveBeenCalledWith({
        projectPath: '/workspaces/op_01',
        corePath: '/core',
        declaredLevel: undefined,
      });
    });

    it('should propagate drift detection errors', async () => {
      driftService.detectDrift.mockRejectedValue(new Error('Analysis failed'));
      await expect(
        controller.detectDrift({ workspaceRef: 'op_bad' })
      ).rejects.toThrow('Analysis failed');
    });
  });
});
