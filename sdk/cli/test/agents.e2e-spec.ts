import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../src/app.module';

describe('Agents Command (e2e)', () => {
  let commandInstance: TestingModule;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();
  });

  it('should run agents install with dry-run', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['agents', 'install', '--dry-run']);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should run agents list command', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['agents', 'list']);
    expect(result).toBeDefined();
  });

  it('should show agents help', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['agents', '--help']);
    expect(result).toBeDefined();
    expect(result).toContain('agents');
  });
});
