/**
 * GT-563 — the `evolith patterns` command group, with the ADR-0073 machine
 * surface as the thing actually under test.
 *
 * Two invariants are asserted throughout, because they are the ones a script or
 * an MCP tool depends on and their failure mode is silent:
 *   - stdout in `--format json` is a SINGLE parseable envelope, nothing else;
 *   - a failure is an ERROR envelope with a non-zero exit code — never
 *     `createSuccessEnvelope({ success: false })`, the regression fixed in 3ca7acf5.
 */

jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  outro: jest.fn(),
  select: jest.fn(),
  text: jest.fn(),
  confirm: jest.fn(),
  spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  log: { info: jest.fn(), warn: jest.fn(), success: jest.fn(), error: jest.fn(), message: jest.fn() },
}));

jest.mock('chalk', () => {
  const identity = (str: string) => str;
  return new Proxy(identity, {
    get: (_t, prop) => (prop === '__esModule' ? false : identity),
  });
});

jest.mock('@beyondnet/evolith-core-domain/application/services', () => ({
  PatternCatalogService: jest.fn(),
}));

import { PatternsListCommand } from './list.command';
import { PatternsGetCommand } from './get.command';
import { PatternsForTopologyCommand } from './for-topology.command';
import { PatternCatalogService } from '@beyondnet/evolith-core-domain/application/services';
import type { IFileSystem, ILogger } from '@beyondnet/evolith-core-domain/domain/interfaces';

const mockList = jest.fn();
const mockGet = jest.fn();
const mockListByTopology = jest.fn();

(PatternCatalogService as unknown as jest.Mock).mockImplementation(() => ({
  list: mockList,
  get: mockGet,
  listByTopology: mockListByTopology,
}));

const JSON_FORMAT = { format: 'json' } as const;

const PAT_0001 = {
  id: 'PAT-0001',
  name: 'Database per Service',
  kind: 'pattern',
  category: 'data-ownership',
  status: 'accepted',
  problem: 'Shared databases couple services.',
  solution: 'Give every service its own store.',
  appliesTo: [{ topology: 'microservices', applicability: 'required', guidance: 'One store per service.' }],
  enforcedBy: [{ ruleId: 'MS-DATA-001', engine: 'topology-ruleset' }],
};

const PAT_0099 = {
  id: 'PAT-0099',
  name: 'Shared Mutable Database',
  kind: 'anti-pattern',
  category: 'data-ownership',
  status: 'accepted',
  problem: 'Everyone writes the same tables.',
  solution: 'Do not.',
  appliesTo: [{ topology: 'microservices', applicability: 'recommended', guidance: 'Avoid.' }],
  enforcedBy: [],
};

