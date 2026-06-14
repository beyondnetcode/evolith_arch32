import { GateStatusCommand } from './gate-status.command';
import * as p from '@clack/prompts';
import { isGitRepo, readGitLog } from '../../domain/metrics/git-log-reader';
import { calculateDora } from '../../domain/metrics/dora-calculator';

// ── mocks ──────────────────────────────────────────────────────────────────────

jest.mock('@clack/prompts');
jest.mock('../../domain/metrics/git-log-reader');
jest.mock('../../domain/metrics/dora-calculator');

const mockGetGateStatus = jest.fn();

jest.mock('../../application/services', () => ({
  PhaseTransitionUseCase: jest.fn().mockImplementation(() => ({
    getGateStatus: mockGetGateStatus,
  })),
}));

// ── fixture helpers ───────────────────────────────────────────────────────────

function makeGateResult(overrides: Partial<{
  gateId: string; phase: number; name: string; passed: boolean;
  accountableRole: string; waiverAuthority: string; waiverAvailable: boolean;
}> = {}) {
  return {
    gateId: overrides.gateId ?? 'G1',
    phase: overrides.phase ?? 1,
    name: overrides.name ?? 'Phase 1 Gate',
    passed: overrides.passed ?? true,
    accountableRole: overrides.accountableRole ?? 'Tech Lead',
    waiverAuthority: overrides.waiverAuthority ?? 'VP Eng',
    waiverAvailable: overrides.waiverAvailable ?? false,
    evidenceResults: [
      { artifact: 'package.json', passed: true, found: true, validationMessage: 'OK', required: true },
    ],
    blockingChecks: [],
  };
}

function makeDoraMetrics(available = true) {
  const metric = (label: string, rating: string) => ({
    value: 1,
    label,
    rating,
    unit: '',
  });

  if (!available) {
    const none = { value: 0, label: 'n/a', rating: 'unknown', unit: '' };
    return {
      available: false,
      analyzedDays: 90,
      totalCommits: 0,
      deploymentFrequency: none,
      leadTimeForChanges: none,
      changeFailureRate: none,
      timeToRestore: none,
    };
  }

  return {
    available: true,
    analyzedDays: 90,
    totalCommits: 42,
    deploymentFrequency: metric('2.0/week', 'high'),
    leadTimeForChanges: metric('3.5 h', 'high'),
    changeFailureRate: metric('4.0%', 'elite'),
    timeToRestore: metric('1.2 h', 'high'),
  };
}

// ── setup ─────────────────────────────────────────────────────────────────────

const mockSpinnerInstance = { start: jest.fn(), stop: jest.fn() };
const mockFs = { exists: jest.fn(), readJson: jest.fn() };
const mockContainer = { createFileSystem: jest.fn().mockReturnValue(mockFs) };

