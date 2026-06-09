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

    it('should scaffold domain when target and from are provided', async () => {
      await command.run(['domain'], { from: 'ddd-model.md' });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scaffolding domain')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Parsing Markdown AST')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Extracting Mermaid')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Translating')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scaffolding Hexagonal')
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('completed successfully')
      );
    });
  });

  describe('parseFrom', () => {
    it('should return the value', () => {
      const result = command.parseFrom('path/to/file.md');

      expect(result).toBe('path/to/file.md');
    });
  });
});
