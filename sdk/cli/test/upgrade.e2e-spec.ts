import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../src/app.module';

describe('Upgrade Command (e2e)', () => {
  let commandInstance: TestingModule;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();
  });

  it('should run upgrade command with dry-run', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['upgrade', '--dry-run']);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should run upgrade command with check flag', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['upgrade', '--check']);
    expect(result).toBeDefined();
  });

  it('should show upgrade help', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['upgrade', '--help']);
    expect(result).toBeDefined();
    expect(result).toContain('upgrade');
  });
});
