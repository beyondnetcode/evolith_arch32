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
      (p.text as jest.Mock).mockResolvedValueOnce('test-profile');
      (p.text as jest.Mock).mockResolvedValueOnce('../evolith');
      (p.text as jest.Mock).mockResolvedValueOnce('');
      (p.text as jest.Mock).mockResolvedValueOnce('');
      (p.text as jest.Mock).mockResolvedValueOnce('');
      mockConfigService.profileExists.mockReturnValue(false);
      
      await expect(command.executeCommand(['create'], {})).resolves.not.toThrow();
      expect(mockConfigService.createProfile).toHaveBeenCalled();
    });

    it('should handle cancelled profile creation', async () => {
      const cancelSymbol = Symbol('CANCEL');
      (p.text as jest.Mock).mockResolvedValueOnce(cancelSymbol);
      (p.isCancel as jest.Mock).mockReturnValueOnce(true);
      
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
});
