import { SdlcCommand } from './sdlc.command';

describe('SdlcCommand', () => {
  let command: SdlcCommand;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    command = new SdlcCommand();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('run', () => {
    it('should display SDLC header', async () => {
      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Evolith SDLC CLI')
      );
    });

    it('should list available subcommands', async () => {
      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Available subcommands')
      );
    });

    it('should display handoff subcommand', async () => {
      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('handoff')
      );
    });

    it('should display generate subcommand', async () => {
      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('generate')
      );
    });

    it('should display gate-status subcommand', async () => {
      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('gate-status')
      );
    });

    it('should display help hint', async () => {
      await command.run([], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('evolith sdlc <subcommand> --help')
      );
    });

    it('should handle passed parameters', async () => {
      await command.run(['some-param'], {});

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Evolith SDLC CLI')
      );
    });
  });
});
