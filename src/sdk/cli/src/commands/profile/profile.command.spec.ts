import { ProfileCommand } from './profile.command';
import { ConfigService } from '../../infrastructure/config/config.service';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { UserCancelledError } from '@beyondnet/evolith-core-domain/domain/errors';
import { CLI_EXIT_CODES, NonInteractiveError } from '../../infrastructure/cli/exit-codes';

describe('ProfileCommand', () => {
  let command: ProfileCommand;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockPromptService: jest.Mocked<PromptService>;

  beforeEach(() => {
    mockConfigService = {
      activeProfile: jest.fn(),
      getProfile: jest.fn(),
      listProfiles: jest.fn(),
      profileExists: jest.fn(),
      createProfile: jest.fn(),
      switchProfile: jest.fn(),
      deleteProfile: jest.fn(),
    } as any;

    mockPromptService = {
      showIntro: jest.fn(),
      showOutro: jest.fn(),
      showError: jest.fn(),
      showSuccess: jest.fn(),
      // GT-611: `profile` no longer drives @clack/prompts directly — every
      // prompt goes through PromptService, which is where the non-interactive
      // contract is enforced. The double models an interactive terminal by
      // default; the tests that care flip `isInteractive`.
      isInteractive: jest.fn().mockReturnValue(true),
      text: jest.fn(),
    } as any;

    command = new ProfileCommand(mockConfigService, mockPromptService);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create ProfileCommand instance', () => {
      expect(command).toBeInstanceOf(ProfileCommand);
    });
  });

  describe('executeCommand', () => {
    it('should show current profile when no action provided', async () => {
      mockConfigService.activeProfile.mockReturnValue('default');
      mockConfigService.getProfile.mockReturnValue({});
      
      await expect(command.executeCommand([], {})).resolves.not.toThrow();
    });

    it('should show current profile when "current" action provided', async () => {
      mockConfigService.activeProfile.mockReturnValue('default');
      mockConfigService.getProfile.mockReturnValue({});
      
      await expect(command.executeCommand(['current'], {})).resolves.not.toThrow();
    });

    it('should list profiles when "list" action provided', async () => {
      mockConfigService.listProfiles.mockReturnValue(['default', 'dev']);
      mockConfigService.activeProfile.mockReturnValue('default');
      
      await expect(command.executeCommand(['list'], {})).resolves.not.toThrow();
      expect(mockConfigService.listProfiles).toHaveBeenCalled();
    });

    it('should create profile when "create" action provided', async () => {
      mockPromptService.text
        .mockResolvedValueOnce('test-profile')
        .mockResolvedValueOnce('../evolith')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('');
      mockConfigService.profileExists.mockReturnValue(false);

      await expect(command.executeCommand(['create'], {})).resolves.not.toThrow();
      expect(mockConfigService.createProfile).toHaveBeenCalled();
    });

    it('should handle cancelled profile creation', async () => {
      mockPromptService.text.mockRejectedValueOnce(new UserCancelledError());

      await expect(command.executeCommand(['create'], {})).resolves.not.toThrow();
      expect(mockConfigService.createProfile).not.toHaveBeenCalled();
    });

    it('should reject existing profile name', async () => {
      mockConfigService.profileExists.mockReturnValue(true);
      
      await expect(command.executeCommand(['create'], { name: 'existing' })).resolves.not.toThrow();
      expect(mockPromptService.showError).toHaveBeenCalled();
    });

    it('should switch profile when "switch" action provided', async () => {
      await expect(command.executeCommand(['switch'], { name: 'dev' })).resolves.not.toThrow();
      expect(mockConfigService.switchProfile).toHaveBeenCalledWith('dev');
    });

    it('should show error when switching without name', async () => {
      await expect(command.executeCommand(['switch'], {})).resolves.not.toThrow();
      expect(mockPromptService.showError).toHaveBeenCalled();
    });

    it('should delete profile when "delete" action provided', async () => {
      await expect(command.executeCommand(['delete'], { name: 'old' })).resolves.not.toThrow();
      expect(mockConfigService.deleteProfile).toHaveBeenCalledWith('old');
    });

    it('should show error when deleting without name', async () => {
      await expect(command.executeCommand(['delete'], {})).resolves.not.toThrow();
      expect(mockPromptService.showError).toHaveBeenCalled();
    });
  });

  describe('parseName', () => {
    it('should return profile name', () => {
      const result = command.parseName('test-profile');
      expect(result).toBe('test-profile');
    });
  });

  // `--format json` era casi enteramente rama muerta: los 5 subcomandos tienen
  // su par json/humano y solo se ejercitaba el humano. Es el modo que usa un
  // agente, y donde el contrato ADR-0073 (envelope de exito frente a error) es
  // lo unico que el llamador puede leer.
  describe('--format json', () => {
    let logSpy: jest.SpyInstance;
    const J = { format: 'json' } as never;

    const env = () => {
      const printed = logSpy.mock.calls
        .map((c: unknown[]) => String(c[0]))
        .filter((s: string) => s.trim().startsWith('{'));
      expect(printed.length).toBeGreaterThan(0);
      return JSON.parse(printed[printed.length - 1]);
    };

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      process.exitCode = undefined;
    });

    afterEach(() => {
      logSpy.mockRestore();
      process.exitCode = undefined;
    });

    it('current emite el perfil activo con su configuracion', async () => {
      mockConfigService.activeProfile.mockReturnValue('default');
      mockConfigService.getProfile.mockReturnValue({ core: '../evolith', tenant: 't1' });
      await command.executeCommand(['current'], J);
      const e = env();
      expect(e.success).toBe(true);
      expect(e.data).toMatchObject({ name: 'default', core: '../evolith', tenant: 't1' });
    });

    it('sin accion cae a current, no a un error', async () => {
      mockConfigService.activeProfile.mockReturnValue('default');
      mockConfigService.getProfile.mockReturnValue({});
      await command.executeCommand([], J);
      expect(env().success).toBe(true);
    });

    it('list emite los perfiles y cual esta activo', async () => {
      mockConfigService.listProfiles.mockReturnValue(['default', 'ci']);
      mockConfigService.activeProfile.mockReturnValue('ci');
      await command.executeCommand(['list'], J);
      expect(env().data).toEqual({ profiles: ['default', 'ci'], active: 'ci' });
    });

    it('switch sin nombre falla con la sintaxis de uso y exit 3 (invalid input)', async () => {
      await command.executeCommand(['switch'], J);
      const e = env();
      expect(e.success).toBe(false);
      expect(e.error.message).toMatch(/Usage: evolith profile switch/);
      // GT-580: a missing argument is INVALID INPUT (3), not a tool failure (1).
      // Collapsing both onto 1 is what made `evolith profile switch` in CI
      // indistinguishable from a broken config store.
      expect(process.exitCode).toBe(CLI_EXIT_CODES.INVALID_INPUT);
    });

    it('switch a un perfil existente confirma el cambio', async () => {
      await command.executeCommand(['switch'], { format: 'json', name: 'ci' } as never);
      expect(env().data).toEqual({ switched: 'ci' });
    });

    it('switch propaga el motivo cuando el perfil no existe', async () => {
      mockConfigService.switchProfile.mockImplementation(() => {
        throw new Error('Profile "ghost" not found');
      });
      await command.executeCommand(['switch'], { format: 'json', name: 'ghost' } as never);
      const e = env();
      expect(e.success).toBe(false);
      expect(e.error.message).toMatch(/not found/);
      // A store that refuses the switch is a TOOL failure, distinct from the
      // usage error above — that distinction is the point of GT-580.
      expect(process.exitCode).toBe(CLI_EXIT_CODES.TOOL_FAILURE);
    });

    it('delete sin nombre falla con la sintaxis de uso', async () => {
      await command.executeCommand(['delete'], J);
      expect(env().error.message).toMatch(/Usage: evolith profile delete/);
    });

    it('delete confirma el perfil eliminado', async () => {
      await command.executeCommand(['delete'], { format: 'json', name: 'ci' } as never);
      expect(env().data).toEqual({ deleted: 'ci' });
    });

    it('delete propaga el motivo cuando el perfil no existe', async () => {
      mockConfigService.deleteProfile.mockImplementation(() => {
        throw new Error('Cannot delete the active profile');
      });
      await command.executeCommand(['delete'], { format: 'json', name: 'default' } as never);
      expect(env().error.message).toMatch(/Cannot delete/);
    });

    it('create rechaza un nombre que ya existe, sin volver a crearlo', async () => {
      mockConfigService.profileExists.mockReturnValue(true);
      await command.executeCommand(['create'], { format: 'json', name: 'ci' } as never);
      const e = env();
      expect(e.success).toBe(false);
      expect(e.error.message).toMatch(/already exists/);
      expect(mockConfigService.createProfile).not.toHaveBeenCalled();
    });

    it('create con nombre nuevo persiste solo los campos rellenados', async () => {
      mockConfigService.profileExists.mockReturnValue(false);
      mockPromptService.text
        .mockResolvedValueOnce('../evolith')
        .mockResolvedValueOnce('  ')
        .mockResolvedValueOnce('tenant-1')
        .mockResolvedValueOnce('');

      await command.executeCommand(['create'], { format: 'json', name: 'nuevo' } as never);

      expect(mockConfigService.createProfile).toHaveBeenCalledWith('nuevo', {
        core: '../evolith',
        tenant: 'tenant-1',
      });
      expect(env().data).toMatchObject({ name: 'nuevo', core: '../evolith' });
    });

    it('GT-611: sin TTY no pregunta NADA y emite solo el envelope', async () => {
      // The defect: `profile create --name ci --format json` in CI painted four
      // ANSI prompts into a pipe that was reading an ADR-0073 envelope, and the
      // four fields are all OPTIONAL — there was never anything to ask.
      mockConfigService.profileExists.mockReturnValue(false);
      mockPromptService.isInteractive.mockReturnValue(false);

      await command.executeCommand(['create'], { format: 'json', name: 'ci' } as never);

      expect(mockPromptService.text).not.toHaveBeenCalled();
      expect(mockConfigService.createProfile).toHaveBeenCalledWith('ci', {});
      expect(env()).toMatchObject({ success: true, data: { name: 'ci' } });
    });

    it('GT-611: sin TTY y sin --name devuelve invalid input en vez de un prompt', async () => {
      mockConfigService.profileExists.mockReturnValue(false);
      mockPromptService.isInteractive.mockReturnValue(false);
      mockPromptService.text.mockRejectedValue(
        new NonInteractiveError('a text answer ("Profile name:")'),
      );

      await command.executeCommand(['create'], J);

      expect(mockConfigService.createProfile).not.toHaveBeenCalled();
      expect(env()).toMatchObject({ success: false, error: { code: 'VALIDATION_FAILED' } });
      expect(process.exitCode).toBe(CLI_EXIT_CODES.INVALID_INPUT);
    });
  });
});
