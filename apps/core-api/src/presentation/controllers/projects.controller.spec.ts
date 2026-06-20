import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { InitializeProjectUseCase, ProposePhaseAdvanceUseCase } from '@evolith/core-domain/application/use-cases';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let initUseCase: { execute: jest.Mock };
  let proposeUseCase: { execute: jest.Mock };
  let workspaceResolver: { resolve: jest.Mock };

  beforeEach(async () => {
    initUseCase = { execute: jest.fn().mockResolvedValue({ success: true }) };
    proposeUseCase = { execute: jest.fn().mockResolvedValue({ success: true }) };
    workspaceResolver = { resolve: jest.fn().mockReturnValue('/workspaces/op_01'), corePath: jest.fn().mockReturnValue('/core') } as any;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: InitializeProjectUseCase, useValue: initUseCase },
        { provide: ProposePhaseAdvanceUseCase, useValue: proposeUseCase },
        { provide: WorkspaceReferenceResolverService, useValue: workspaceResolver },
      ],
    }).compile();
    controller = module.get<ProjectsController>(ProjectsController);
  });

  describe('initialize', () => {
    it('should initialize a project', async () => {
      await controller.initialize({ workspaceRef: 'op_01', name: 'my-project', type: 'nestjs' });
      expect(initUseCase.execute).toHaveBeenCalledWith({
        name: 'my-project',
        runtime: 'nestjs',
        monorepo: 'npm-workspaces',
        architecture: 'clean',
        database: 'postgresql',
        apiProtocol: 'rest',
        ciCd: 'github-actions',
        observability: 'opentelemetry',
        features: [],
        agents: [],
      }, '/workspaces/op_01');
    });

    it('should initialize with options', async () => {
      await controller.initialize({
        workspaceRef: 'op_01', name: 'test', type: 'node',
        options: { monorepo: 'nx' },
      });
      expect(initUseCase.execute).toHaveBeenCalledWith({
        name: 'test',
        runtime: 'node',
        monorepo: 'nx',
        architecture: 'clean',
        database: 'postgresql',
        apiProtocol: 'rest',
        ciCd: 'github-actions',
        observability: 'opentelemetry',
        features: [],
        agents: [],
      }, '/workspaces/op_01');
    });

    it('should propagate init errors', async () => {
      initUseCase.execute.mockRejectedValue(new Error('Project exists'));
      await expect(
        controller.initialize({ workspaceRef: 'op_01', name: 'test', type: 'node' })
      ).rejects.toThrow('Project exists');
    });
  });

  describe('proposeAdvance', () => {
    it('should propose a phase advance', async () => {
      await controller.proposeAdvance({
        workspaceRef: 'op_01', targetPhase: 'phase-2', triggerDeploy: true,
      });
      expect(proposeUseCase.execute).toHaveBeenCalledWith({
        fromPhase: 'phase-2',
        toPhase: 'phase-2',
        projectPath: '/workspaces/op_01',
        corePath: '/core',
        triggerDeploy: true,
      });
    });

    it('should propagate advance errors', async () => {
      proposeUseCase.execute.mockRejectedValue(new Error('Invalid transition'));
      await expect(
        controller.proposeAdvance({ workspaceRef: 'op_01', targetPhase: 'phase-99' })
      ).rejects.toThrow('Invalid transition');
    });
  });
});
