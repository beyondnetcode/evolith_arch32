import { CompletionCommand } from './completion.command';
import * as fsExtra from 'fs-extra';

jest.mock('fs-extra');

describe('CompletionCommand', () => {
  let command: CompletionCommand;

  beforeEach(() => {
    command = new CompletionCommand();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create CompletionCommand instance', () => {
      expect(command).toBeInstanceOf(CompletionCommand);
    });
  });

  describe('executeCommand', () => {
    it('should show completion help when no options provided', async () => {
      await expect(command.executeCommand([], {})).resolves.not.toThrow();
    });

    it('should handle shell option', async () => {
      await expect(command.executeCommand([], { shell: 'bash' })).resolves.not.toThrow();
    });

    it('should handle hooks option', async () => {
      await expect(command.executeCommand([], { hooks: true })).resolves.not.toThrow();
    });

    it('should handle install option', async () => {
      (fsExtra.pathExists as jest.Mock).mockResolvedValue(true);
      await expect(command.executeCommand([], { install: 'bash' })).resolves.not.toThrow();
    });

    it('should handle installHooks option', async () => {
      await expect(command.executeCommand([], { installHooks: 'bash' })).resolves.not.toThrow();
    });
  });

  describe('detectShell', () => {
    it('should detect shell from environment', () => {
      const shell = (command as any).detectShell();
      expect(['bash', 'zsh', 'fish']).toContain(shell);
    });
  });
});
