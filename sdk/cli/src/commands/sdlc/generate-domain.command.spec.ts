import { GenerateDomainCommand } from './generate-domain.command';
import * as p from '@clack/prompts';

describe('GenerateDomainCommand', () => {
  let command: GenerateDomainCommand;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    command = new GenerateDomainCommand();
    jest.clearAllMocks();
    // Mock output lines that remain as console.log
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('run', () => {
    it('should show error when target is missing', async () => {
      await command.run([], { from: 'ddd-model.md' });

      expect(p.log.error as jest.Mock).toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
    });

    it('should show error when from is missing', async () => {
      await command.run(['domain'], {});

      expect(p.log.error as jest.Mock).toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
    });

    it('should show error when both are missing', async () => {
      await command.run([], {});

      expect(p.log.error as jest.Mock).toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
    });

    it('should display alpha warning and step list when target and from are provided', async () => {
      await command.run(['domain'], { from: 'ddd-model.md' });

      // p.intro called with [alpha] header
      expect(p.intro).toHaveBeenCalledWith(expect.stringContaining('alpha'));

      // p.log.warn called with POC notice
      expect(p.log.warn as jest.Mock).toHaveBeenCalledWith(
        expect.stringContaining('POC stub')
      );

      // Step descriptions visible in p.log.info calls
      const infoCalls = (p.log.info as jest.Mock).mock.calls.flat().join(' ');
      expect(infoCalls).toContain('Parse Markdown AST');
      expect(infoCalls).toContain('Scaffold');
    });
  });

  describe('parseFrom', () => {
    it('should return the value', () => {
      const result = command.parseFrom('path/to/file.md');

      expect(result).toBe('path/to/file.md');
    });
  });
});