const mockIsGitRepo = isGitRepo as jest.Mock;
const mockReadGitLog = readGitLog as jest.Mock;
const mockCalculateDora = calculateDora as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  // Re-silence every test so inner spies that call mockRestore() don't bleed output.
  jest.spyOn(console, 'log').mockImplementation(() => {});

  (p.spinner as jest.Mock).mockReturnValue(mockSpinnerInstance);

  mockGetGateStatus.mockResolvedValue({
    currentPhase: 1,
    gatesPassed: 1,
    gatesFailed: 0,
    gatesPending: 0,
    results: [makeGateResult()],
  });

  mockIsGitRepo.mockResolvedValue(true);
  mockReadGitLog.mockResolvedValue([]);
  mockCalculateDora.mockReturnValue(makeDoraMetrics(true));
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe.skip('GateStatusCommand', () => {
  let command: GateStatusCommand;

  beforeEach(() => {
    command = new GateStatusCommand();
  });

  // ── gate status section ──────────────────────────────────────────────────────

  describe.skip('gate status section', () => {
    it('calls getGateStatus with the current working directory', async () => {
      await command.run([], {});
      expect(mockGetGateStatus).toHaveBeenCalledWith(process.cwd());
    });

    it('shows spinner while validating gates', async () => {
      await command.run([], {});
      expect(mockSpinnerInstance.start).toHaveBeenCalledWith('Validating phase gates…');
      expect(mockSpinnerInstance.stop).toHaveBeenCalled();
    });

    it('prints gate summary with phase number and counts', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.run([], {});
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Phase 1');
      consoleSpy.mockRestore();
    });

    it('reports and rejects when getGateStatus throws', async () => {
      mockGetGateStatus.mockRejectedValue(new Error('satellite missing'));

      await expect(command.run([], {})).rejects.toThrow('satellite missing');

      expect(p.log.error).toHaveBeenCalledWith(
        expect.stringContaining('satellite missing'),
      );
    });

    it('prints failed gates with waiver authority', async () => {
      mockGetGateStatus.mockResolvedValue({
        currentPhase: 2,
        gatesPassed: 0,
        gatesFailed: 1,
        gatesPending: 0,
        results: [makeGateResult({ passed: false, waiverAuthority: 'CTO' })],
      });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.run([], {});
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('CTO');
      consoleSpy.mockRestore();
    });

    it('prints blocking checks when triggered', async () => {
      const gateWithBlock = makeGateResult({ passed: false });
      gateWithBlock.blockingChecks = [{
        criterion: 'No open CVEs',
        triggered: true,
        action: 'Fix before proceeding',
      } as unknown];
      mockGetGateStatus.mockResolvedValue({
        currentPhase: 1,
        gatesPassed: 0,
        gatesFailed: 1,
        gatesPending: 0,
        results: [gateWithBlock],
      });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.run([], {});
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('No open CVEs');
      consoleSpy.mockRestore();
    });

    it('prints failed evidence with validation message', async () => {
      const gateWithFailedEvidence = makeGateResult();
      gateWithFailedEvidence.evidenceResults = [{
        artifact: 'README.md',
        passed: false,
        found: false,
        validationMessage: 'File not found',
        required: true,
      }];
      mockGetGateStatus.mockResolvedValue({
        currentPhase: 1,
        gatesPassed: 0,
        gatesFailed: 1,
        gatesPending: 0,
        results: [gateWithFailedEvidence],
      });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.run([], {});
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('File not found');
      consoleSpy.mockRestore();
    });
  });

  // ── DORA section ──────────────────────────────────────────────────────────────

  describe('DORA metrics section', () => {
    it('calls isGitRepo with cwd', async () => {
      await command.run([], {});
      expect(mockIsGitRepo).toHaveBeenCalledWith(process.cwd());
    });

    it('calls readGitLog with default 90 days when --since not provided', async () => {
      await command.run([], {});
      expect(mockReadGitLog).toHaveBeenCalledWith(
        expect.objectContaining({ sinceDays: 90 }),
      );
    });

    it('calls readGitLog with custom --since value', async () => {
      await command.run([], { since: 30 });
      expect(mockReadGitLog).toHaveBeenCalledWith(
        expect.objectContaining({ sinceDays: 30 }),
      );
    });

    it('skips DORA and logs warning when not a git repo', async () => {
      mockIsGitRepo.mockResolvedValue(false);
      await command.run([], {});
      expect(p.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('not a git repository'),
      );
      expect(mockCalculateDora).not.toHaveBeenCalled();
    });

    it('shows DORA table when git history is available', async () => {
      mockReadGitLog.mockResolvedValue([{ hash: 'abc', date: new Date().toISOString(), subject: 'feat: x', parents: [], isMerge: false }]);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.run([], {});
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('DORA Metrics');
      consoleSpy.mockRestore();
    });

    it('shows "no commit history" message when DORA unavailable', async () => {
      mockCalculateDora.mockReturnValue(makeDoraMetrics(false));
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.run([], {});
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('No commit history');
      consoleSpy.mockRestore();
    });

    it('shows all four DORA metric names', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.run([], {});
      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Deployment Frequency');
      expect(output).toContain('Lead Time for Changes');
      expect(output).toContain('Change Failure Rate');
      expect(output).toContain('Time to Restore');
      consoleSpy.mockRestore();
    });

    it('handles DORA read error gracefully with p.log.warn', async () => {
      mockReadGitLog.mockRejectedValue(new Error('git not found'));
      await command.run([], {});
      expect(p.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('git not found'),
      );
    });

    it('passes commits array to calculateDora', async () => {
      const commits = [
        { hash: 'h1', date: new Date().toISOString(), subject: 'feat: a', parents: [], isMerge: false },
        { hash: 'h2', date: new Date().toISOString(), subject: 'fix: b', parents: [], isMerge: false },
      ];
      mockReadGitLog.mockResolvedValue(commits);
      await command.run([], { since: 60 });
      expect(mockCalculateDora).toHaveBeenCalledWith(commits, 60);
    });
  });

  // ── rating badge rendering ────────────────────────────────────────────────────

  describe('rating badge rendering', () => {
    const ratingCases: Array<[string, string]> = [
      ['elite', '◆ elite'],
      ['high', '● high'],
      ['medium', '● medium'],
      ['low', '● low'],
      ['unknown', '○ unknown'],
    ];

    it.each(ratingCases)('renders %s rating badge', async (rating, badge) => {
      mockCalculateDora.mockReturnValue({
        ...makeDoraMetrics(true),
        deploymentFrequency: { value: 1, label: '1/week', rating, unit: '' },
      });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      await command.run([], {});
      const output = consoleSpy.mock.calls.map(c => String(c[0] ?? '')).join('\n');
      // Strip ANSI escape codes for comparison
      const stripped = output.replace(/\x1B\[[0-9;]*m/g, '');
      expect(stripped).toContain(badge);
      consoleSpy.mockRestore();
    });
  });

  // ── parseSince option ─────────────────────────────────────────────────────────

  describe('parseSince', () => {
    it('returns parsed integer', () => {
      expect(command.parseSince('30')).toBe(30);
    });

    it('defaults to 90 for non-numeric input', () => {
      expect(command.parseSince('abc')).toBe(90);
    });

    it('defaults to 90 for zero', () => {
      expect(command.parseSince('0')).toBe(90);
    });

    it('defaults to 90 for negative value', () => {
      expect(command.parseSince('-5')).toBe(90);
    });

    it('accepts large values', () => {
      expect(command.parseSince('365')).toBe(365);
    });
  });
});
