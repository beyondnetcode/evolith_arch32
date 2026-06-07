import { CompletionCommand } from './completion.command';

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  readFile: jest.fn(),
  appendFile: jest.fn(),
  ensureDir: jest.fn(),
  copy: jest.fn(),
}));

jest.mock('chalk', () => {
  const chalkFn = (str: string) => str;
  chalkFn.green = (str: string) => str;
  chalkFn.red = (str: string) => str;
  chalkFn.bold = (str: string) => str;
  chalkFn.bgCyan = { black: { bold: (str: string) => str } };
  chalkFn.cyan = (str: string) => str;
  chalkFn.yellow = (str: string) => str;
  chalkFn.blue = (str: string) => str;
  chalkFn.dim = (str: string) => str;
  return chalkFn;
});

import * as fs from 'fs-extra';

describe('CompletionCommand', () => {
  let command: CompletionCommand;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    command = new CompletionCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('run', () => {
    it('should show completion help when no install option', async () => {
      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Shell Completion')
      );
    });

    it('should call installCompletion when install option is provided', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
      (fs.readFile as unknown as jest.Mock).mockResolvedValue('');

      await command.run([], { install: 'bash' });

      expect(fs.pathExists).toHaveBeenCalled();
    });

    it('should install for specified shell', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
      (fs.readFile as unknown as jest.Mock).mockResolvedValue('');

      await command.run([], { install: 'zsh' });

      expect(fs.pathExists).toHaveBeenCalled();
    });

    it('should install for fish shell', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);

      await command.run([], { install: 'fish' });

      expect(fs.pathExists).toHaveBeenCalled();
    });

    it('should handle unknown shell', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);

      await command.run([], { install: 'powershell' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown shell')
      );
    });
  });

  describe('detectShell', () => {
    it('should detect zsh from SHELL env', () => {
      const originalShell = process.env.SHELL;
      process.env.SHELL = '/bin/zsh';

      const cmd = new CompletionCommand();
      const result = (cmd as any).detectShell();

      expect(result).toBe('zsh');
      process.env.SHELL = originalShell;
    });

    it('should detect bash from SHELL env', () => {
      const originalShell = process.env.SHELL;
      process.env.SHELL = '/bin/bash';

      const cmd = new CompletionCommand();
      const result = (cmd as any).detectShell();

      expect(result).toBe('bash');
      process.env.SHELL = originalShell;
    });

    it('should detect fish from SHELL env', () => {
      const originalShell = process.env.SHELL;
      process.env.SHELL = '/usr/bin/fish';

      const cmd = new CompletionCommand();
      const result = (cmd as any).detectShell();

      expect(result).toBe('fish');
      process.env.SHELL = originalShell;
    });

    it('should default to bash when SHELL is empty', () => {
      const originalShell = process.env.SHELL;
      process.env.SHELL = '';

      const cmd = new CompletionCommand();
      const result = (cmd as any).detectShell();

      expect(result).toBe('bash');
      process.env.SHELL = originalShell;
    });

    it('should default to bash when SHELL is undefined', () => {
      const originalShell = process.env.SHELL;
      delete process.env.SHELL;

      const cmd = new CompletionCommand();
      const result = (cmd as any).detectShell();

      expect(result).toBe('bash');
      process.env.SHELL = originalShell;
    });
  });

  describe('installBash', () => {
    it('should report script not found', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(false);

      await (command as any).installBash('/some/dir');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Bash completion script not found')
      );
    });

    it('should report already installed', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
      (fs.readFile as unknown as jest.Mock).mockResolvedValue('# Evolith CLI completion\nsource "..."');

      await (command as any).installBash('/some/dir');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Bash completion already installed')
      );
    });

    it('should install completion when not present', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(true);
      (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(false);

      await (command as any).installBash('/some/dir');

      expect(fs.appendFile).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Bash completion installed')
      );
    });

    it('should install when bashrc does not exist', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(true);
      (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(false);

      await (command as any).installBash('/some/dir');

      expect(fs.appendFile).toHaveBeenCalled();
    });
  });

  describe('installZsh', () => {
    it('should report script not found', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(false);

      await (command as any).installZsh('/some/dir');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Zsh completion script not found')
      );
    });

    it('should report already installed', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);
      (fs.readFile as unknown as jest.Mock).mockResolvedValue('# Evolith CLI completion\nsource "..."');

      await (command as any).installZsh('/some/dir');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Zsh completion already installed')
      );
    });

    it('should install completion when not present', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(true);
      (fs.pathExists as unknown as jest.Mock).mockResolvedValueOnce(false);

      await (command as any).installZsh('/some/dir');

      expect(fs.appendFile).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Zsh completion installed')
      );
    });
  });

  describe('installFish', () => {
    it('should report script not found', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(false);

      await (command as any).installFish('/some/dir');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Fish completion script not found')
      );
    });

    it('should install fish completion', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(true);

      await (command as any).installFish('/some/dir');

      expect(fs.ensureDir).toHaveBeenCalled();
      expect(fs.copy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Fish completion installed')
      );
    });
  });

  describe('installCompletion', () => {
    it('should report completion scripts not found', async () => {
      (fs.pathExists as unknown as jest.Mock).mockResolvedValue(false);

      await (command as any).installCompletion('bash');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completion scripts not found')
      );
    });
  });

  describe('showCompletionHelp', () => {
    it('should display usage information', async () => {
      await (command as any).showCompletionHelp('bash');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Usage:')
      );
    });

    it('should display supported shells', async () => {
      await (command as any).showCompletionHelp('zsh');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Supported shells:')
      );
    });

    it('should display examples', async () => {
      await (command as any).showCompletionHelp('fish');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Examples:')
      );
    });

    it('should show detected shell', async () => {
      await (command as any).showCompletionHelp('bash');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Detected shell: bash')
      );
    });
  });

  describe('findCliPath', () => {
    it('should return process.argv[1]', async () => {
      const result = await (command as any).findCliPath();
      expect(result).toBe(process.argv[1]);
    });
  });

  describe('parseInstall', () => {
    it('should return the value', () => {
      expect(command.parseInstall('bash')).toBe('bash');
    });
  });

  describe('parseShell', () => {
    it('should return the value', () => {
      expect(command.parseShell('zsh')).toBe('zsh');
    });
  });
});