describe('evolith patterns — ADR-0073 JSON surface', () => {
  let logSpy: jest.SpyInstance;
  let originalExitCode: typeof process.exitCode;
  const fs = {} as IFileSystem;
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as ILogger;

  /** stdout must be exactly ONE envelope; this fails loudly if it is not. */
  function soleEnvelope(): {
    success?: boolean;
    data?: Record<string, unknown>;
    error?: { code: string; message: string };
  } {
    expect(logSpy).toHaveBeenCalledTimes(1);
    return JSON.parse(String(logSpy.mock.calls[0][0]));
  }

  function listCommand(): PatternsListCommand {
    const command = new PatternsListCommand(fs, logger);
    jest.spyOn(command['promptService'], 'showError').mockReturnValue(undefined);
    jest.spyOn(command['promptService'], 'showWarning').mockReturnValue(undefined);
    return command;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    jest.restoreAllMocks();
  });

  describe('patterns list', () => {
    it('returns a count and the pattern records in a success envelope', async () => {
      mockList.mockResolvedValue([PAT_0001, PAT_0099]);

      await listCommand().executeCommand([], { ...JSON_FORMAT });

      const envelope = soleEnvelope();
      expect(envelope.success).toBe(true);
      expect(envelope.data).toMatchObject({ count: 2 });
      expect((envelope.data as { patterns: unknown[] }).patterns).toHaveLength(2);
      expect(process.exitCode).toBeUndefined();
    });

    it('passes --kind / --category / --topology / --enforced through to the catalogue as filters', async () => {
      mockList.mockResolvedValue([PAT_0001]);

      await listCommand().executeCommand([], {
        kind: 'pattern',
        category: 'data-ownership',
        topology: 'microservices',
        enforced: 'true',
        ...JSON_FORMAT,
      });

      expect(mockList).toHaveBeenCalledWith(expect.any(String), {
        kind: 'pattern',
        category: 'data-ownership',
        topology: 'microservices',
        enforced: true,
      });
      expect(soleEnvelope().data).toMatchObject({ count: 1 });
    });

    it('treats `--enforced false` as a real filter for UNENFORCED patterns, not as "no filter"', async () => {
      // The tri-state flag is the whole point; collapsing false→undefined would
      // silently return the entire catalogue.
      mockList.mockResolvedValue([PAT_0099]);

      await listCommand().executeCommand([], { enforced: 'false', ...JSON_FORMAT });

      expect(mockList).toHaveBeenCalledWith(expect.any(String), { enforced: false });
    });

    it('reports an unknown --kind as a VALIDATION_FAILED envelope with exit code 1', async () => {
      await listCommand().executeCommand([], { kind: 'antipattern', ...JSON_FORMAT });

      const envelope = soleEnvelope();
      expect(envelope.success).toBe(false);
      expect(envelope.error?.code).toBe('VALIDATION_FAILED');
      expect(envelope.error?.message).toContain('antipattern');
      expect(process.exitCode).toBe(1);
      expect(mockList).not.toHaveBeenCalled();
    });

    it('converts the catalogue anti-vacuity throw into a readable IO_ERROR envelope', async () => {
      // The service refuses to report a missing corpus as an empty catalogue. That
      // throw must reach the caller as an envelope, never as an escaped stack.
      mockList.mockRejectedValue(new Error('No canonical pattern directory found under /nowhere.'));

      await listCommand().executeCommand([], { ...JSON_FORMAT });

      const envelope = soleEnvelope();
      expect(envelope.success).toBe(false);
      expect(envelope.error?.code).toBe('IO_ERROR');
      expect(envelope.error?.message).toContain('No canonical pattern directory');
      expect(process.exitCode).toBe(1);
    });

    it('returns an empty-after-filter result as a success envelope, not an error', async () => {
      mockList.mockResolvedValue([]);

      await listCommand().executeCommand([], { category: 'security', ...JSON_FORMAT });

      expect(soleEnvelope().data).toMatchObject({ count: 0, patterns: [] });
      expect(process.exitCode).toBeUndefined();
    });

    it('writes nothing decorative to stdout in JSON mode', async () => {
      mockList.mockResolvedValue([PAT_0001, PAT_0099]);

      await listCommand().executeCommand([], { ...JSON_FORMAT });

      // Exactly one console.log — anything else breaks JSON.parse(stdout).
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(() => JSON.parse(String(logSpy.mock.calls[0][0]))).not.toThrow();
    });

    it('prints the human listing and no envelope when JSON was not requested', async () => {
      mockList.mockResolvedValue([PAT_0001]);
      const command = listCommand();

      await command.executeCommand([], {});

      expect(logSpy).toHaveBeenCalled();
      expect(() => JSON.parse(String(logSpy.mock.calls[0][0]))).toThrow();
    });
  });

  describe('patterns get', () => {
    function getCommand(): PatternsGetCommand {
      const command = new PatternsGetCommand(fs, logger);
      jest.spyOn(command['promptService'], 'showError').mockReturnValue(undefined);
      return command;
    }

    it('returns the full record in a success envelope', async () => {
      mockGet.mockResolvedValue(PAT_0001);

      await getCommand().executeCommand(['PAT-0001'], { ...JSON_FORMAT });

      expect(soleEnvelope().data).toMatchObject({ id: 'PAT-0001', kind: 'pattern' });
      expect(process.exitCode).toBeUndefined();
    });

    it('forwards the id verbatim so the service can match case-insensitively', async () => {
      mockGet.mockResolvedValue(PAT_0001);

      await getCommand().executeCommand(['pat-0001'], { ...JSON_FORMAT });

      expect(mockGet).toHaveBeenCalledWith(expect.any(String), 'pat-0001');
    });

    it('reports a missing id as an IO_ERROR envelope AND a non-zero exit code', async () => {
      // A success envelope here would let a script treat "not found" as found.
      mockGet.mockResolvedValue(undefined);

      await getCommand().executeCommand(['PAT-9999'], { ...JSON_FORMAT });

      const envelope = soleEnvelope();
      expect(envelope.success).toBe(false);
      expect(envelope.error?.code).toBe('IO_ERROR');
      expect(envelope.error?.message).toContain('PAT-9999');
      expect(process.exitCode).toBe(1);
    });

    it('reports a missing id on the human surface without writing to stdout', async () => {
      mockGet.mockResolvedValue(undefined);
      const command = getCommand();

      await command.executeCommand(['PAT-9999'], {});

      expect(command['promptService'].showError).toHaveBeenCalledWith(expect.stringContaining('PAT-9999'));
      expect(logSpy).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });

    it('rejects an empty id as VALIDATION_FAILED rather than querying the catalogue', async () => {
      await getCommand().executeCommand([], { ...JSON_FORMAT });

      expect(soleEnvelope().error?.code).toBe('VALIDATION_FAILED');
      expect(mockGet).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });
  });

  describe('patterns for-topology', () => {
    function forTopologyCommand(): PatternsForTopologyCommand {
      const command = new PatternsForTopologyCommand(fs, logger);
      jest.spyOn(command['promptService'], 'showError').mockReturnValue(undefined);
      jest.spyOn(command['promptService'], 'showWarning').mockReturnValue(undefined);
      return command;
    }

    it('returns applicability, guidance and enforcing rules in service order', async () => {
      mockListByTopology.mockResolvedValue([
        { pattern: PAT_0001, applicability: 'required', guidance: 'One store per service.', enforcedBy: PAT_0001.enforcedBy },
        { pattern: PAT_0099, applicability: 'recommended', guidance: 'Avoid.', enforcedBy: [] },
      ]);

      await forTopologyCommand().executeCommand(['microservices'], { ...JSON_FORMAT });

      const data = soleEnvelope().data as {
        topology: string;
        count: number;
        applications: { id: string; applicability: string; enforcedBy: unknown[] }[];
      };
      expect(data).toMatchObject({ topology: 'microservices', count: 2 });
      // Order is the contract: required before recommended.
      expect(data.applications.map((a) => a.applicability)).toEqual(['required', 'recommended']);
      expect(data.applications[0].enforcedBy).toEqual([{ ruleId: 'MS-DATA-001', engine: 'topology-ruleset' }]);
    });

    it('reports a topology nobody declares as count 0, not as an error', async () => {
      mockListByTopology.mockResolvedValue([]);

      await forTopologyCommand().executeCommand(['nonexistent-topology'], { ...JSON_FORMAT });

      expect(soleEnvelope().data).toMatchObject({ count: 0 });
      expect(process.exitCode).toBeUndefined();
    });

    it('surfaces a catalogue failure as an error envelope with exit code 1', async () => {
      mockListByTopology.mockRejectedValue(new Error('Scanned /x and found zero PAT records.'));

      await forTopologyCommand().executeCommand(['microservices'], { ...JSON_FORMAT });

      const envelope = soleEnvelope();
      expect(envelope.success).toBe(false);
      expect(envelope.error?.code).toBe('IO_ERROR');
      expect(process.exitCode).toBe(1);
    });
  });
});
