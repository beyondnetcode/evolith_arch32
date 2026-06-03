import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../src/app.module';

describe('Init Command (e2e)', () => {
  let commandInstance: TestingModule;

  beforeAll(async () => {
    // Inicializar el CLI virtual usando nest-commander-testing
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();
  });

  it('should run init with --dry-run without throwing errors', async () => {
    // Run the command with the dry run flag
    await CommandTestFactory.run(commandInstance, ['init', '--dry-run']);
    
    // We expect the execution to complete cleanly
    expect(true).toBe(true);
  });
});
