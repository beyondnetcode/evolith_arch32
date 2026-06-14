import { Test, TestingModule } from '@nestjs/testing';
import { GatesController } from './gates.controller';
import { EvaluateGateUseCase } from '@evolith/core-domain/application/use-cases';

describe('GatesController', () => {
  let controller: GatesController;
  let useCase: { execute: jest.Mock };

  beforeEach(async () => {
    useCase = { execute: jest.fn().mockResolvedValue({ passed: true }) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatesController],
      providers: [{ provide: EvaluateGateUseCase, useValue: useCase }],
    }).compile();
    controller = module.get<GatesController>(GatesController);
  });

  it('should evaluate a gate with required params', async () => {
    await controller.evaluateGate('PG0-01', { satellitePath: '/test' });
    expect(useCase.execute).toHaveBeenCalledWith({
      satellitePath: '/test',
      gateId: 'PG0-01',
      corePath: undefined,
    });
  });

  it('should evaluate a gate with optional corePath', async () => {
    await controller.evaluateGate('PG1-01', { satellitePath: '/sat', corePath: '/core' });
    expect(useCase.execute).toHaveBeenCalledWith({
      satellitePath: '/sat',
      gateId: 'PG1-01',
      corePath: '/core',
    });
  });

  it('should propagate use case errors', async () => {
    useCase.execute.mockRejectedValue(new Error('Gate validation failed'));
    await expect(
      controller.evaluateGate('PG0-01', { satellitePath: '/test' })
    ).rejects.toThrow('Gate validation failed');
  });
});
