import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../src/app.module';

describe('Docs Command (e2e)', () => {
  let commandInstance: TestingModule;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();
  });

  it('should run docs command and return output', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['docs']);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should run docs with validate subcommand', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['docs', 'validate']);
    expect(result).toBeDefined();
  });

  it('should show docs help', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['docs', '--help']);
    expect(result).toBeDefined();
    expect(result).toContain('docs');
  });
});
