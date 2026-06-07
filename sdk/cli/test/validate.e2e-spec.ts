import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../src/app.module';

describe('Validate Command (e2e)', () => {
  let commandInstance: TestingModule;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();
  });

  it('should run validate command with format JSON and return valid output', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['validate', '--format', 'json']);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should run validate command with format table', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['validate', '--format', 'table']);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should run validate command with arch flag', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['validate', '--arch']);
    expect(result).toBeDefined();
  });

  it('should fail gracefully on invalid format', async () => {
    await expect(
      CommandTestFactory.run(commandInstance, ['validate', '--format', 'invalid']),
    ).rejects.toThrow();
  });
});
