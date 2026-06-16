import { FixturesCommand } from './fixtures.command';

jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  outro: jest.fn(),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    message: jest.fn(),
  },
  spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  cancel: jest.fn(),
}));

jest.mock('chalk', () => {
  const fn = (s: string) => s;
  fn.green = (s: string) => s;
  fn.red = (s: string) => s;
  fn.yellow = (s: string) => s;
  fn.blue = (s: string) => s;
  fn.cyan = (s: string) => s;
  fn.bold = (s: string) => s;
  fn.bgCyan = { white: { bold: (s: string) => s } };
  return fn;
});

import * as p from '@clack/prompts';
import { MockFileSystem } from '../../test/mocks/index';
import { PromptService } from '../../infrastructure/prompts/prompt.service';

const CWD = process.cwd();

describe('FixturesCommand', () => {
  let command: FixturesCommand;
  let fileSystem: MockFileSystem;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    fileSystem = new MockFileSystem();
    command = new FixturesCommand(fileSystem as any, new PromptService());
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('executeCommand', () => {
    it('should seed evolith fixtures with type positional arg', async () => {
      await command.executeCommand(['evolith'], {});
      const files = fileSystem.getFilePaths();
      expect(files).toContain(CWD + '/evolith.yaml');
      expect(files).toHaveLength(1);
    });

    it('should seed ADR fixtures', async () => {
      await command.executeCommand(['adr'], {});
      const files = fileSystem.getFilePaths();
      expect(files.length).toBe(3);
      expect(files.some(f => f.includes('0001-record-architecture-decisions'))).toBe(true);
      expect(files.some(f => f.includes('0002-use-clean-architecture'))).toBe(true);
      expect(files.some(f => f.includes('0003-use-nestjs-for-backend'))).toBe(true);
    });

    it('should seed ruleset fixtures', async () => {
      await command.executeCommand(['ruleset'], {});
      const files = fileSystem.getFilePaths();
      expect(files.length).toBe(2);
      expect(files.some(f => f.includes('architecture.yaml'))).toBe(true);
      expect(files.some(f => f.includes('naming.yaml'))).toBe(true);
    });

    it('should seed demo fixtures (evolith + adr)', async () => {
      await command.executeCommand(['demo'], {});
      const files = fileSystem.getFilePaths();
      expect(files.some(f => f.endsWith('/evolith.yaml'))).toBe(true);
      expect(files.some(f => f.includes('/docs/adr/'))).toBe(true);
      expect(files.length).toBe(4);
    });

    it('should seed full fixtures (evolith + adr + ruleset)', async () => {
      await command.executeCommand(['full'], {});
      const files = fileSystem.getFilePaths();
      expect(files.some(f => f.endsWith('/evolith.yaml'))).toBe(true);
      expect(files.some(f => f.includes('/docs/adr/'))).toBe(true);
      expect(files.some(f => f.includes('/rulesets/'))).toBe(true);
      expect(files.length).toBe(6);
    });

    it('should not write files in dry-run mode', async () => {
      await command.executeCommand(['full'], { dryRun: true });
      const files = fileSystem.getFilePaths();
      expect(files).toHaveLength(0);
    });

    it('should use --type option when positional arg is missing', async () => {
      await command.executeCommand([], { type: 'adr' });
      const files = fileSystem.getFilePaths();
      expect(files.length).toBe(3);
    });

    it('should use --dir option for target directory', async () => {
      await command.executeCommand(['evolith'], { dir: '/custom/path' });
      const files = fileSystem.getFilePaths();
      expect(files.some(f => f === '/custom/path/evolith.yaml')).toBe(true);
    });

    it('should default to demo type when no type specified', async () => {
      await command.executeCommand([], {});
      const files = fileSystem.getFilePaths();
      expect(files.length).toBe(4);
      expect(files.some(f => f.endsWith('/evolith.yaml'))).toBe(true);
    });

    it('should handle invalid fixture type gracefully', async () => {
      await command.executeCommand(['invalid'], {});
      const files = fileSystem.getFilePaths();
      expect(files).toHaveLength(0);
      expect(p.log.error).toHaveBeenCalled();
    });

    it('should show intro message on run', async () => {
      await command.executeCommand(['evolith'], {});
      expect(p.intro).toHaveBeenCalledWith(expect.stringContaining('Evolith Fixtures'));
    });

    it('should write deterministic content', async () => {
      await command.executeCommand(['evolith'], {});
      const content = await fileSystem.readFile(CWD + '/evolith.yaml');
      expect(content).toContain('demo-project');
      expect(content).toContain('1.0.0');
    });
  });

  describe('option parsers', () => {
    it('should parse dir option', () => {
      expect(command.parseDir('/some/path')).toBe('/some/path');
    });

    it('should parse dry-run option', () => {
      expect(command.parseDryRun()).toBe(true);
    });

    it('should parse type option', () => {
      expect(command.parseType('demo')).toBe('demo');
    });
  });
});
