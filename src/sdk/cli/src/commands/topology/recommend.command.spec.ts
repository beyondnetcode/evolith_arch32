import { RecommendCommand } from './recommend.command';

jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  outro: jest.fn(),
  spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    message: jest.fn(),
  },
}));

jest.mock('chalk', () => {
  const identity = (str: string) => str;
  return new Proxy(identity, {
    get: (_target, prop) => (prop === '__esModule' ? false : identity),
  });
});

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { PromptService } from '../../infrastructure/prompts/prompt.service';

// The resolver validates that `${--core}/src/rulesets` exists on disk before
// reading (fail-fast on a bad --core). Provide a real temp Core dir so the
// override branch resolves; the injected fileSystem.readFile is still mocked.
let CORE_DIR: string;
let RULES_PATH: string;

const RULES = {
  id: 'topology-recommendation',
  version: '1.0.0',
  progressive: [{ id: 'MM', when: {}, recommend: 'modular-monolith', rationale: 'default', priority: 1 }],
  dimensions: [{ id: 'ED', when: { asyncIntegration: true }, recommend: 'event-driven', rationale: 'async' }],
};

describe('RecommendCommand (topology recommend, GT-431)', () => {
  let command: RecommendCommand;
  let fileSystem: { readFile: jest.Mock };
  let logSpy: jest.SpyInstance;

  beforeAll(() => {
    CORE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'evolith-core-'));
    const archDir = path.join(CORE_DIR, 'src', 'rulesets', 'architecture');
    fs.mkdirSync(archDir, { recursive: true });
    RULES_PATH = path.join(archDir, 'topology-recommendation.rules.json');
    fs.writeFileSync(RULES_PATH, JSON.stringify(RULES));
  });

  afterAll(() => {
    fs.rmSync(CORE_DIR, { recursive: true, force: true });
  });

  beforeEach(() => {
    fileSystem = { readFile: jest.fn().mockResolvedValue(JSON.stringify(RULES)) };
    // Real PromptService so error rendering routes through the mocked @clack/prompts.
    command = new RecommendCommand(fileSystem as any);
    // Swap in a real PromptService bound to the mocked clack log.
    (command as any).promptService = new PromptService();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('loads the rules from corePath and recommends a composition from signals', async () => {
    await command.run([], { core: CORE_DIR, signals: { asyncIntegration: true } } as any);

    expect(fileSystem.readFile).toHaveBeenCalledWith(RULES_PATH);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('modular-monolith + event-driven'));
  });

  it('defaults to modular-monolith when no signals are provided', async () => {
    await command.run([], { core: CORE_DIR } as any);

    const printed = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toContain('modular-monolith');
    expect(printed).not.toContain('event-driven');
  });

  it('lets individual flags refine the --signals JSON payload', async () => {
    await command.run([], { core: CORE_DIR, signals: {}, asyncIntegration: true } as any);

    const printed = logSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(printed).toContain('event-driven');
  });

  describe('--format json (ADR-0073 envelope)', () => {
    it('emits a success envelope with the recommendation', async () => {
      await command.run([], { core: CORE_DIR, format: 'json', signals: { asyncIntegration: true } } as any);

      const envelope = JSON.parse(logSpy.mock.calls.find((c: any[]) => {
        try { return JSON.parse(c[0]).success === true; } catch { return false; }
      })![0]);
      expect(envelope.success).toBe(true);
      expect(envelope.data.recommended).toEqual(['modular-monolith', 'event-driven']);
      expect(envelope.data.composition).toBe('modular-monolith + event-driven');
      expect(envelope.meta.command).toBe('evolith topology recommend');
      expect(envelope.meta.schemaVersion).toBe('1.0.0');
    });

    it('emits an error envelope when the rules file cannot be read', async () => {
      fileSystem.readFile.mockRejectedValue(new Error('rules missing'));

      await command.run([], { core: CORE_DIR, format: 'json' } as any);

      const envelope = JSON.parse(logSpy.mock.calls.find((c: any[]) => {
        try { return JSON.parse(c[0]).success === false; } catch { return false; }
      })![0]);
      expect(envelope.success).toBe(false);
      expect(envelope.error.code).toBe('INTERNAL_ERROR');
      expect(envelope.error.message).toBe('rules missing');
    });
  });

  it('propagates the error in human mode when the rules file cannot be read', async () => {
    fileSystem.readFile.mockRejectedValue(new Error('rules missing'));

    await expect(command.run([], { core: CORE_DIR } as any)).rejects.toThrow('rules missing');
  });

  describe('option parsers', () => {
    it('parses --core', () => {
      expect(command.parseCore('/x')).toBe('/x');
    });

    it('parses --signals JSON', () => {
      expect(command.parseSignals('{"asyncIntegration":true}')).toEqual({ asyncIntegration: true });
    });

    it('rejects a non-object --signals payload', () => {
      expect(() => command.parseSignals('[1,2]')).toThrow('Invalid --signals payload');
    });

    it('rejects malformed --signals JSON', () => {
      expect(() => command.parseSignals('{not json')).toThrow('Invalid --signals payload');
    });

    it('parses --team-count', () => {
      expect(command.parseTeamCount('3')).toBe(3);
    });

    it('rejects a non-numeric --team-count', () => {
      expect(() => command.parseTeamCount('abc')).toThrow('Invalid --team-count');
    });

    it('parses boolean signal flags', () => {
      expect(command.parseAsyncIntegration()).toBe(true);
      expect(command.parseDeploymentIndependence()).toBe(true);
      expect(command.parseHighScale()).toBe(true);
    });

    it('parses --format', () => {
      expect(command.parseFormat('json')).toBe('json');
    });
  });
});
