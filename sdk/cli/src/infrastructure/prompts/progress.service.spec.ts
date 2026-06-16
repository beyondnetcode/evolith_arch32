import { ProgressService } from './progress.service';
import * as p from '@clack/prompts';

jest.mock('@clack/prompts', () => ({
  spinner: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    message: '',
  })),
}));

describe('ProgressService', () => {
  let service: ProgressService;

  beforeEach(() => {
    service = new ProgressService();
    jest.clearAllMocks();
  });

  describe('when quiet mode is enabled', () => {
    it('should not create spinner', () => {
      service.start({ quiet: true, message: 'Test' });
      expect(p.spinner).not.toHaveBeenCalled();
    });

    it('should log messages to console instead of spinner', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      service.start({ quiet: true, message: 'Starting...' });
      service.update(5, 10, 'Halfway');
      service.stop('Done');
      expect(consoleSpy).toHaveBeenCalledTimes(3);
      consoleSpy.mockRestore();
    });
  });

  describe('when TTY is not available', () => {
    it('should not create spinner', () => {
      service.start({ isTTY: false, message: 'Test' });
      expect(p.spinner).not.toHaveBeenCalled();
    });

    it('should log messages to console', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      service.start({ isTTY: false, message: 'Starting...' });
      service.update(5, 10, 'Halfway');
      expect(consoleSpy).toHaveBeenCalledWith('Halfway');
      consoleSpy.mockRestore();
    });
  });

  describe('when TTY is available and quiet is false', () => {
    it('should create and start spinner', () => {
      service.start({ isTTY: true, quiet: false, message: 'Test' });
      expect(p.spinner).toHaveBeenCalled();
    });

    it('should update spinner message on update', () => {
      const mockSpinner = { start: jest.fn(), stop: jest.fn(), message: '' };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);
      
      service.start({ isTTY: true, message: 'Initial' });
      service.update(5, 10, 'Updated');
      
      expect(mockSpinner.message).toContain('Updated');
    });

    it('should format progress bar correctly', () => {
      const mockSpinner = { start: jest.fn(), stop: jest.fn(), message: '' };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);
      
      service.start({ isTTY: true, total: 10, message: 'Processing' });
      service.update(5, 10);
      
      expect(mockSpinner.message).toContain('50%');
    });
  });

  describe('increment', () => {
    it('should increment current count', () => {
      service.start({ total: 10 });
      service.increment();
      service.increment();
      service.increment();
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      service.stop();
      consoleSpy.mockRestore();
    });

    it('should update message if provided', () => {
      const mockSpinner = { start: jest.fn(), stop: jest.fn(), message: '' };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);
      
      service.start({ isTTY: true, message: 'Initial' });
      service.increment('Step 1');
      
      expect(mockSpinner.message).toContain('Step 1');
    });
  });

  describe('succeed', () => {
    it('should stop spinner with success message', () => {
      const mockSpinner = { start: jest.fn(), stop: jest.fn(), message: '' };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);
      
      service.start({ isTTY: true });
      service.succeed('Completed successfully');
      
      expect(mockSpinner.stop).toHaveBeenCalledWith('Completed successfully');
    });

    it('should use default success message', () => {
      const mockSpinner = { start: jest.fn(), stop: jest.fn(), message: '' };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);
      
      service.start({ isTTY: true });
      service.succeed();
      
      expect(mockSpinner.stop).toHaveBeenCalledWith('Done');
    });
  });

  describe('fail', () => {
    it('should stop spinner with failure message', () => {
      const mockSpinner = { start: jest.fn(), stop: jest.fn(), message: '' };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);
      
      service.start({ isTTY: true });
      service.fail('Operation failed');
      
      expect(mockSpinner.stop).toHaveBeenCalledWith('Operation failed');
    });

    it('should use default failure message', () => {
      const mockSpinner = { start: jest.fn(), stop: jest.fn(), message: '' };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);
      
      service.start({ isTTY: true });
      service.fail();
      
      expect(mockSpinner.stop).toHaveBeenCalledWith('Failed');
    });
  });

  describe('isQuiet and isTTY getters', () => {
    it('should return correct quiet state', () => {
      service.start({ quiet: true });
      expect(service.isQuiet()).toBe(true);
    });

    it('should return correct TTY state', () => {
      service.start({ isTTY: false });
      expect(service.isTTY()).toBe(false);
    });
  });
});
