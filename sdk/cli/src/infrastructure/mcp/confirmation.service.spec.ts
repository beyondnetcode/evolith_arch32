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
});
