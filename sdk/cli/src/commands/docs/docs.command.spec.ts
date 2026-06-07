import { DocsCommand } from './docs.command';

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  writeFile: jest.fn(),
  ensureDir: jest.fn(),
}));

jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  outro: jest.fn(),
  log: {
    info: jest.fn(),
    success: jest.fn(),
    message: jest.fn(),
  },
}));

import * as fs from 'fs-extra';
import * as p from '@clack/prompts';

describe('DocsCommand', () => {
  let command: DocsCommand;

  beforeEach(() => {
    command = new DocsCommand();
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('should create documentation files', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      await command.run([], {});

      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should skip existing files when force is false', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);

      await command.run([], { force: false });

      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should overwrite existing files when force is true', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);

      await command.run([], { force: true });

      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should not write files in dry run mode', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      await command.run([], { dryRun: true });

      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should show dry run message', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      await command.run([], { dryRun: true });

      expect(p.log.info).toHaveBeenCalledWith(
        expect.stringContaining('DRY RUN')
      );
    });
  });
});
