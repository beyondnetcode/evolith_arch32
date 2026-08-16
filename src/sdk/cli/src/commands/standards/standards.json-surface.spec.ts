/**
 * GT-562 — the `--format json` surface of `evolith standards`.
 *
 * Same blind spot as `adr`: every subcommand branches on `json` and none of
 * those branches was covered. `standards --validate` is the one that matters
 * most — its envelope carries a PASS/FAIL count that a caller gates on, so an
 * envelope that loses the failures, or reports them under a success flag, turns
 * a failing validation into a green one.
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

jest.mock('../../infrastructure/observability', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  OperationTimer: jest.fn().mockImplementation(() => ({ start: jest.fn(), end: jest.fn() })),
}));

jest.mock('@beyondnet/evolith-core-domain/domain/services/standards.service', () => ({
  StandardsService: jest.fn(),
}));

import { StandardsCommand } from './standards.command';
import { StandardsService } from '@beyondnet/evolith-core-domain/domain/services/standards.service';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';

const mockInitialize = jest.fn();
const mockList = jest.fn();
const mockGet = jest.fn();
const mockValidate = jest.fn();
const mockExport = jest.fn();

(StandardsService as unknown as jest.Mock).mockImplementation(() => ({
  initialize: mockInitialize,
  list: mockList,
  get: mockGet,
  validate: mockValidate,
  export: mockExport,
}));

const JSON_FORMAT = { format: 'json' } as const;

describe('StandardsCommand — ADR-0073 JSON surface', () => {
  let command: StandardsCommand;
  let logSpy: jest.SpyInstance;
  let originalExitCode: typeof process.exitCode;

  function soleEnvelope(): {
    success?: boolean;
    data?: Record<string, unknown>;
    error?: { code: string; message: string };
  } {
    expect(logSpy).toHaveBeenCalledTimes(1);
    return JSON.parse(String(logSpy.mock.calls[0][0]));
  }

  beforeEach(() => {
    jest.clearAllMocks();
    command = new StandardsCommand({} as IFileSystem);
    jest.spyOn(command['promptService'], 'showError').mockReturnValue(undefined);
    jest.spyOn(command['promptService'], 'showInfo').mockReturnValue(undefined);
    jest.spyOn(command['promptService'], 'showWarning').mockReturnValue(undefined);
    jest.spyOn(command['promptService'], 'showSuccess').mockReturnValue(undefined);
    jest.spyOn(command['promptService'], 'startSpinner').mockReturnValue(undefined);
    jest.spyOn(command['promptService'], 'stopSpinner').mockReturnValue(undefined);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    jest.restoreAllMocks();
  });

  describe('--init', () => {
    it('reports the created location in a success envelope', async () => {
      mockInitialize.mockResolvedValue(undefined);

      await command.executeCommand([], { init: true, ...JSON_FORMAT });

      expect(soleEnvelope().data).toMatchObject({ success: true, location: 'reference/standards/' });
      expect(process.exitCode).toBeUndefined();
    });

    it('emits an IO_ERROR envelope with exit code 1 when the structure cannot be created', async () => {
      mockInitialize.mockRejectedValue(new Error('EACCES: permission denied'));

      await command.executeCommand([], { init: true, ...JSON_FORMAT });

      const envelope = soleEnvelope();
      expect(envelope.error?.code).toBe('IO_ERROR');
      expect(envelope.error?.message).toContain('EACCES');
      expect(process.exitCode).toBe(1);
    });
  });

  describe('--list', () => {
    it('returns a count and one record per standard with its rule count', async () => {
      mockList.mockResolvedValue([
        { id: 'STD-1', name: 'Naming', version: '1.0.0', category: 'architecture', rules: [{}, {}] },
      ]);

      await command.executeCommand([], { list: true, ...JSON_FORMAT });

      const data = soleEnvelope().data as { count: number; standards: Array<{ rulesCount: number }> };
      expect(data.count).toBe(1);
      expect(data.standards[0].rulesCount).toBe(2);
    });

    it('passes the --category filter through to the service rather than filtering after the fact', async () => {
      mockList.mockResolvedValue([]);

      await command.executeCommand([], { list: true, category: 'governance', ...JSON_FORMAT });

      expect(mockList).toHaveBeenCalledWith('governance');
      expect(soleEnvelope().data).toMatchObject({ count: 0 });
    });
  });

  describe('--get', () => {
    it('returns the standard when it exists', async () => {
      mockGet.mockResolvedValue({ id: 'STD-1', name: 'Naming', rules: [] });

      await command.executeCommand([], { get: 'STD-1', ...JSON_FORMAT });

      expect(soleEnvelope().data).toMatchObject({ id: 'STD-1' });
      expect(process.exitCode).toBeUndefined();
    });

    it('reports a missing standard as IO_ERROR with a non-zero exit code', async () => {
      mockGet.mockResolvedValue(undefined);

      await command.executeCommand([], { get: 'STD-NOPE', ...JSON_FORMAT });

      expect(soleEnvelope().error?.code).toBe('IO_ERROR');
      expect(process.exitCode).toBe(1);
    });
  });

  describe('--validate', () => {
    it('carries the full pass/fail tally so a caller can gate on it', async () => {
      // Losing `failed` here is the difference between a blocked and a passing
      // pipeline, so the envelope must reproduce the service result verbatim.
      mockValidate.mockResolvedValue({
        totalRules: 3,
        passed: 1,
        failed: 2,
        results: [
          { passed: false, severity: 'error', standardId: 'STD-1', ruleId: 'R1', ruleName: 'n', message: 'm' },
        ],
      });

      await command.executeCommand([], { validate: 'const x = 1;', ...JSON_FORMAT });

      expect(soleEnvelope().data).toMatchObject({ totalRules: 3, passed: 1, failed: 2 });
    });

    it('does not call the service when no code was supplied, and exits non-zero', async () => {
      // Driven through the private method on purpose: `--validate ''` is falsy,
      // so the option path routes to interactive mode and never reaches this
      // guard. Interactive selection is the only caller that can supply an empty
      // code, and an empty validation reporting "0 failed" would read as a pass.
      await command['validateStandards']({} as IFileSystem, '', true, { command: 'evolith standards' }, Date.now());

      expect(mockValidate).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
      expect(JSON.stringify(soleEnvelope())).toContain('Code is required');
    });
  });

  describe('--export', () => {
    it('defaults to markdown when no format is given', async () => {
      mockExport.mockResolvedValue('# Naming');

      await command.executeCommand([], { export: 'STD-1' });

      expect(mockExport).toHaveBeenCalledWith('STD-1', 'markdown');
    });

    it('returns the rendered output in the envelope when JSON is requested', async () => {
      mockExport.mockResolvedValue('{"id":"STD-1"}');

      await command.executeCommand([], { export: 'STD-1', ...JSON_FORMAT });

      expect(soleEnvelope().data).toMatchObject({ id: 'STD-1', format: 'json', output: '{"id":"STD-1"}' });
    });

    it('sets a non-zero exit code when the export fails', async () => {
      mockExport.mockRejectedValue(new Error('unknown standard'));

      await command.executeCommand([], { export: 'STD-NOPE', ...JSON_FORMAT });

      // NOTE: the envelope itself is a SUCCESS envelope wrapping the failure —
      // the systemic defect recorded in adr.json-surface.spec.ts. The exit code
      // is currently the only reliable failure signal here.
      expect(process.exitCode).toBe(1);
      expect(JSON.stringify(soleEnvelope())).toContain('unknown standard');
    });
  });
});
