import { SdlcCommand } from './sdlc.command';
import * as p from '@clack/prompts';

describe('SdlcCommand', () => {
  let command: SdlcCommand;

  beforeEach(() => {
    command = new SdlcCommand();
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('should display SDLC header via p.intro', async () => {
      await command.run([], {});

      expect(p.intro).toHaveBeenCalledWith(
        expect.stringContaining('Evolith SDLC CLI')
      );
    });

    it('should list available subcommands', async () => {
      await command.run([], {});

      const calls = (p.log.info as jest.Mock).mock.calls.flat().join(' ');
      expect(calls).toContain('Available subcommands');
    });

    it('should display handoff subcommand', async () => {
      await command.run([], {});

      const calls = (p.log.info as jest.Mock).mock.calls.flat().join(' ');
      expect(calls).toContain('handoff');
    });

    it('should display generate subcommand', async () => {
      await command.run([], {});

      const calls = (p.log.info as jest.Mock).mock.calls.flat().join(' ');
      expect(calls).toContain('generate');
    });

    it('should display gate-status subcommand', async () => {
      await command.run([], {});

      const calls = (p.log.info as jest.Mock).mock.calls.flat().join(' ');
      expect(calls).toContain('gate-status');
    });

    it('should display help hint via p.outro', async () => {
      await command.run([], {});

      expect(p.outro).toHaveBeenCalledWith(
        expect.stringContaining('evolith sdlc <subcommand> --help')
      );
    });

    it('should handle passed parameters', async () => {
      await command.run(['some-param'], {});

      expect(p.intro).toHaveBeenCalledWith(
        expect.stringContaining('Evolith SDLC CLI')
      );
    });
  });
});
