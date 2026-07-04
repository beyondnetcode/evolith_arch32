import { GateStatusCommand } from './gate-status.command';
import { IFileSystem } from '@evolith/core-domain/domain/interfaces';
import { PhaseTransitionUseCase } from '@evolith/core-domain/application/services';
import * as gitLogReader from '@evolith/core-domain/domain/metrics/git-log-reader';
import * as doraCalculator from '@evolith/core-domain/domain/metrics/dora-calculator';

jest.mock('@evolith/core-domain/application/services');
jest.mock('@evolith/core-domain/domain/metrics/git-log-reader');
jest.mock('@evolith/core-domain/domain/metrics/dora-calculator');

function makeFullStatus() {
  return {
    currentPhase: 2,
    gatesPassed: 3,
    gatesFailed: 2,
    gatesPending: 1,
    results: [
      {
        gateId: 'G1',
        phase: 1,
        name: 'Design Review',
        passed: true,
        evidenceResults: [
          { artifact: 'adr-001.md', passed: true, found: true, validationMessage: '', required: true },
          { artifact: 'spec.md', passed: true, found: true, validationMessage: '', required: false },
        ],
        blockingChecks: [
          { criterion: 'No critical violations', triggered: false, action: '' },
        ],
        waiverAvailable: false,
        accountableRole: 'architect',
        waiverAuthority: '',
      },
      {
        gateId: 'G2',
        phase: 2,
        name: 'Code Quality',
        passed: false,
        evidenceResults: [
          { artifact: 'test-report.xml', passed: false, found: true, validationMessage: 'Coverage below 80%', required: true },
          { artifact: 'lint-report.json', passed: true, found: true, validationMessage: '', required: true },
        ],
        blockingChecks: [
          { criterion: 'Tests pass', triggered: true, action: 'Run npm test and fix failures' },
          { criterion: 'No blocking vulnerabilities', triggered: false, action: '' },
        ],
        waiverAvailable: true,
        accountableRole: 'tech-lead',
        waiverAuthority: 'engineering-manager',
      },
    ],
  };
}

function makeFullDora(): ReturnType<typeof doraCalculator.calculateDora> {
  return {
    deploymentFrequency: { value: 12.0, label: '12.0/week', rating: 'elite', unit: 'deployments/week' },
    leadTimeForChanges: { value: 0.5, label: '30 min', rating: 'elite', unit: 'hours (median)' },
    changeFailureRate: { value: 3.2, label: '3.2%', rating: 'elite', unit: '% fix/revert commits' },
    timeToRestore: { value: 0.5, label: '30 min', rating: 'elite', unit: 'hours (median)' },
    analyzedDays: 90,
    totalCommits: 245,
    available: true,
  };
}

