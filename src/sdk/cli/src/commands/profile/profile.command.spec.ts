import { ProfileCommand } from './profile.command';
import { ConfigService } from '../../infrastructure/config/config.service';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import * as p from '@clack/prompts';

jest.mock('@clack/prompts');

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
      (p.text as unknown as jest.Mock).mockResolvedValueOnce('test-profile');
      (p.text as unknown as jest.Mock).mockResolvedValueOnce('../evolith');
      (p.text as unknown as jest.Mock).mockResolvedValueOnce('');
      (p.text as unknown as jest.Mock).mockResolvedValueOnce('');
      (p.text as unknown as jest.Mock).mockResolvedValueOnce('');
      mockConfigService.profileExists.mockReturnValue(false);
      
      await expect(command.executeCommand(['create'], {})).resolves.not.toThrow();
      expect(mockConfigService.createProfile).toHaveBeenCalled();
    });

    it('should handle cancelled profile creation', async () => {
      const cancelSymbol = Symbol('CANCEL');
      (p.text as unknown as jest.Mock).mockResolvedValueOnce(cancelSymbol);
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(true);
      
      await expect(command.executeCommand(['create'], {})).resolves.not.toThrow();
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

    it('switch sin nombre falla con la sintaxis de uso y exit 1', async () => {
      await command.executeCommand(['switch'], J);
      const e = env();
      expect(e.success).toBe(false);
      expect(e.error.message).toMatch(/Usage: evolith profile switch/);
      expect(process.exitCode).toBe(1);
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
      expect(process.exitCode).toBe(1);
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
      (p.text as unknown as jest.Mock)
        .mockResolvedValueOnce('../evolith')
        .mockResolvedValueOnce('  ')
        .mockResolvedValueOnce('tenant-1')
        .mockResolvedValueOnce('');
      (p.isCancel as unknown as jest.Mock).mockReturnValue(false);

      await command.executeCommand(['create'], { format: 'json', name: 'nuevo' } as never);

      expect(mockConfigService.createProfile).toHaveBeenCalledWith('nuevo', {
        core: '../evolith',
        tenant: 'tenant-1',
      });
      expect(env().data).toMatchObject({ name: 'nuevo', core: '../evolith' });
    });
  });
});
