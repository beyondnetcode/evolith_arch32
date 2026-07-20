import { UpdateCommand } from './update.command';

jest.mock('child_process');

describe('UpdateCommand', () => {
  let command: UpdateCommand;

  beforeEach(() => {
    command = new UpdateCommand();
    jest.clearAllMocks();
    // The registry lookup uses execFileSync('npm', ...), which is mocked above so
    // no real network call is made. Default it to a valid version so executeCommand
    // paths that fetch the latest version do not emit "Failed to fetch" WARN noise;
    // individual tests override this as needed.
    const { execFileSync } = require('child_process');
    (execFileSync as jest.Mock).mockReturnValue('"1.0.0"');
    // Silence the Nest logger so update warnings never leak into test output.
    jest.spyOn((command as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((command as any).logger, 'error').mockImplementation(() => undefined);
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
      const { execFileSync } = require('child_process');
      (execFileSync as jest.Mock).mockImplementation(() => {
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
      const { execFileSync } = require('child_process');
      (execFileSync as jest.Mock).mockReturnValue('"1.2.0"');

      const result = await (command as any).getLatestVersion();

      expect(execFileSync).toHaveBeenCalledWith(
        'npm',
        ['view', '@beyondnet/evolith-cli', 'version', '--json'],
        expect.objectContaining({ timeout: 10000 })
      );
      expect(result).toBe('1.2.0');
    });

    it('should return null when npm command fails', async () => {
      const { execFileSync } = require('child_process');
      (execFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await (command as any).getLatestVersion();
      expect(result).toBeNull();
    });

    it('should reject malicious version strings', async () => {
      const { execFileSync } = require('child_process');
      (execFileSync as jest.Mock).mockReturnValue('"1.0.0; rm -rf /"');

      const result = await (command as any).getLatestVersion();
      expect(result).toBeNull();
    });

    it('should reject non-semver strings', async () => {
      const { execFileSync } = require('child_process');
      (execFileSync as jest.Mock).mockReturnValue('"not-a-version"');

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

  // El modo `--format json` estaba practicamente sin cubrir: cada `if (json)`
  // de showCurrentVersion / checkForUpdates / installUpdate era una rama muerta
  // para la suite. Es el modo que usa un agente o un script, donde ademas el
  // contrato ADR-0073 importa.
  describe('--format json', () => {
    let logSpy: jest.SpyInstance;

    const lastEnvelope = () => {
      const printed = logSpy.mock.calls
        .map((c: unknown[]) => String(c[0]))
        .filter((s: string) => s.trim().startsWith('{'));
      expect(printed.length).toBeGreaterThan(0);
      return JSON.parse(printed[printed.length - 1]);
    };

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => logSpy.mockRestore());

    it('--current emite un envelope con la version instalada', async () => {
      await command.executeCommand([], { current: true, format: 'json' } as never);
      const env = lastEnvelope();
      expect(env.success).toBe(true);
      expect(env.data.current).toEqual(expect.any(String));
    });

    it('--check informa que hay actualizacion cuando el registry va por delante', async () => {
      const { execFileSync } = require('child_process');
      (execFileSync as jest.Mock).mockReturnValue('"99.0.0"');
      await command.executeCommand([], { check: true, format: 'json' } as never);
      const env = lastEnvelope();
      expect(env.success).toBe(true);
      expect(env.data.latest).toBe('99.0.0');
      expect(env.data.updateAvailable).toBe(true);
    });

    it('--check informa que NO hay actualizacion cuando ya se esta al dia', async () => {
      const { execFileSync } = require('child_process');
      (execFileSync as jest.Mock).mockReturnValue('"0.0.1"');
      await command.executeCommand([], { check: true, format: 'json' } as never);
      expect(lastEnvelope().data.updateAvailable).toBe(false);
    });

    it('--check emite un envelope de error si el registry no responde', async () => {
      const { execFileSync } = require('child_process');
      (execFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('registry unreachable');
      });
      await command.executeCommand([], { check: true, format: 'json' } as never);
      const env = lastEnvelope();
      expect(env.success).toBe(false);
      expect(env.error.code).toEqual(expect.any(String));
    });

    it('--install no reinstala cuando ya se esta en la ultima version', async () => {
      const { execFileSync } = require('child_process');
      (execFileSync as jest.Mock).mockReturnValue('"0.0.1"');
      await command.executeCommand([], { install: true, format: 'json' } as never);
      const env = lastEnvelope();
      expect(JSON.stringify(env)).toMatch(/0\.0\.1/);
    });

    it('--install emite un envelope de error si el registry no responde', async () => {
      const { execFileSync } = require('child_process');
      (execFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('registry unreachable');
      });
      await command.executeCommand([], { install: true, format: 'json' } as never);
      expect(lastEnvelope().success).toBe(false);
    });

    it('sin flags emite la ayuda tambien en json', async () => {
      await command.executeCommand([], { format: 'json' } as never);
      const env = lastEnvelope();
      expect(env).toHaveProperty('meta');
    });
  });
});
