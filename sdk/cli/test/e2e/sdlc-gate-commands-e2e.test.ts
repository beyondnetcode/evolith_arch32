import { TestingModule } from '@nestjs/testing';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';

describe('SDLC Gate Commands (e2e)', () => {
  let commandInstance: TestingModule;

  beforeAll(async () => {
    commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();
  });

  describe('sdlc gate-status', () => {
    it('should run gate-status command and return output', async () => {
      const result = await CommandTestFactory.run(commandInstance, ['sdlc', 'gate-status']);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('sdlc handoff', () => {
    it('should run handoff command with --from and --to flags', async () => {
      const result = await CommandTestFactory.run(commandInstance, [
        'sdlc',
        'handoff',
        '--from',
        'phase-0',
        '--to',
        'phase-1',
      ]);
      expect(result).toBeDefined();
    });

    it('should run handoff command with --validate flag', async () => {
      const result = await CommandTestFactory.run(commandInstance, [
        'sdlc',
        'handoff',
        '--from',
        'phase-0',
        '--to',
        'phase-1',
        '--validate',
      ]);
      expect(result).toBeDefined();
    });

    it('should run handoff command with --artifacts flag', async () => {
      const result = await CommandTestFactory.run(commandInstance, [
        'sdlc',
        'handoff',
        '--from',
        'phase-0',
        '--to',
        'phase-1',
        '--artifacts',
      ]);
      expect(result).toBeDefined();
    });
  });
});
