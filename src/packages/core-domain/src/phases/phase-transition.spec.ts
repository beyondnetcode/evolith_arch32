import { PhaseTransitionService, TransitionRequest } from './phase-transition';
import { ILogger } from '../domain/interfaces';

const createMockLogger = (): ILogger => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

describe('PhaseTransitionService', () => {
  let service: PhaseTransitionService;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    service = new PhaseTransitionService(mockLogger);
  });

  it('constructs without error using a mocked logger', () => {
    expect(service).toBeDefined();
  });

  describe('canTransition', () => {
    it('returns eligible=false when gateScore is below 80', () => {
      const req: TransitionRequest = {
        projectPath: '/project',
        currentPhase: 1,
        targetPhase: 2,
        gateScore: 79,
      };

      const result = service.canTransition(req);

      expect(result.eligible).toBe(false);
      expect(result.actualScore).toBe(79);
      expect(result.requiredScore).toBe(80);
      expect(result.reason).toContain('79');
    });

    it('returns eligible=true when gateScore is exactly 80 and targetPhase = currentPhase + 1', () => {
      const req: TransitionRequest = {
        projectPath: '/project',
        currentPhase: 1,
        targetPhase: 2,
        gateScore: 80,
      };

      const result = service.canTransition(req);

      expect(result.eligible).toBe(true);
      expect(result.actualScore).toBe(80);
      expect(result.requiredScore).toBe(80);
    });

    it('returns eligible=true when gateScore is above 80 and targetPhase = currentPhase + 1', () => {
      const req: TransitionRequest = {
        projectPath: '/project',
        currentPhase: 2,
        targetPhase: 3,
        gateScore: 95,
      };

      const result = service.canTransition(req);

      expect(result.eligible).toBe(true);
    });

    it('returns eligible=false when targetPhase is not currentPhase + 1', () => {
      const req: TransitionRequest = {
        projectPath: '/project',
        currentPhase: 1,
        targetPhase: 3,
        gateScore: 100,
      };

      const result = service.canTransition(req);

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Non-sequential');
    });

    it('returns eligible=false when attempting to skip backwards', () => {
      const req: TransitionRequest = {
        projectPath: '/project',
        currentPhase: 3,
        targetPhase: 2,
        gateScore: 100,
      };

      const result = service.canTransition(req);

      expect(result.eligible).toBe(false);
    });
  });

  describe('getRequiredScore', () => {
    it('returns 80 for all phases', () => {
      expect(service.getRequiredScore(0)).toBe(80);
      expect(service.getRequiredScore(1)).toBe(80);
      expect(service.getRequiredScore(5)).toBe(80);
    });
  });
});
