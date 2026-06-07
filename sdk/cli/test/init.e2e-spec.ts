import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../src/app.module';

describe('Init Command (e2e)', () => {
  let commandInstance: TestingModule;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();
  });

  it('should run init with --dry-run without throwing errors', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['init', '--dry-run']);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should run init with --name flag', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['init', '--name', 'test-project']);
    expect(result).toBeDefined();
  });

  it('should show help when --help flag is used', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['init', '--help']);
    expect(result).toBeDefined();
    expect(result).toContain('init');
  });
});
