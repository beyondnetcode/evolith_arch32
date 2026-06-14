import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { InitializeProjectUseCase, ProposePhaseAdvanceUseCase } from '@evolith/core-domain/application/use-cases';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let initUseCase: { execute: jest.Mock };
  let proposeUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    initUseCase = { execute: jest.fn().mockResolvedValue({ success: true }) };
    proposeUseCase = { execute: jest.fn().mockResolvedValue({ success: true }) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: InitializeProjectUseCase, useValue: initUseCase },
        { provide: ProposePhaseAdvanceUseCase, useValue: proposeUseCase },
      ],
    }).compile();
    controller = module.get<ProjectsController>(ProjectsController);
  });

  describe('initialize', () => {
    it('should initialize a project', async () => {
      await controller.initialize({ targetPath: '/tmp', name: 'my-project', type: 'nestjs' });
      expect(initUseCase.execute).toHaveBeenCalledWith({
        targetPath: '/tmp',
        name: 'my-project',
        type: 'nestjs',
        options: undefined,
      });
    });

    it('should initialize with options', async () => {
      await controller.initialize({
        targetPath: '/tmp', name: 'test', type: 'node',
        options: { monorepo: 'nx' },
      });
      expect(initUseCase.execute).toHaveBeenCalledWith({
        targetPath: '/tmp',
        name: 'test',
        type: 'node',
        options: { monorepo: 'nx' },
      });
    });

    it('should propagate init errors', async () => {
      initUseCase.execute.mockRejectedValue(new Error('Project exists'));
      await expect(
        controller.initialize({ targetPath: '/tmp', name: 'test', type: 'node' })
      ).rejects.toThrow('Project exists');
    });
  });

  describe('proposeAdvance', () => {
    it('should propose a phase advance', async () => {
      await controller.proposeAdvance({
        satellitePath: '/sat', targetPhase: 'phase-2', triggerDeploy: true,
      });
      expect(proposeUseCase.execute).toHaveBeenCalledWith({
        satellitePath: '/sat',
        corePath: undefined,
        targetPhase: 'phase-2',
        triggerDeploy: true,
      });
    });

    it('should propagate advance errors', async () => {
      proposeUseCase.execute.mockRejectedValue(new Error('Invalid transition'));
      await expect(
        controller.proposeAdvance({ satellitePath: '/sat', targetPhase: 'phase-99' })
      ).rejects.toThrow('Invalid transition');
    });
  });
});
