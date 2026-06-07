import { GenerateDomainCommand } from './generate-domain.command';

describe('GenerateDomainCommand', () => {
  let command: GenerateDomainCommand;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    command = new GenerateDomainCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('run', () => {
    it('should show error when target is missing', async () => {
      await command.run([], { from: 'ddd-model.md' });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
    });

    it('should show error when from is missing', async () => {
      await command.run(['domain'], {});

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
    });

    it('should show error when both are missing', async () => {
      await command.run([], {});

      expect(errorSpy).toHaveBeenCalledWith(
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
