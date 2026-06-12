import { McpServeCommand } from './mcp-serve.command';

jest.mock('../../core/mcp/server', () => ({
  startMcpServer: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../core/validators/ruleset-validator.service', () => ({
  RulesetValidatorService: jest.fn().mockImplementation(() => ({})),
}));

describe('McpServeCommand', () => {
  let command: McpServeCommand;
  const promptService = {
    showIntro: jest.fn(),
    showInfo: jest.fn(),
    showError: jest.fn(),
  };

  beforeEach(() => {
    command = new McpServeCommand();
    (command as any).promptService = promptService;
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('should start MCP server with stdio transport by default', async () => {
      await command.run([], {});

      expect(promptService.showIntro).toHaveBeenCalledWith(
        expect.stringContaining('stdio')
      );
    });

    it('should start MCP server with http transport when specified', async () => {
      await command.run([], { transport: 'http', port: 3000 });

      expect(promptService.showIntro).toHaveBeenCalledWith(
        expect.stringContaining('HTTP')
      );
    });

    it('should show API key enabled message when apiKey provided', async () => {
      await command.run([], { transport: 'http', port: 3000, apiKey: 'test-key' });

      expect(promptService.showInfo).toHaveBeenCalledWith(
        expect.stringContaining('API key authentication enabled')
      );
    });

    it('should handle version action', async () => {
      await command.run(['version'], {});

      expect(promptService.showInfo).toHaveBeenCalledWith('Evolith MCP Server v1.0.0');
    });

    it('should warn about unknown action', async () => {
      await command.run(['unknown'], {});

      expect(promptService.showError).toHaveBeenCalledWith(
        expect.stringContaining('Unknown action')
      );
    });
  });

  describe('option parsers', () => {
    it('should parse transport option', () => {
      const result = command.parseTransport('http');

      expect(result).toBe('http');
    });

    it('should parse port option', () => {
      const result = command.parsePort('8080');

      expect(result).toBe(8080);
    });

    it('should default port to 3000 when invalid', () => {
      const result = command.parsePort('invalid');

      expect(result).toBe(3000);
    });

    it('should parse api-key option', () => {
      const result = command.parseApiKey('secret-key');

      expect(result).toBe('secret-key');
    });
  });
});
