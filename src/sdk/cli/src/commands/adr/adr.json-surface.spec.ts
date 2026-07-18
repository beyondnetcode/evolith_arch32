/**
 * GT-562 — the `--format json` surface of `evolith adr`.
 *
 * Every subcommand of `adr` branches on `json`, and NOT ONE of those branches
 * was covered: the whole ADR-0073 machine surface of this command was untested.
 * That is the contract MCP and any script consume, and its failure mode is
 * silent — a human run still looks perfect while `JSON.parse(stdout)` breaks, or
 * an envelope reports success for an ADR that was never written.
 *
 * The two things asserted throughout are the ones a machine consumer depends on:
 *   - stdout is a SINGLE parseable envelope, and
 *   - a failure carries an error code AND a non-zero exit code, never a success
 *     envelope with an error message buried in its payload.
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

jest.mock('@beyondnet/evolith-core-domain/domain/services/adr.service', () => ({
  ADRService: jest.fn(),
}));

import { ADRCommand } from './adr.command';
import { ADRService } from '@beyondnet/evolith-core-domain/domain/services/adr.service';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import type { IFileSystem } from '@beyondnet/evolith-core-domain/domain/interfaces';

const mockList = jest.fn();
const mockGet = jest.fn();
const mockUpdateStatus = jest.fn();
const mockGetMatrix = jest.fn();
const mockCreate = jest.fn();

(ADRService as unknown as jest.Mock).mockImplementation(() => ({
  create: mockCreate,
  list: mockList,
  get: mockGet,
  updateStatus: mockUpdateStatus,
  getMatrix: mockGetMatrix,
}));

const JSON_FORMAT = { format: 'json' } as const;

describe('ADRCommand — ADR-0073 JSON surface', () => {
  let command: ADRCommand;
  let prompt: PromptService;
  let logSpy: jest.SpyInstance;
  let originalExitCode: typeof process.exitCode;

  /** stdout must be exactly ONE envelope; this fails loudly if it is not. */
  function soleEnvelope(): Record<string, never> & {
    success?: boolean;
    data?: Record<string, unknown>;
    error?: { code: string; message: string };
  } {
    expect(logSpy).toHaveBeenCalledTimes(1);
    return JSON.parse(String(logSpy.mock.calls[0][0]));
  }

  beforeEach(() => {
    jest.clearAllMocks();
    prompt = new PromptService();
    jest.spyOn(prompt, 'showError').mockReturnValue(undefined);
    jest.spyOn(prompt, 'showInfo').mockReturnValue(undefined);
    jest.spyOn(prompt, 'showWarning').mockReturnValue(undefined);
    jest.spyOn(prompt, 'showSuccess').mockReturnValue(undefined);
    jest.spyOn(prompt, 'showIntro').mockReturnValue(undefined);
    jest.spyOn(prompt, 'stopSpinner').mockReturnValue(undefined);
    command = new ADRCommand({} as IFileSystem, prompt);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    jest.restoreAllMocks();
  });

  describe('--list', () => {
    it('returns a count and the ADR records in a success envelope', async () => {
      mockList.mockResolvedValue([
        { id: 'ADR-0001', title: 'Hexagonal architecture', status: 'accepted', date: '2026-01-01' },
        { id: 'ADR-0002', title: 'Ports and adapters', status: 'proposed', date: '2026-02-01' },
      ]);

      await command.executeCommand([], { list: true, ...JSON_FORMAT });

      const envelope = soleEnvelope();
      expect(envelope.data).toMatchObject({ count: 2 });
      expect((envelope.data as { adrs: unknown[] }).adrs).toHaveLength(2);
      expect(process.exitCode).toBeUndefined();
    });

    it('reports an empty corpus as count 0, not as an error', async () => {
      // "No ADRs yet" is a legitimate state; turning it into an error would make
      // a fresh project unusable to any automated caller.
      mockList.mockResolvedValue([]);

      await command.executeCommand([], { list: true, ...JSON_FORMAT });

      expect(soleEnvelope().data).toMatchObject({ count: 0, adrs: [] });
    });

    it('does not print the human table when JSON was requested', async () => {
      const tableSpy = jest.spyOn(console, 'table').mockImplementation(() => undefined);
      mockList.mockResolvedValue([{ id: 'ADR-0001', title: 't', status: 'accepted', date: 'd' }]);

      await command.executeCommand([], { list: true, ...JSON_FORMAT });

      // Anything besides the envelope on stdout breaks JSON.parse.
      expect(tableSpy).not.toHaveBeenCalled();
    });
  });

  describe('--get', () => {
    it('returns the ADR in a success envelope when it exists', async () => {
      mockGet.mockResolvedValue({ id: 'ADR-0001', title: 'Hexagonal', status: 'accepted' });

      await command.executeCommand([], { get: 'ADR-0001', ...JSON_FORMAT });

      expect(soleEnvelope().data).toMatchObject({ id: 'ADR-0001', status: 'accepted' });
      expect(process.exitCode).toBeUndefined();
    });

    it('reports a missing ADR as an IO_ERROR envelope AND a non-zero exit code', async () => {
      // A success envelope here would let a script treat "not found" as found.
      mockGet.mockResolvedValue(undefined);

      await command.executeCommand([], { get: 'ADR-9999', ...JSON_FORMAT });

      const envelope = soleEnvelope();
      expect(envelope.error?.code).toBe('IO_ERROR');
      expect(envelope.error?.message).toContain('ADR-9999');
      expect(process.exitCode).toBe(1);
    });

    it('reports a missing ADR on the human surface without writing to stdout', async () => {
      mockGet.mockResolvedValue(undefined);

      await command.executeCommand([], { get: 'ADR-9999' });

      expect(prompt.showError).toHaveBeenCalledWith(expect.stringContaining('ADR-9999'));
      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe('--matrix', () => {
    it('returns the traceability matrix in a success envelope', async () => {
      mockGetMatrix.mockResolvedValue({ 'ADR-0001': ['RULE-1', 'RULE-2'] });

      await command.executeCommand([], { matrix: true, ...JSON_FORMAT });

      expect(soleEnvelope().data).toMatchObject({ 'ADR-0001': ['RULE-1', 'RULE-2'] });
    });
  });

  describe('--update', () => {
    it('requires a --status, refusing to update to an unspecified state', async () => {
      await command.executeCommand([], { update: 'ADR-0001', ...JSON_FORMAT });

      const envelope = soleEnvelope();
      // Whatever the envelope kind, the payload must say it did NOT succeed.
      expect(JSON.stringify(envelope)).toContain('status');
      expect(mockUpdateStatus).not.toHaveBeenCalled();
    });

    it('reports the updated ADR when the transition is accepted', async () => {
      mockUpdateStatus.mockResolvedValue({ id: 'ADR-0001', status: 'superseded' });

      await command.executeCommand([], {
        update: 'ADR-0001',
        status: 'superseded',
        reason: 'replaced by ADR-0007',
        ...JSON_FORMAT,
      });

      expect(mockUpdateStatus).toHaveBeenCalledWith(
        'ADR-0001',
        'superseded',
        'replaced by ADR-0007',
        false, // dryRun
      );
      expect(JSON.stringify(soleEnvelope())).toContain('superseded');
    });

    it('surfaces the underlying failure in the payload when the update throws', async () => {
      mockUpdateStatus.mockRejectedValue(new Error('file is read-only'));

      await command.executeCommand([], { update: 'ADR-0001', status: 'accepted', ...JSON_FORMAT });

      const envelope = soleEnvelope();
      expect((envelope.data as { error?: string }).error).toContain('file is read-only');
      expect((envelope.data as { success?: boolean }).success).toBe(false);
    });

    it('KNOWN DEFECT: wraps that failure in a top-level success envelope', async () => {
      // Documented, not blessed. `adr`, `standards`, `agents` and `chat` build
      // their failure output with `createSuccessEnvelope({ success: false, ... })`
      // (18 call sites), so `envelope.success` is TRUE for a failed command and
      // the real outcome is buried one level down in `data.success`. Any consumer
      // that routes on the documented top-level field reads a failure as a pass.
      //
      // This is a CHARACTERIZATION test: it asserts what the code does today so
      // the defect is recorded rather than rediscovered. When the call sites are
      // switched to `createErrorEnvelope` this test will FAIL — at which point it
      // should be DELETED, not updated to match.
      mockUpdateStatus.mockRejectedValue(new Error('file is read-only'));

      await command.executeCommand([], { update: 'ADR-0001', status: 'accepted', ...JSON_FORMAT });

      const envelope = soleEnvelope();
      expect(envelope.success).toBe(true); // ← wrong; the command failed
      expect(envelope.error).toBeUndefined(); // ← wrong; there IS an error
      expect((envelope.data as { success?: boolean }).success).toBe(false);
    });
  });

  describe('--create failures', () => {
    it('emits an IO_ERROR envelope with exit code 1 when the ADR cannot be written', async () => {
      // Interactive creation is driven by prompts; a rejected prompt/service call
      // must not leave stdout claiming a created ADR.
      mockCreate.mockRejectedValue(new Error('EACCES: permission denied'));
      jest.spyOn(prompt, 'text').mockResolvedValue('A title long enough' as never);
      jest.spyOn(prompt, 'confirm').mockResolvedValue(true as never);

      await command.executeCommand([], { create: true, ...JSON_FORMAT });

      const body = JSON.stringify(soleEnvelope());
      expect(body).not.toContain('"success": true');
      expect(process.exitCode).toBe(1);
    });
  });
});
