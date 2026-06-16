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
      await expect(command.executeCommand([], { list: true })).resolves.not.toThrow();
    });

    it('should list tools when --list --category tools is provided', async () => {
      await expect(command.executeCommand([], { list: true, category: 'tools' })).resolves.not.toThrow();
    });

    it('should list resources when --list --category resources is provided', async () => {
      await expect(command.executeCommand([], { list: true, category: 'resources' })).resolves.not.toThrow();
    });

    it('should list schemas when --list --category schemas is provided', async () => {
      await expect(command.executeCommand([], { list: true, category: 'schemas' })).resolves.not.toThrow();
    });

    it('should list commands when --list --category commands is provided', async () => {
      await expect(command.executeCommand([], { list: true, category: 'commands' })).resolves.not.toThrow();
    });

    it('should show error for unknown category', async () => {
      await expect(command.executeCommand([], { list: true, category: 'unknown' })).resolves.not.toThrow();
    });
  });

  describe('--inspect flag', () => {
    it('should inspect gate-evaluate tool schema', async () => {
      await expect(command.executeCommand([], { inspect: 'gate-evaluate' })).resolves.not.toThrow();
    });

    it('should inspect validate-artifacts tool schema', async () => {
      await expect(command.executeCommand([], { inspect: 'validate-artifacts' })).resolves.not.toThrow();
    });

    it('should inspect agent-create tool schema', async () => {
      await expect(command.executeCommand([], { inspect: 'agent-create' })).resolves.not.toThrow();
    });

    it('should inspect resource schema', async () => {
      await expect(command.executeCommand([], { inspect: 'evolith://rulesets' })).resolves.not.toThrow();
    });

    it('should inspect command schema', async () => {
      await expect(command.executeCommand([], { inspect: 'init' })).resolves.not.toThrow();
    });

    it('should show error for unknown operation', async () => {
      await expect(command.executeCommand([], { inspect: 'unknown-operation' })).resolves.not.toThrow();
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
