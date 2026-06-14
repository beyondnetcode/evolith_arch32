import { Test, TestingModule } from '@nestjs/testing';
import { CoreDomainModule } from './core-domain.module';
import { EvaluateGateUseCase } from '@evolith/core-domain/application/use-cases';

describe('CoreDomainModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [CoreDomainModule],
    }).compile();
  });

  it('should be importable in isolation', () => {
    expect(module).toBeDefined();
  });

  it('should resolve EvaluateGateUseCase', () => {
    const useCase = module.get<EvaluateGateUseCase>(EvaluateGateUseCase);
    expect(useCase).toBeDefined();
  });

  it('should resolve IFileSystem', () => {
    const fs = module.get('IFileSystem');
    expect(fs).toBeDefined();
  });
});
