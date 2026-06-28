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
      const installSpy = jest.spyOn(command as any, 'installCompletion').mockResolvedValue(undefined);
      await command.executeCommand([], { install: 'bash' });
      expect(installSpy).toHaveBeenCalledWith('bash');
    });

    it('should handle installHooks option', async () => {
      const hooksSpy = jest.spyOn(command as any, 'installHooks').mockResolvedValue(undefined);
      await command.executeCommand([], { installHooks: 'bash' });
      expect(hooksSpy).toHaveBeenCalledWith('bash');
    });
  });

  describe('detectShell', () => {
    it('should detect shell from environment', () => {
      const shell = (command as any).detectShell();
      expect(['bash', 'zsh', 'fish']).toContain(shell);
    });
  });
});