describe('GateStatusCommand', () => {
  let command: GateStatusCommand;
  let mockFileSystem: jest.Mocked<IFileSystem>;
  let mockPrompt: { startSpinner: jest.Mock; stopSpinner: jest.Mock; showInfo: jest.Mock; showWarning: jest.Mock; showSuccess: jest.Mock };

  beforeEach(() => {
    mockFileSystem = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      pathExists: jest.fn(),
    } as any;

    command = new GateStatusCommand(mockFileSystem);

    mockPrompt = {
      startSpinner: jest.fn(),
      stopSpinner: jest.fn(),
      showInfo: jest.fn(),
      showWarning: jest.fn(),
      showSuccess: jest.fn(),
    };
    (command as any).promptService = mockPrompt;

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create GateStatusCommand instance', () => {
      expect(command).toBeInstanceOf(GateStatusCommand);
    });
  });

  describe('executeCommand — happy paths', () => {
    it('should display gate status with passed and failed gates, evidence, blocking checks', async () => {
      const mockUseCase = { getGateStatus: jest.fn().mockResolvedValue(makeFullStatus()) };
      (PhaseTransitionUseCase as jest.Mock).mockImplementation(() => mockUseCase);
      (gitLogReader.isGitRepo as jest.Mock).mockResolvedValue(true);
      (gitLogReader.readGitLog as jest.Mock).mockResolvedValue([
        { hash: 'a1', date: '2024-01-01T00:00:00Z', subject: 'feat: add feature', isMerge: true, parents: ['p1', 'p2'] },
      ]);
      (doraCalculator.calculateDora as jest.Mock).mockReturnValue(makeFullDora());

      await expect(command.executeCommand([], { since: 30 })).resolves.not.toThrow();

      const infoCalls = mockPrompt.showInfo.mock.calls.map((c: any[]) => c[0]);
      const output = infoCalls.join('\n');

      expect(output).toContain('Phase 1: Design Review');
      expect(output).toContain('Phase 2: Code Quality');
      expect(output).toContain('architect');
      expect(output).toContain('tech-lead');
      expect(output).toContain('Waiver Authority:');
      expect(output).toContain('Coverage below 80%');
      expect(output).toContain('adr-001.md');
      expect(output).toContain('[REQUIRED]');
      expect(output).toContain('[OPTIONAL]');
      expect(output).toContain('Run npm test and fix failures');
    });

    it('should render DORA metrics with all rating badges', async () => {
      const mockUseCase = { getGateStatus: jest.fn().mockResolvedValue(makeFullStatus()) };
      (PhaseTransitionUseCase as jest.Mock).mockImplementation(() => mockUseCase);
      (gitLogReader.isGitRepo as jest.Mock).mockResolvedValue(true);
      (gitLogReader.readGitLog as jest.Mock).mockResolvedValue([{ hash: 'a', date: '2024-01-01T00:00:00Z', subject: 'feat: x', isMerge: true, parents: ['p'] }]);
      (doraCalculator.calculateDora as jest.Mock).mockReturnValue({
        deploymentFrequency: { value: 12.0, label: '12.0/week', rating: 'elite', unit: 'd/w' },
        leadTimeForChanges: { value: 12.0, label: '12.0 h', rating: 'high', unit: 'h' },
        changeFailureRate: { value: 12.0, label: '12.0%', rating: 'medium', unit: '%' },
        timeToRestore: { value: 12.0, label: '12.0 h', rating: 'low', unit: 'h' },
        analyzedDays: 90,
        totalCommits: 10,
        available: true,
      });

      await command.executeCommand([], {});

      const output = mockPrompt.showInfo.mock.calls.map((c: any[]) => c[0]).join('\n');
      expect(output).toContain('Deployment Frequency');
      expect(output).toContain('Lead Time for Changes');
      expect(output).toContain('Change Failure Rate');
      expect(output).toContain('Time to Restore');
      expect(output).toContain('Based on 10 commits');
    });

    it('should render "unknown" badge for an unrated DORA metric', async () => {
      const mockUseCase = { getGateStatus: jest.fn().mockResolvedValue(makeFullStatus()) };
      (PhaseTransitionUseCase as jest.Mock).mockImplementation(() => mockUseCase);
      (gitLogReader.isGitRepo as jest.Mock).mockResolvedValue(true);
      (gitLogReader.readGitLog as jest.Mock).mockResolvedValue([{ hash: 'a', date: '2024-01-01T00:00:00Z', subject: 'feat: x', isMerge: true, parents: ['p'] }]);
      (doraCalculator.calculateDora as jest.Mock).mockReturnValue({
        deploymentFrequency: { value: 0, label: 'n/a', rating: 'unknown', unit: '' },
        leadTimeForChanges: { value: 0, label: 'n/a', rating: 'unknown', unit: '' },
        changeFailureRate: { value: 0, label: 'n/a', rating: 'unknown', unit: '' },
        timeToRestore: { value: 0, label: 'n/a', rating: 'unknown', unit: '' },
        analyzedDays: 90,
        totalCommits: 5,
        available: true,
      });

      await command.executeCommand([], {});

      const output = mockPrompt.showInfo.mock.calls.map((c: any[]) => c[0]).join('\n');
      expect(output).toContain('unknown');
      expect(output).toContain('Based on 5 commits');
    });

    it('should display "no commit history" when DORA available is false', async () => {
      const mockUseCase = { getGateStatus: jest.fn().mockResolvedValue(makeFullStatus()) };
      (PhaseTransitionUseCase as jest.Mock).mockImplementation(() => mockUseCase);
      (gitLogReader.isGitRepo as jest.Mock).mockResolvedValue(true);
      (gitLogReader.readGitLog as jest.Mock).mockResolvedValue([]);
      (doraCalculator.calculateDora as jest.Mock).mockReturnValue({
        deploymentFrequency: { value: 0, label: 'n/a', rating: 'unknown', unit: '' },
        leadTimeForChanges: { value: 0, label: 'n/a', rating: 'unknown', unit: '' },
        changeFailureRate: { value: 0, label: 'n/a', rating: 'unknown', unit: '' },
        timeToRestore: { value: 0, label: 'n/a', rating: 'unknown', unit: '' },
        analyzedDays: 90,
        totalCommits: 0,
        available: false,
      });

      await command.executeCommand([], {});

      const output = mockPrompt.showInfo.mock.calls.map((c: any[]) => c[0]).join('\n');
      expect(output).toContain('No commit history found');
    });
  });

  describe('executeCommand — error paths', () => {
    it('should handle gate status error', async () => {
      const mockUseCase = { getGateStatus: jest.fn().mockRejectedValue(new Error('Invalid project structure')) };
      (PhaseTransitionUseCase as jest.Mock).mockImplementation(() => mockUseCase);

      await expect(command.executeCommand([], {})).rejects.toThrow('Invalid project structure');
    });

    it('should skip DORA metrics when not a git repository', async () => {
      const mockUseCase = { getGateStatus: jest.fn().mockResolvedValue(makeFullStatus()) };
      (PhaseTransitionUseCase as jest.Mock).mockImplementation(() => mockUseCase);
      (gitLogReader.isGitRepo as jest.Mock).mockResolvedValue(false);

      await command.executeCommand([], {});

      expect(gitLogReader.readGitLog).not.toHaveBeenCalled();
      expect(mockPrompt.showWarning).toHaveBeenCalledWith('DORA metrics skipped — not a git repository.');
    });

    it('should handle DORA calculation error gracefully', async () => {
      const mockUseCase = { getGateStatus: jest.fn().mockResolvedValue(makeFullStatus()) };
      (PhaseTransitionUseCase as jest.Mock).mockImplementation(() => mockUseCase);
      (gitLogReader.isGitRepo as jest.Mock).mockResolvedValue(true);
      (gitLogReader.readGitLog as jest.Mock).mockRejectedValue(new Error('Git error'));

      await command.executeCommand([], {});

      expect(mockPrompt.showWarning).toHaveBeenCalledWith('DORA metrics unavailable: Git error');
    });

    it('should handle non-Error DORA failure', async () => {
      const mockUseCase = { getGateStatus: jest.fn().mockResolvedValue(makeFullStatus()) };
      (PhaseTransitionUseCase as jest.Mock).mockImplementation(() => mockUseCase);
      (gitLogReader.isGitRepo as jest.Mock).mockResolvedValue(true);
      (gitLogReader.readGitLog as jest.Mock).mockRejectedValue('string error');

      await command.executeCommand([], {});

      expect(mockPrompt.showWarning).toHaveBeenCalledWith(expect.stringContaining('DORA metrics unavailable'));
    });

    it('should use default 90 days for DORA metrics when no since option', async () => {
      const mockUseCase = { getGateStatus: jest.fn().mockResolvedValue(makeFullStatus()) };
      (PhaseTransitionUseCase as jest.Mock).mockImplementation(() => mockUseCase);
      (gitLogReader.isGitRepo as jest.Mock).mockResolvedValue(true);
      (gitLogReader.readGitLog as jest.Mock).mockResolvedValue([]);

      await command.executeCommand([], {});

      expect(gitLogReader.readGitLog).toHaveBeenCalledWith(expect.objectContaining({ sinceDays: 90 }));
    });
  });

  describe('parseSince', () => {
    it('should parse valid number', () => {
      expect(command.parseSince('30')).toBe(30);
    });

    it('should parse valid number with decimals', () => {
      expect(command.parseSince('60.5')).toBe(60);
    });

    it('should return default 90 when NaN', () => {
      expect(command.parseSince('invalid')).toBe(90);
    });

    it('should return default 90 when negative', () => {
      expect(command.parseSince('-10')).toBe(90);
    });

    it('should return default 90 when zero', () => {
      expect(command.parseSince('0')).toBe(90);
    });
  });
});
