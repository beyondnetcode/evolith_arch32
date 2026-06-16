import { CompletionCommand } from './completion.command';

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  readFile: jest.fn(),
  appendFile: jest.fn(),
  writeFile: jest.fn(),
  copy: jest.fn(),
  ensureDir: jest.fn(),
}));

jest.mock('chalk', () => {
  const fn = (s: string) => s;
  fn.green = (s: string) => s;
  fn.red = (s: string) => s;
  fn.bold = (s: string) => s;
  fn.dim = (s: string) => s;
  return fn;
});

jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  outro: jest.fn(),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    message: jest.fn(),
  },
  spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  cancel: jest.fn(),
}));

import * as fs from 'fs-extra';

const mockFs = fs as jest.Mocked<typeof fs>;

describe('CompletionCommand', () => {
  let command: CompletionCommand;
  let logSpy: jest.SpyInstance;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    command = new CompletionCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('executeCommand', () => {
    it('should show completion help by default', async () => {
      await command.executeCommand([], {});
      expect(logSpy).toHaveBeenCalled();
    });

    it('should generate bash hooks when --hooks is passed', async () => {
      await command.executeCommand([], { hooks: true });
      const output = logSpy.mock.calls.join('');
      expect(output).toContain('evolith_status');
      expect(output).toContain('evolith_phase');
      expect(output).toContain('evolith_gate');
    });

    it('should generate zsh hooks when --hooks and shell=zsh', async () => {
      await command.executeCommand([], { hooks: true, shell: 'zsh' });
      const output = logSpy.mock.calls.join('');
      expect(output).toContain('evolith_status');
      expect(output).toContain('function');
    });

    it('should generate fish hooks when --hooks and shell=fish', async () => {
      await command.executeCommand([], { hooks: true, shell: 'fish' });
      const output = logSpy.mock.calls.join('');
      expect(output).toContain('evolith_status');
      expect(output).toContain('function');
    });

    it('should install bash hooks when --install-hooks bash', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue('');
      mockFs.writeFile.mockResolvedValue();
      mockFs.appendFile.mockResolvedValue();

      await command.executeCommand([], { installHooks: 'bash' });
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should install zsh hooks when --install-hooks zsh', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue('');
      mockFs.writeFile.mockResolvedValue();
      mockFs.appendFile.mockResolvedValue();

      await command.executeCommand([], { installHooks: 'zsh' });
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should install fish hooks when --install-hooks fish', async () => {
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.writeFile.mockResolvedValue();
      mockFs.ensureDir.mockResolvedValue();

      await command.executeCommand([], { installHooks: 'fish' });
      expect(mockFs.ensureDir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('getBashHooks', () => {
    it('should include evolith_status function', () => {
      const hooks = (command as any).getBashHooks();
      expect(hooks).toContain('evolith_status()');
    });

    it('should include evolith_phase function', () => {
      const hooks = (command as any).getBashHooks();
      expect(hooks).toContain('evolith_phase()');
    });

    it('should include evolith_gate function', () => {
      const hooks = (command as any).getBashHooks();
      expect(hooks).toContain('evolith_gate()');
    });

    it('should include evolith_validate function', () => {
      const hooks = (command as any).getBashHooks();
      expect(hooks).toContain('evolith_validate()');
    });

    it('should include evolith_prompt function', () => {
      const hooks = (command as any).getBashHooks();
      expect(hooks).toContain('evolith_prompt()');
    });

    it('should include shell aliases', () => {
      const hooks = (command as any).getBashHooks();
      expect(hooks).toContain('alias es=evolith_status');
      expect(hooks).toContain('alias ep=evolith_phase');
      expect(hooks).toContain('alias eg=evolith_gate');
    });
  });

  describe('getZshHooks', () => {
    it('should include evolith_status function', () => {
      const hooks = (command as any).getZshHooks();
      expect(hooks).toContain('evolith_status()');
    });

    it('should include shell aliases', () => {
      const hooks = (command as any).getZshHooks();
      expect(hooks).toContain('alias es=evolith_status');
    });
  });

  describe('getFishHooks', () => {
    it('should include evolith_status function', () => {
      const hooks = (command as any).getFishHooks();
      expect(hooks).toContain('function evolith_status');
    });

    it('should include fish alias syntax', () => {
      const hooks = (command as any).getFishHooks();
      expect(hooks).toContain('alias es evolith_status');
    });
  });

  describe('option parsers', () => {
    it('should parse --hooks to true', () => {
      expect(command.parseHooks()).toBe(true);
    });

    it('should parse --install-hooks value', () => {
      expect(command.parseInstallHooks('bash')).toBe('bash');
      expect(command.parseInstallHooks('zsh')).toBe('zsh');
      expect(command.parseInstallHooks('fish')).toBe('fish');
    });
  });
});