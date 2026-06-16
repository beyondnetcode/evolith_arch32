import { ConfirmationService } from './confirmation.service';
import { PassThrough } from 'node:stream';
import * as readline from 'node:readline';

jest.mock('node:readline');

describe('ConfirmationService', () => {
  describe('when skipConfirm is true', () => {
    it('should return true without prompting', async () => {
      const service = new ConfirmationService({ skipConfirm: true });
      const result = await service.confirmMutation('test-tool', 'test-target');
      expect(result).toBe(true);
    });
  });

  describe('when stdin is not a TTY', () => {
    it('should return false and log warning', async () => {
      const mockStdin = new PassThrough() as unknown as NodeJS.ReadStream;
      Object.defineProperty(mockStdin, 'isTTY', { value: false });
      
      const service = new ConfirmationService({
        stdin: mockStdin,
        stdout: new PassThrough() as unknown as NodeJS.WriteStream,
      });
      
      const result = await service.confirmMutation('test-tool', 'test-target');
      expect(result).toBe(false);
    });
  });

  describe('when stdin is a TTY', () => {
    let mockQuestion: jest.Mock;

    beforeEach(() => {
      mockQuestion = jest.fn((prompt, callback) => {
        callback('y');
      });
      (readline.createInterface as jest.Mock).mockReturnValue({
        question: mockQuestion,
        close: jest.fn(),
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return true when user answers y', async () => {
      const mockStdin = new PassThrough() as unknown as NodeJS.ReadStream;
      Object.defineProperty(mockStdin, 'isTTY', { value: true });
      const mockStdout = new PassThrough() as unknown as NodeJS.WriteStream;
      
      const service = new ConfirmationService({
        stdin: mockStdin,
        stdout: mockStdout,
      });
      
      const result = await service.confirmMutation('test-tool', 'test-target');
      expect(result).toBe(true);
      expect(mockQuestion).toHaveBeenCalled();
    });

    it('should return false when user answers n', async () => {
      mockQuestion.mockImplementation((prompt, callback) => {
        callback('n');
      });

      const mockStdin = new PassThrough() as unknown as NodeJS.ReadStream;
      Object.defineProperty(mockStdin, 'isTTY', { value: true });
      const mockStdout = new PassThrough() as unknown as NodeJS.WriteStream;
      
      const service = new ConfirmationService({
        stdin: mockStdin,
        stdout: mockStdout,
      });
      
      const result = await service.confirmMutation('test-tool', 'test-target');
      expect(result).toBe(false);
    });

    it('should return false when user answers anything other than y', async () => {
      mockQuestion.mockImplementation((prompt, callback) => {
        callback('no');
      });

      const mockStdin = new PassThrough() as unknown as NodeJS.ReadStream;
      Object.defineProperty(mockStdin, 'isTTY', { value: true });
      const mockStdout = new PassThrough() as unknown as NodeJS.WriteStream;
      
      const service = new ConfirmationService({
        stdin: mockStdin,
        stdout: mockStdout,
      });
      
      const result = await service.confirmMutation('test-tool', 'test-target');
      expect(result).toBe(false);
    });
  });

  describe('timeout configuration', () => {
    it('should use default timeout of 30 seconds', () => {
      const service = new ConfirmationService();
      expect(service['timeoutMs']).toBe(30000);
    });

    it('should use custom timeout when provided', () => {
      const service = new ConfirmationService({ timeoutMs: 60000 });
      expect(service['timeoutMs']).toBe(60000);
    });

    it('should timeout and return false when no answer within timeout', async () => {
      const mockStdin = new PassThrough() as unknown as NodeJS.ReadStream;
      Object.defineProperty(mockStdin, 'isTTY', { value: true });
      const mockStdout = new PassThrough() as unknown as NodeJS.WriteStream;
      
      const mockRl = {
        question: jest.fn(),
        close: jest.fn(),
      };
      (readline.createInterface as jest.Mock).mockReturnValue(mockRl);

      const service = new ConfirmationService({
        stdin: mockStdin,
        stdout: mockStdout,
        timeoutMs: 100,  // Very short timeout for testing
      });

      jest.useFakeTimers();

      const resultPromise = service.confirmMutation('test-tool', 'test-target');

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(100);

      const result = await resultPromise;
      expect(result).toBe(false);
      expect(mockRl.close).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
