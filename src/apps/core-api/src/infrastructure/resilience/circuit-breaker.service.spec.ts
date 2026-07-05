import { CircuitBreakerService } from './circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    service = new CircuitBreakerService();
  });

  it('should create a circuit breaker', () => {
    const breaker = service.createBreaker('test', async () => 'result');
    expect(breaker).toBeDefined();
  });

  it('should execute function through circuit breaker', async () => {
    const breaker = service.createBreaker('test', async () => 'success');
    const result = await breaker.fire();
    expect(result).toBe('success');
  });

  it('should use fallback when function fails', async () => {
    const breaker = service.createBreaker(
      'fallback-test',
      async () => { throw new Error('fail'); },
      async () => 'fallback-result'
    );
    const result = await breaker.fire();
    expect(result).toBe('fallback-result');
  });

  it('should report circuit breaker stats', () => {
    service.createBreaker('stats-test', async () => 'ok');
    const stats = service.getStats();
    expect(stats.length).toBeGreaterThan(0);
    expect(stats[0].name).toBe('stats-test');
    expect(stats[0].state).toBeDefined();
  });
});
