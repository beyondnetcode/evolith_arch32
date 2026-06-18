import { ProgressService } from '../src/infrastructure/prompts/progress.service';

describe('ProgressService E2E', () => {
  describe('Real-time progress streaming for long-running operations', () => {
    it('should stream progress for multi-step operation', () => {
      const service = new ProgressService();
      const totalSteps = 5;
      
      service.start({
        total: totalSteps,
        message: 'Initializing project',
        isTTY: false,
        quiet: true,
      });

      const steps = [
        'Creating domain layer',
        'Creating application layer',
        'Creating infrastructure layer',
        'Creating presentation layer',
        'Finalizing setup',
      ];

      steps.forEach((step, index) => {
        service.update(index + 1, totalSteps, step);
      });

      service.succeed('Project initialized');
    });

    it('should handle incremental progress without total', () => {
      const service = new ProgressService();
      
      service.start({
        message: 'Processing items',
        isTTY: false,
        quiet: true,
      });

      for (let i = 0; i < 10; i++) {
        service.increment(`Processed item ${i + 1}`);
      }

      service.succeed('All items processed');
    });

    it('should handle failure scenario', () => {
      const service = new ProgressService();
      
      service.start({
        message: 'Installing dependencies',
        isTTY: false,
        quiet: true,
      });

      service.update(2, 5, 'Installing package A');
      service.update(3, 5, 'Installing package B');
      
      service.fail('Installation failed: network error');
    });

    it('should respect quiet mode for CI environments', () => {
      const service = new ProgressService();
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (msg: string) => logs.push(msg);

      service.start({
        message: 'CI Build step',
        quiet: true,
        isTTY: false,
      });

      service.update(1, 3, 'Step 1: Build');
      service.update(2, 3, 'Step 2: Test');
      service.update(3, 3, 'Step 3: Deploy');
      service.succeed('Build complete');

      console.log = originalLog;

      expect(logs).toEqual([
        'CI Build step',
        'Step 1: Build',
        'Step 2: Test',
        'Step 3: Deploy',
        'Build complete',
      ]);
    });

    it('should format progress bar with percentage', () => {
      const service = new ProgressService();
      
      service.start({
        total: 100,
        message: 'Downloading',
        isTTY: true,
        quiet: false,
      });

      service.update(25, 100);
      service.update(50, 100);
      service.update(75, 100);
      service.update(100, 100);
      
      service.succeed('Download complete');
    });

    it('should handle multiple start/stop cycles', () => {
      const service = new ProgressService();
      
      service.start({ total: 3, message: 'Phase 1', isTTY: false, quiet: true });
      service.update(1, 3);
      service.update(2, 3);
      service.update(3, 3);
      service.succeed('Phase 1 complete');

      service.start({ total: 2, message: 'Phase 2', isTTY: false, quiet: true });
      service.update(1, 2);
      service.update(2, 2);
      service.succeed('Phase 2 complete');
    });
  });
});
