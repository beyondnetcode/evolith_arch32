import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from '../../application/services/health.service';
import { MetricsService } from '../../infrastructure/metrics/metrics.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: MetricsService, useValue: { getMetrics: jest.fn().mockResolvedValue(''), gateEvaluationsTotal: {}, gateEvaluationDuration: {} } },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return health status', () => {
    const result = controller.check();
    expect(result.status).toBe('OK');
    expect(result.service).toBe('Evolith Core API');
    expect(result.timestamp).toBeDefined();
  });

  it('should return liveness status', () => {
    const result = controller.live();
    expect(result.status).toBe('UP');
  });

  it('should return readiness status', () => {
    const result = controller.ready();
    expect(result.status).toBe('UP');
    expect(result.checks.metrics).toBe('UP');
  });
});
