import { Test, TestingModule } from '@nestjs/testing';
import { PhasesController } from './phases.controller';
import { PhaseTransitionUseCase } from '@beyondnet/evolith-core-domain/application/use-cases';
import { WorkspaceReferenceResolverService } from '../../application/services/workspace-reference-resolver.service';

describe('PhasesController', () => {
  let controller: PhasesController;
  let useCase: { execute: jest.Mock };
  let workspaceResolver: { resolve: jest.Mock };

  beforeEach(async () => {
    useCase = { execute: jest.fn().mockResolvedValue({ success: true, from: 'phase-0', to: 'phase-1' }) };
    workspaceResolver = { resolve: jest.fn().mockReturnValue('/workspaces/op_01') };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhasesController],
      providers: [{ provide: PhaseTransitionUseCase, useValue: useCase }, { provide: WorkspaceReferenceResolverService, useValue: workspaceResolver }],
    }).compile();
    controller = module.get<PhasesController>(PhasesController);
  });

  it('should execute a phase transition', async () => {
    await controller.transition({
      from: 'phase-0',
      to: 'phase-1',
      tools: ['lint', 'test'],
      workspaceRef: 'op_01',
    });
    expect(useCase.execute).toHaveBeenCalledWith('phase-0', 'phase-1', ['lint', 'test'], '/workspaces/op_01');
  });

  it('should propagate use case errors', async () => {
    useCase.execute.mockRejectedValue(new Error('Invalid phase transition'));
    await expect(
      controller.transition({ from: 'phase-0', to: 'phase-99', tools: [], workspaceRef: 'op_01' })
    ).rejects.toThrow('Invalid phase transition');
  });
});
