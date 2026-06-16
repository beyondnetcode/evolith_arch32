import { AliasCommand } from './alias.command';
import { AliasService } from '../../config/alias.service';

describe('AliasCommand', () => {
  let command: AliasCommand;
  let mockAliasService: jest.Mocked<AliasService>;

  beforeEach(() => {
    mockAliasService = {
      add: jest.fn(),
      remove: jest.fn(),
      getAll: jest.fn(),
    } as any;

    command = new AliasCommand(mockAliasService);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create AliasCommand instance', () => {
      expect(command).toBeInstanceOf(AliasCommand);
    });
  });

  describe('executeCommand', () => {
    describe('--add flag', () => {
      it('should add alias when valid format provided', async () => {
        await command.executeCommand([], { add: 'myalias=mycommand' });
        
        expect(mockAliasService.add).toHaveBeenCalledWith('myalias', 'mycommand');
      });

      it('should show error when invalid format provided', async () => {
        await command.executeCommand([], { add: 'invalidformat' });
        
        expect(mockAliasService.add).not.toHaveBeenCalled();
      });

      it('should show error when alias is empty', async () => {
        await command.executeCommand([], { add: '=command' });
        
        expect(mockAliasService.add).not.toHaveBeenCalled();
      });

      it('should show error when command is empty', async () => {
        await command.executeCommand([], { add: 'alias=' });
        
        expect(mockAliasService.add).not.toHaveBeenCalled();
      });

      it('should handle service error', async () => {
        (mockAliasService.add as jest.Mock).mockImplementation(() => {
          throw new Error('Alias already exists');
        });
        
        await command.executeCommand([], { add: 'myalias=mycommand' });
        
        expect(mockAliasService.add).toHaveBeenCalled();
      });
    });

    describe('--remove flag', () => {
      it('should remove alias when exists', async () => {
        await command.executeCommand([], { remove: 'myalias' });
        
        expect(mockAliasService.remove).toHaveBeenCalledWith('myalias');
      });

      it('should show error when removal fails', async () => {
        (mockAliasService.remove as jest.Mock).mockImplementation(() => {
          throw new Error('Alias not found');
        });
        
        await command.executeCommand([], { remove: 'nonexistent' });
        
        expect(mockAliasService.remove).toHaveBeenCalledWith('nonexistent');
      });
    });

    describe('--list flag', () => {
      it('should list all aliases when aliases exist', async () => {
        mockAliasService.getAll.mockReturnValue({
          'myalias': 'mycommand',
          'short': 'longcommand',
        });
        
        await command.executeCommand([], { list: true });
        
        expect(mockAliasService.getAll).toHaveBeenCalled();
      });

      it('should show message when no aliases defined', async () => {
        mockAliasService.getAll.mockReturnValue({});
        
        await command.executeCommand([], { list: true });
        
        expect(mockAliasService.getAll).toHaveBeenCalled();
      });
    });

    describe('no flags', () => {
      it('should show help when no flags provided', async () => {
        await command.executeCommand([], {});
      });
    });
  });

  describe('parseOptions', () => {
    it('should parse --add flag', () => {
      const result = command.parseAdd('alias=command');
      expect(result).toBe('alias=command');
    });

    it('should parse --remove flag', () => {
      const result = command.parseRemove('myalias');
      expect(result).toBe('myalias');
    });

    it('should parse --list flag', () => {
      const result = command.parseList();
      expect(result).toBe(true);
    });
  });
});
