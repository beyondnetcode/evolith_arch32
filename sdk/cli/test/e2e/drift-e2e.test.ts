import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';

describe('Drift Command (e2e)', () => {
  let commandInstance: TestingModule;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();
  });

  describe('drift', () => {
    it('should run drift command and return output', async () => {
      const result = await CommandTestFactory.run(commandInstance, ['drift']);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should run drift command with --json flag and return JSON', async () => {
      const result = await CommandTestFactory.run(commandInstance, ['drift', '--json']);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should run drift command with --level flag', async () => {
      const result = await CommandTestFactory.run(commandInstance, ['drift', '--level', 'F1']);
      expect(result).toBeDefined();
    });

    it('should run drift command with --path flag', async () => {
      const result = await CommandTestFactory.run(commandInstance, ['drift', '--path', process.cwd()]);
      expect(result).toBeDefined();
    });

    it('should run drift command with --history flag', async () => {
      const result = await CommandTestFactory.run(commandInstance, ['drift', '--history']);
      expect(result).toBeDefined();
    });

    it('should run drift command with --trend flag', async () => {
      const result = await CommandTestFactory.run(commandInstance, ['drift', '--trend']);
      expect(result).toBeDefined();
    });
  });
});
