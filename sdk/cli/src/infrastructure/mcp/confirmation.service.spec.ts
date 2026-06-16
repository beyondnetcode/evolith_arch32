import { ConfirmationService } from './confirmation.service';
import { PassThrough } from 'node:stream';

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
    it('should return true when user answers y', async () => {
      const mockStdin = new PassThrough() as unknown as NodeJS.ReadStream;
      Object.defineProperty(mockStdin, 'isTTY', { value: true });
      const mockStdout = new PassThrough() as unknown as NodeJS.WriteStream;
      
      const service = new ConfirmationService({
        stdin: mockStdin,
        stdout: mockStdout,
      });
      
      mockStdin.emit('data', 'y\n');
      
      const result = await service.confirmMutation('test-tool', 'test-target');
      expect(result).toBe(true);
    });

    it('should return false when user answers n', async () => {
      const mockStdin = new PassThrough() as unknown as NodeJS.ReadStream;
      Object.defineProperty(mockStdin, 'isTTY', { value: true });
      const mockStdout = new PassThrough() as unknown as NodeJS.WriteStream;
      
      const service = new ConfirmationService({
        stdin: mockStdin,
        stdout: mockStdout,
      });
      
      mockStdin.emit('data', 'n\n');
      
      const result = await service.confirmMutation('test-tool', 'test-target');
      expect(result).toBe(false);
    });

    it('should return false when user answers anything other than y', async () => {
      const mockStdin = new PassThrough() as unknown as NodeJS.ReadStream;
      Object.defineProperty(mockStdin, 'isTTY', { value: true });
      const mockStdout = new PassThrough() as unknown as NodeJS.WriteStream;
      
      const service = new ConfirmationService({
        stdin: mockStdin,
        stdout: mockStdout,
      });
      
      mockStdin.emit('data', 'no\n');
      
      const result = await service.confirmMutation('test-tool', 'test-target');
      expect(result).toBe(false);
    });
  });
});
