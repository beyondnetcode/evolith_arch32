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

  it('should handle mcp stop action cleanly', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['mcp', 'stop']);
    expect(result).toBeDefined();
  });

  it('should handle mcp start action', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['mcp', 'start']);
    expect(result).toBeDefined();
  });

  it('should show mcp help', async () => {
    const result = await CommandTestFactory.run(commandInstance, ['mcp', '--help']);
    expect(result).toBeDefined();
    expect(result).toContain('mcp');
  });
});
