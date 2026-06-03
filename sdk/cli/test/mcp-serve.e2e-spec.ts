import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../src/app.module';

describe('MCP Serve Command (e2e)', () => {
  let commandInstance: TestingModule;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();
  });

  it('should handle mcp unknown action cleanly', async () => {
    await CommandTestFactory.run(commandInstance, ['mcp', 'stop']);
    expect(true).toBe(true);
  });
});
