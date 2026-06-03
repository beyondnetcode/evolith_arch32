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

  it('should run validate command with format JSON', async () => {
    await CommandTestFactory.run(commandInstance, ['validate', '--format', 'json']);
    expect(true).toBe(true);
  });
});
