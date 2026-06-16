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

    it('should handle step returning null as cancellation', async () => {
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

    it('should show summary and ask for confirmation', async () => {
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

    it('should throw UserCancelledError when user cancels at summary', async () => {
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

    it('should run in non-interactive mode when TTY is not available', async () => {
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
        noInteractive: true,
      });

      expect(goBackCalled).toBe(true);
    });
  });
});
