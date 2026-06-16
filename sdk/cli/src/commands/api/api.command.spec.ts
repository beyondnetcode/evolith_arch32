import { ApiCommand } from './api.command';

describe('ApiCommand', () => {
  let command: ApiCommand;

  beforeEach(() => {
    command = new ApiCommand();
  });

  describe('constructor', () => {
    it('should create ApiCommand instance', () => {
      expect(command).toBeInstanceOf(ApiCommand);
    });
  });

  describe('--list flag', () => {
    it('should list all categories when --list is provided', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.executeCommand([], { list: true });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should list tools when --list --category tools is provided', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.executeCommand([], { list: true, category: 'tools' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should list resources when --list --category resources is provided', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.executeCommand([], { list: true, category: 'resources' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should list schemas when --list --category schemas is provided', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.executeCommand([], { list: true, category: 'schemas' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should list commands when --list --category commands is provided', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.executeCommand([], { list: true, category: 'commands' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should show error for unknown category', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.executeCommand([], { list: true, category: 'unknown' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('--inspect flag', () => {
    it('should inspect gate-evaluate tool schema', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.executeCommand([], { inspect: 'gate-evaluate' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should inspect validate-artifacts tool schema', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.executeCommand([], { inspect: 'validate-artifacts' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should inspect agent-create tool schema', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.executeCommand([], { inspect: 'agent-create' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should inspect resource schema', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.executeCommand([], { inspect: 'evolith://rulesets' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should inspect command schema', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.executeCommand([], { inspect: 'init' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should show error for unknown operation', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.executeCommand([], { inspect: 'unknown-operation' });
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('parseOptions', () => {
    it('should parse --list flag', () => {
      const result = command.parseList();
      expect(result).toBe(true);
    });

    it('should parse --inspect <value> flag', () => {
      const result = command.parseInspect('gate-evaluate');
      expect(result).toBe('gate-evaluate');
    });

    it('should parse --category <value> flag', () => {
      const result = command.parseCategory('tools');
      expect(result).toBe('tools');
    });
  });
});