import { ScaffoldStrategy } from './scaffold-strategy';

describe('ScaffoldStrategy', () => {
  let strategy: ScaffoldStrategy;
  beforeEach(() => { strategy = new ScaffoldStrategy(); });
  it('should return success on dry-run', async () => {
    const result = await strategy.execute({ target: 'modular-monolith', dryRun: true, outputDir: '/tmp/test' });
    expect(result.success).toBe(true);
    expect(result.filesCreated).toHaveLength(0);
  });
  it('should return required files for modular-monolith', () => {
    const files = strategy.getRequiredFiles('modular-monolith');
    expect(files).toContain('evolith.yaml');
  });
  it('should include contracts/ for microservices', () => {
    const files = strategy.getRequiredFiles('microservices');
    expect(files).toContain('contracts/');
  });
});
