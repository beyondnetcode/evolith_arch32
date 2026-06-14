import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from '../../application/services/health.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return health status', () => {
    const result = controller.check();
    expect(result.status).toBe('OK');
    expect(result.service).toBe('Evolith Core API');
    expect(result.timestamp).toBeDefined();
  });
});
