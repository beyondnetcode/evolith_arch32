import { UpdateCommand } from './update.command';

jest.mock('child_process');

describe('UpdateCommand', () => {
  let command: UpdateCommand;

  beforeEach(() => {
    command = new UpdateCommand();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create UpdateCommand instance', () => {
      expect(command).toBeInstanceOf(UpdateCommand);
    });
  });

  describe('executeCommand', () => {
    it('should show current version when --current flag is provided', async () => {
      await expect(command.executeCommand([], { current: true })).resolves.not.toThrow();
    });

    it('should check for updates when --check flag is provided', async () => {
      await expect(command.executeCommand([], { check: true })).resolves.not.toThrow();
    });

    it('should install update when --install flag is provided', async () => {
      const { execSync } = require('child_process');
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('npm not available in test');
      });
      await expect(command.executeCommand([], { install: true })).resolves.not.toThrow();
    });

    it('should show help when no flags provided', async () => {
      await expect(command.executeCommand([], {})).resolves.not.toThrow();
    });
  });

  describe('getCurrentVersion', () => {
    it('should return version from package.json', () => {
      const version = (command as any).getCurrentVersion();
      expect(version).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('getLatestVersion', () => {
    it('should return latest version from npm', async () => {
      const { execSync } = require('child_process');
      (execSync as jest.Mock).mockReturnValue('"1.2.0"');
      
      const result = await (command as any).getLatestVersion();
      
      expect(execSync).toHaveBeenCalledWith(
        'npm view @evolith/smart-cli version --json',
        expect.objectContaining({ timeout: 10000 })
      );
      expect(result).toBe('1.2.0');
    });

    it('should return null when npm command fails', async () => {
      const { execSync } = require('child_process');
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Network error');
      });
      
      const result = await (command as any).getLatestVersion();
      expect(result).toBeNull();
    });
  });

  describe('isNewerVersion', () => {
    it('should return true when latest is greater than current', () => {
      expect((command as any).isNewerVersion('1.2.0', '1.1.0')).toBe(true);
      expect((command as any).isNewerVersion('2.0.0', '1.9.9')).toBe(true);
      expect((command as any).isNewerVersion('1.1.1', '1.1.0')).toBe(true);
    });

    it('should return false when latest is equal to current', () => {
      expect((command as any).isNewerVersion('1.1.0', '1.1.0')).toBe(false);
    });

    it('should return false when latest is less than current', () => {
      expect((command as any).isNewerVersion('1.1.0', '1.2.0')).toBe(false);
    });

    it('should handle missing patch versions', () => {
      expect((command as any).isNewerVersion('1.1', '1.0.0')).toBe(true);
      expect((command as any).isNewerVersion('1', '1.0.0')).toBe(false);
    });
  });

  describe('parseOptions', () => {
    it('should parse --current flag', () => {
      const result = command.parseCurrent();
      expect(result).toBe(true);
    });

    it('should parse --check flag', () => {
      const result = command.parseCheck();
      expect(result).toBe(true);
    });

    it('should parse --install flag', () => {
      const result = command.parseInstall();
      expect(result).toBe(true);
    });
  });
});
