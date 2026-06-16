import { GateStatusCommand } from './gate-status.command';
import { IFileSystem } from '@evolith/core-domain/domain/interfaces';
import { PhaseTransitionUseCase } from '@evolith/core-domain/application/services';
import * as gitLogReader from '@evolith/core-domain/domain/metrics/git-log-reader';
import * as doraCalculator from '@evolith/core-domain/domain/metrics/dora-calculator';

jest.mock('@evolith/core-domain/application/services');
jest.mock('@evolith/core-domain/domain/metrics/git-log-reader');
jest.mock('@evolith/core-domain/domain/metrics/dora-calculator');

describe('GateStatusCommand', () => {
  let command: GateStatusCommand;
  let mockFileSystem: jest.Mocked<IFileSystem>;

  beforeEach(() => {
    mockFileSystem = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      pathExists: jest.fn(),
    } as any;

    command = new GateStatusCommand(mockFileSystem);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create GateStatusCommand instance', () => {
      expect(command).toBeInstanceOf(GateStatusCommand);
    });
  });

  describe('executeCommand', () => {
    it('should display gate status and DORA metrics', async () => {
      const mockUseCase = {
        getGateStatus: jest.fn().mockResolvedValue({
          currentPhase: 2,
          gatesPassed: 5,
          gatesFailed: 1,
          gatesPending: 2,
          results: [],
        }),
      };
      (PhaseTransitionUseCase as jest.Mock).mockImplementation(() => mockUseCase);

      (gitLogReader.isGitRepo as jest.Mock).mockResolvedValue(true);
      (gitLogReader.readGitLog as jest.Mock).mockResolvedValue([]);
      (doraCalculator.calculateDora as jest.Mock).mockReturnValue({
        deploymentFrequency: { value: 1.0, rating: 'elite' },
        leadTime: { value: 1.0, rating: 'elite' },
        changeFailureRate: { value: 0.0, rating: 'elite' },
        timeToRestore: { value: 1.0, rating: 'elite' },
        overall: { score: 4.0, rating: 'elite' },
      });

      await expect(command.executeCommand([], { since: 90 })).resolves.not.toThrow();
      expect(mockUseCase.getGateStatus).toHaveBeenCalled();
    });

    it('should handle gate status error', async () => {
      const mockUseCase = {
        getGateStatus: jest.fn().mockRejectedValue(new Error('Invalid project structure')),
      };
      (PhaseTransitionUseCase as jest.Mock).mockImplementation(() => mockUseCase);

      await expect(command.executeCommand([], {})).rejects.toThrow('Invalid project structure');
    });

    it('should skip DORA metrics when not a git repository', async () => {
      const mockUseCase = {
        getGateStatus: jest.fn().mockResolvedValue({
          currentPhase: 1,
          gatesPassed: 0,
          gatesFailed: 0,
          gatesPending: 1,
          results: [],
        }),
      };
      (PhaseTransitionUseCase as jest.Mock).mockImplementation(() => mockUseCase);
      (gitLogReader.isGitRepo as jest.Mock).mockResolvedValue(false);

      await expect(command.executeCommand([], {})).resolves.not.toThrow();
      expect(gitLogReader.readGitLog).not.toHaveBeenCalled();
    });

    it('should handle DORA calculation error gracefully', async () => {
      const mockUseCase = {
        getGateStatus: jest.fn().mockResolvedValue({
          currentPhase: 1,
          gatesPassed: 0,
          gatesFailed: 0,
          gatesPending: 1,
          results: [],
        }),
      };
      (PhaseTransitionUseCase as jest.Mock).mockImplementation(() => mockUseCase);
      (gitLogReader.isGitRepo as jest.Mock).mockResolvedValue(true);
      (gitLogReader.readGitLog as jest.Mock).mockRejectedValue(new Error('Git error'));

      await expect(command.executeCommand([], {})).resolves.not.toThrow();
    });

    it('should use default 90 days for DORA metrics', async () => {
      const mockUseCase = {
        getGateStatus: jest.fn().mockResolvedValue({
          currentPhase: 1,
          gatesPassed: 0,
          gatesFailed: 0,
          gatesPending: 1,
          results: [],
        }),
      };
      (PhaseTransitionUseCase as jest.Mock).mockImplementation(() => mockUseCase);
      (gitLogReader.isGitRepo as jest.Mock).mockResolvedValue(true);
      (gitLogReader.readGitLog as jest.Mock).mockResolvedValue([]);

      await expect(command.executeCommand([], {})).resolves.not.toThrow();
      expect(gitLogReader.readGitLog).toHaveBeenCalledWith(expect.objectContaining({ sinceDays: 90 }));
    });
  });

  describe('parseSince', () => {
    it('should parse valid number', () => {
      const result = command.parseSince('30');
      expect(result).toBe(30);
    });

    it('should parse valid number with decimals', () => {
      const result = command.parseSince('60.5');
      expect(result).toBe(60);
    });

    it('should return default 90 when NaN', () => {
      const result = command.parseSince('invalid');
      expect(result).toBe(90);
    });

    it('should return default 90 when negative', () => {
      const result = command.parseSince('-10');
      expect(result).toBe(90);
    });

    it('should return default 90 when zero', () => {
      const result = command.parseSince('0');
      expect(result).toBe(90);
    });
  });
});
