import { WizardService } from '../src/infrastructure/prompts/wizard.service';
import * as p from '@clack/prompts';

describe('WizardService E2E', () => {
  describe('Interactive wizards for complex flows', () => {
    it('should complete full wizard flow', async () => {
      const service = new WizardService();
      
      const steps = [
        {
          id: 'step1',
          title: 'Configuration',
          run: async () => ({ config: 'test' }),
        },
        {
          id: 'step2',
          title: 'Review',
          run: async () => ({ review: 'approved' }),
        },
      ];

      const result = await service.start({
        title: 'Test Wizard',
        steps,
        noInteractive: true,
      });

      expect(result).toEqual({ config: 'test', review: 'approved' });
    });

    it('should handle cancellation at any step', async () => {
      const service = new WizardService();
      
      const steps = [
        {
          id: 'step1',
          title: 'Configuration',
          run: async () => null,
        },
      ];

      await expect(
        service.start({
          title: 'Test Wizard',
          steps,
          noInteractive: true,
        })
      ).rejects.toThrow();
    });

    it('should support non-interactive mode for CI', async () => {
      const service = new WizardService();
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (msg: string) => logs.push(msg);

      const steps = [
        {
          id: 'step1',
          title: 'Setup',
          run: async () => ({ value: 'ci-mode' }),
        },
      ];

      await service.start({
        title: 'CI Wizard',
        steps,
        noInteractive: true,
      });

      console.log = originalLog;

      expect(logs.some(log => log.includes('non-interactive'))).toBe(true);
    });

    it('should accumulate state across multiple steps', async () => {
      const service = new WizardService();
      
      const steps = [
        {
          id: 'runtime',
          title: 'Runtime',
          run: async (state: Record<string, unknown>) => ({ ...state, runtime: 'nodejs' }),
        },
        {
          id: 'monorepo',
          title: 'Monorepo',
          run: async (state: Record<string, unknown>) => ({ ...state, monorepo: 'npm' }),
        },
        {
          id: 'arch',
          title: 'Architecture',
          run: async (state: Record<string, unknown>) => ({ ...state, arch: 'clean' }),
        },
      ];

      (global as any).p_confirm = () => Promise.resolve(true);

      const result = await service.start({
        title: 'Project Setup',
        steps,
        noInteractive: true,
      });

      expect(result).toEqual({
        runtime: 'nodejs',
        monorepo: 'npm',
        arch: 'clean',
      });
    });

    it('should display summary before confirmation', async () => {
      const service = new WizardService();
      
      // Force interactive mode for testing by stubbing BOTH stdio ends.
      // GT-611: interactivity is decided by stdin — the question is whether a
      // human can ANSWER, not whether output is a terminal — so stubbing
      // stdout alone no longer models an interactive session.
      const originalIsTTY = process.stdout.isTTY;
      const originalStdinTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

      const steps = [
        {
          id: 'config',
          title: 'Configuration',
          run: async () => ({ setting: 'value' }),
        },
      ];

      let summaryShown = false;
      jest.spyOn(p, 'confirm').mockImplementation(() => {
        summaryShown = true;
        return Promise.resolve(true) as any;
      });

      await service.start({
        title: 'Test Wizard',
        steps,
        noInteractive: false,
      });

      expect(summaryShown).toBe(true);

      // Restore isTTY
      Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, configurable: true });
      Object.defineProperty(process.stdin, 'isTTY', { value: originalStdinTTY, configurable: true });
    });
  });
});
