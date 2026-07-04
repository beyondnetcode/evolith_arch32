import { Test, TestingModule } from '@nestjs/testing';
import { FileManagerService } from './file-manager.service';
import * as fs from 'fs-extra';

jest.mock('fs-extra');

describe('FileManagerService', () => {
  let service: FileManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileManagerService],
    }).compile();

    service = module.get<FileManagerService>(FileManagerService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return error if source does not exist', async () => {
    (fs.pathExists as jest.Mock).mockResolvedValueOnce(false);
    const result = await service.safeCopy('src', 'dest');
    expect(result.status).toBe('error');
    expect(result.message).toContain('Source file does not exist: src');
  });

  it('should skip if destination exists and contents are identical', async () => {
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    (fs.readFile as unknown as jest.Mock).mockResolvedValue('same content');

    const result = await service.safeCopy('src', 'dest');
    expect(result.status).toBe('skipped');
    expect(fs.copy).not.toHaveBeenCalled();
  });

  it('should return conflict if destination exists and contents differ', async () => {
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    (fs.readFile as unknown as jest.Mock)
      .mockResolvedValueOnce('source content')
      .mockResolvedValueOnce('dest content');

    const result = await service.safeCopy('src', 'dest', { overwrite: false });
    expect(result.status).toBe('conflict');
    expect(fs.copy).not.toHaveBeenCalled();
  });

  it('should copy if destination does not exist', async () => {
    (fs.pathExists as jest.Mock)
      .mockResolvedValueOnce(true) // source exists
      .mockResolvedValueOnce(false); // dest does not exist

    const result = await service.safeCopy('src', 'dest', { overwrite: true });
    expect(result.status).toBe('copied');
    expect(fs.copy).toHaveBeenCalledWith('src', 'dest', { overwrite: true });
  });

  it('should not copy if in dry-run mode', async () => {
    (fs.pathExists as jest.Mock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const result = await service.safeCopy('src', 'dest', { dryRun: true });
    expect(result.status).toBe('skipped');
    expect(fs.copy).not.toHaveBeenCalled();
  });
});
