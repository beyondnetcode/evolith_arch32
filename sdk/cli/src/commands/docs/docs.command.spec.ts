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

  describe('parseFormat', () => {
    it('should return the provided value', () => {
      expect(command.parseFormat('json')).toBe('json');
    });
  });

  describe('--format json (ADR-0073 envelope)', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      logSpy.mockRestore();
    });

    it('should emit success envelope when creating files', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      await command.run([], { format: 'json' });

      const envelope = JSON.parse(logSpy.mock.calls.find((c: any[]) => {
        try { return JSON.parse(c[0]).success === true; } catch { return false; }
      })![0]);
      expect(envelope.success).toBe(true);
      expect(envelope.data).toEqual(expect.objectContaining({
        created: expect.any(Number),
        updated: 0,
      }));
      expect(envelope.meta.command).toBe('evolith docs scaffold');
      expect(envelope.meta.schemaVersion).toBe('1.0.0');
    });

    it('should emit success envelope when all files exist (no force)', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);

      await command.run([], { format: 'json' });

      const envelope = JSON.parse(logSpy.mock.calls.find((c: any[]) => {
        try { return JSON.parse(c[0]).success === true; } catch { return false; }
      })![0]);
      expect(envelope.success).toBe(true);
      expect(envelope.data).toEqual(expect.objectContaining({
        created: 0,
        updated: 0,
      }));
    });

    it('should emit success envelope when overwriting with force', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);

      await command.run([], { format: 'json', force: true });

      const envelope = JSON.parse(logSpy.mock.calls.find((c: any[]) => {
        try { return JSON.parse(c[0]).success === true; } catch { return false; }
      })![0]);
      expect(envelope.success).toBe(true);
      expect(envelope.data).toEqual(expect.objectContaining({
        updated: expect.any(Number),
      }));
    });

    it('should emit success envelope for minimal template', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(false);

      await command.run([], { format: 'json', template: 'minimal' });

      const envelope = JSON.parse(logSpy.mock.calls.find((c: any[]) => {
        try { return JSON.parse(c[0]).success === true; } catch { return false; }
      })![0]);
      expect(envelope.success).toBe(true);
    });
  });
});
