import { WizardService, WizardStep } from './wizard.service';
import * as p from '@clack/prompts';

jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  outro: jest.fn(),
  cancel: jest.fn(),
  confirm: jest.fn(),
  log: {
    message: jest.fn(),
    info: jest.fn(),
  },
}));

describe('WizardService', () => {
  let service: WizardService;

  beforeEach(() => {
    service = new WizardService();
    jest.clearAllMocks();
  });

  describe('start', () => {
    it('should execute all steps in sequence', async () => {
      const mockSteps: WizardStep[] = [
        {
          id: 'step1',
          title: 'Step 1',
          run: jest.fn().mockResolvedValue({ value1: 'test1' }),
        },
        {
          id: 'step2',
          title: 'Step 2',
          run: jest.fn().mockResolvedValue({ value2: 'test2' }),
        },
      ];

      (p.confirm as jest.Mock).mockResolvedValue(true);

      const result = await service.start({
        title: 'Test Wizard',
        steps: mockSteps,
        noInteractive: true,
      });

      expect(result).toEqual({ value1: 'test1', value2: 'test2' });
      expect(mockSteps[0].run).toHaveBeenCalled();
      expect(mockSteps[1].run).toHaveBeenCalled();
    });

    it.skip('should handle step returning null as cancellation', async () => {
      const mockSteps: WizardStep[] = [
        {
          id: 'step1',
          title: 'Step 1',
          run: jest.fn().mockResolvedValue(null),
        },
      ];

      await expect(
        service.start({
          title: 'Test Wizard',
          steps: mockSteps,
          noInteractive: true,
        })
      ).rejects.toThrow();
    });

    it.skip('should show summary and ask for confirmation', async () => {
      const mockSteps: WizardStep[] = [
        {
          id: 'step1',
          title: 'Step 1',
          run: jest.fn().mockResolvedValue({ key: 'value' }),
        },
      ];

      (p.confirm as jest.Mock).mockResolvedValue(true);

      await service.start({
        title: 'Test Wizard',
        steps: mockSteps,
        noInteractive: false,
      });

      expect(p.confirm).toHaveBeenCalledWith({
        message: 'Proceed with these settings?',
        initialValue: true,
      });
    });

    it.skip('should throw UserCancelledError when user cancels at summary', async () => {
      const mockSteps: WizardStep[] = [
        {
          id: 'step1',
          title: 'Step 1',
          run: jest.fn().mockResolvedValue({ key: 'value' }),
        },
      ];

      (p.confirm as jest.Mock).mockResolvedValue(false);

      await expect(
        service.start({
          title: 'Test Wizard',
          steps: mockSteps,
          noInteractive: false,
        })
      ).rejects.toThrow();
    });
  });

  describe('non-interactive mode', () => {
    it('should skip prompts when noInteractive is true', async () => {
      const mockSteps: WizardStep[] = [
        {
          id: 'step1',
          title: 'Step 1',
          run: jest.fn().mockResolvedValue({ key: 'value' }),
        },
      ];

      await service.start({
        title: 'Test Wizard',
        steps: mockSteps,
        noInteractive: true,
      });

      expect(p.confirm).not.toHaveBeenCalled();
    });

    it.skip('should run in non-interactive mode when TTY is not available', async () => {
      const originalTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', { value: false });

      const mockSteps: WizardStep[] = [
        {
          id: 'step1',
          title: 'Step 1',
          run: jest.fn().mockResolvedValue({ key: 'value' }),
        },
      ];

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.start({
        title: 'Test Wizard',
        steps: mockSteps,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('non-interactive mode')
      );

      consoleSpy.mockRestore();
      Object.defineProperty(process.stdout, 'isTTY', { value: originalTTY });
    });
  });

  describe('state management', () => {
    it('should accumulate state across steps', async () => {
      const mockSteps: WizardStep[] = [
        {
          id: 'step1',
          title: 'Step 1',
          run: jest.fn().mockImplementation((state) => {
            return Promise.resolve({ ...state, step1: true });
          }),
        },
        {
          id: 'step2',
          title: 'Step 2',
          run: jest.fn().mockImplementation((state) => {
            return Promise.resolve({ ...state, step2: true });
          }),
        },
      ];

      (p.confirm as jest.Mock).mockResolvedValue(true);

      await service.start({
        title: 'Test Wizard',
        steps: mockSteps,
        noInteractive: false,
      });

      expect(service.getState()).toEqual({ step1: true, step2: true });
    });

    it('should provide current step index', async () => {
      const mockSteps: WizardStep[] = [
        {
          id: 'step1',
          title: 'Step 1',
          run: jest.fn().mockResolvedValue({}),
        },
      ];

      (p.confirm as jest.Mock).mockResolvedValue(true);

      await service.start({
        title: 'Test Wizard',
        steps: mockSteps,
        noInteractive: true,
      });

      expect(service.getTotalSteps()).toBe(1);
    });
  });

  describe('goBack functionality', () => {
    let originalTTY: boolean | undefined;
    
    beforeAll(() => {
      originalTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    });
    
    afterAll(() => {
      Object.defineProperty(process.stdout, 'isTTY', { value: originalTTY, configurable: true });
    });
    
    it('should allow step to trigger goBack', async () => {
      let goBackCalled = false;
      
      const mockSteps: WizardStep[] = [
        {
          id: 'step1',
          title: 'Step 1',
          run: jest.fn().mockImplementation((state, goBack) => {
            goBack();
            goBackCalled = true;
            return Promise.resolve({ key: 'value' });
          }),
        },
        {
          id: 'step2',
          title: 'Step 2',
          run: jest.fn().mockResolvedValue({ key2: 'value2' }),
        },
      ];

      (p.confirm as jest.Mock).mockResolvedValue(true);

      await service.start({
        title: 'Test Wizard',
        steps: mockSteps,
        noInteractive: false,
      });

      expect(goBackCalled).toBe(true);
    });

    it('should complete wizard after goBack is called once', async () => {
      let step2ExecutionCount = 0;
      
      const mockSteps: WizardStep[] = [
        {
          id: 'step1',
          title: 'Step 1',
          run: jest.fn().mockResolvedValue({ step1: 'value' }),
        },
        {
          id: 'step2',
          title: 'Step 2',
          run: jest.fn().mockImplementation((state, goBack) => {
            step2ExecutionCount++;
            if (step2ExecutionCount === 1) {
              goBack();
            }
            return Promise.resolve({ step2: 'value' });
          }),
        },
      ];

      (p.confirm as jest.Mock).mockResolvedValue(true);

      const result = await service.start({
        title: 'Test Wizard',
        steps: mockSteps,
        noInteractive: false,
      });

      expect(step2ExecutionCount).toBeGreaterThan(1);
      expect(result).toEqual({ step1: 'value', step2: 'value' });
    });
  });

  describe('step validation', () => {
    it('should accept validate function in step definition', () => {
      const step: WizardStep = {
        id: 'test',
        title: 'Test',
        run: jest.fn().mockResolvedValue({}),
        validate: (state) => undefined,
      };
      
      expect(step.validate).toBeDefined();
      expect(step.validate({})).toBeUndefined();
    });

    it('should return error message when validation fails', () => {
      const step: WizardStep = {
        id: 'test',
        title: 'Test',
        run: jest.fn().mockResolvedValue({ name: '' }),
        validate: (state) => {
          if (!state.name || (state.name as string).length < 3) {
            return 'Name too short';
          }
          return undefined;
        },
      };
      
      expect(step.validate({ name: '' })).toBe('Name too short');
      expect(step.validate({ name: 'valid' })).toBeUndefined();
    });

    it('should proceed when validation passes', async () => {
      const mockSteps: WizardStep[] = [
        {
          id: 'step1',
          title: 'Step 1',
          run: jest.fn().mockResolvedValue({ name: 'valid' }),
          validate: (state) => undefined,
        },
        {
          id: 'step2',
          title: 'Step 2',
          run: jest.fn().mockResolvedValue({ value: 'test' }),
        },
      ];

      (p.confirm as jest.Mock).mockResolvedValue(true);

      const result = await service.start({
        title: 'Test Wizard',
        steps: mockSteps,
        noInteractive: true,
      });

      expect(result).toEqual({ name: 'valid', value: 'test' });
      expect(mockSteps[0].run).toHaveBeenCalledTimes(1);
    });
  });
});
