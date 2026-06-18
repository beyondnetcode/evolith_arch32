import { Test } from '@nestjs/testing';
import { ConfirmationService } from '../src/infrastructure/mcp/confirmation.service';
import { PassThrough } from 'node:stream';

describe('ConfirmationService E2E', () => {
  describe('Human-in-the-Loop for Mutative MCP Tools', () => {
    it('should block mutative operation when user denies confirmation', async () => {
      const mockStdin = new PassThrough() as unknown as NodeJS.ReadStream;
      Object.defineProperty(mockStdin, 'isTTY', { value: true });
      const mockStdout = new PassThrough() as unknown as NodeJS.WriteStream;
      
      const service = new ConfirmationService({
        stdin: mockStdin,
        stdout: mockStdout,
      });
      
      const resultPromise = service.confirmMutation('evolith-write', '/path/to/file.ts');
      mockStdin.write('n\n');
      
      const result = await resultPromise;
      expect(result).toBe(false);
    });

    it('should allow mutative operation when user confirms', async () => {
      const mockStdin = new PassThrough() as unknown as NodeJS.ReadStream;
      Object.defineProperty(mockStdin, 'isTTY', { value: true });
      const mockStdout = new PassThrough() as unknown as NodeJS.WriteStream;
      
      const service = new ConfirmationService({
        stdin: mockStdin,
        stdout: mockStdout,
      });
      
      const resultPromise = service.confirmMutation('evolith-write', '/path/to/file.ts');
      mockStdin.write('y\n');
      
      const result = await resultPromise;
      expect(result).toBe(true);
    });

    it('should skip confirmation when skipConfirm is true', async () => {
      const mockStdin = new PassThrough() as unknown as NodeJS.ReadStream;
      const mockStdout = new PassThrough() as unknown as NodeJS.WriteStream;
      
      const service = new ConfirmationService({
        skipConfirm: true,
        stdin: mockStdin,
        stdout: mockStdout,
      });
      
      const result = await service.confirmMutation('evolith-write', '/path/to/file.ts');
      expect(result).toBe(true);
    });

    it('should return false when stdin is not a TTY (CI mode)', async () => {
      const mockStdin = new PassThrough() as unknown as NodeJS.ReadStream;
      Object.defineProperty(mockStdin, 'isTTY', { value: false });
      const mockStdout = new PassThrough() as unknown as NodeJS.WriteStream;
      
      const service = new ConfirmationService({
        stdin: mockStdin,
        stdout: mockStdout,
      });
      
      const result = await service.confirmMutation('evolith-write', '/path/to/file.ts');
      expect(result).toBe(false);
    });
  });
});
