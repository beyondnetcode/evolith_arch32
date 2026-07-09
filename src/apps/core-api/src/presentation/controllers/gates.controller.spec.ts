import { Test, TestingModule } from '@nestjs/testing';
import { GatesController } from './gates.controller';
import { EvaluateGateUseCase } from '@beyondnet/evolith-core-domain/application/use-cases';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';

describe('GatesController', () => {
  let controller: GatesController;
  let useCase: { execute: jest.Mock };
  let workspaceResolver: { resolve: jest.Mock };

  beforeEach(async () => {
    useCase = { execute: jest.fn().mockResolvedValue({ passed: true }) };
    workspaceResolver = { resolve: jest.fn().mockReturnValue('/workspaces/op_01'), corePath: jest.fn().mockReturnValue('/core') } as any;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatesController],
      providers: [
        { provide: EvaluateGateUseCase, useValue: useCase },
        { provide: WorkspaceReferenceResolverService, useValue: workspaceResolver },
      ],
    }).compile();
    controller = module.get<GatesController>(GatesController);
  });

  it('should evaluate a gate with required params', async () => {
    await controller.evaluateGate('PG1-01', { workspaceRef: 'op_01' });
    expect(useCase.execute).toHaveBeenCalledWith({
      phase: 'discovery',
      projectPath: '/workspaces/op_01',
      corePath: '/core',
      evaluatedBy: undefined,
    });
  });

  it('should use the server Core path', async () => {
    await controller.evaluateGate('PG1-01', { workspaceRef: 'op_01' });
    expect(useCase.execute).toHaveBeenCalledWith({
      phase: 'discovery',
      projectPath: '/workspaces/op_01',
      corePath: '/core',
      evaluatedBy: undefined,
    });
  });

  it('should forward an explicit evaluatedBy to the use case', async () => {
    await controller.evaluateGate('PG2-01', { workspaceRef: 'op_01', evaluatedBy: 'ci' });
    expect(useCase.execute).toHaveBeenCalledWith({
      phase: 'design',
      projectPath: '/workspaces/op_01',
      corePath: '/core',
      evaluatedBy: 'ci',
    });
  });

  it('should reject an unknown gate id with a 400', async () => {
    await expect(
      controller.evaluateGate('PG0-01', { workspaceRef: 'op_01' })
    ).rejects.toThrow(/Unknown gate id/);
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('should propagate use case errors', async () => {
    useCase.execute.mockRejectedValue(new Error('Gate validation failed'));
    await expect(
      controller.evaluateGate('PG1-01', { workspaceRef: 'op_01' })
    ).rejects.toThrow('Gate validation failed');
  });
});
