import { Test, TestingModule } from '@nestjs/testing';
import { FileManagerService } from './file-manager.service';
import * as fs from 'fs-extra';
import * as p from '@clack/prompts';

jest.mock('fs-extra');
jest.mock('@clack/prompts');

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

  it('should return false if source does not exist', async () => {
    (fs.pathExists as jest.Mock).mockResolvedValueOnce(false);
    const result = await service.safeCopy('src', 'dest');
    expect(result).toBe(false);
  });

  it('should skip if destination exists and contents are identical', async () => {
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    (fs.readFile as unknown as jest.Mock).mockResolvedValue('same content');

    const result = await service.safeCopy('src', 'dest');
    expect(result).toBe(true);
    expect(fs.copy).not.toHaveBeenCalled();
  });

  it('should ask for confirmation if destination exists and contents differ (not dry-run)', async () => {
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    (fs.readFile as unknown as jest.Mock)
      .mockResolvedValueOnce('source content')
      .mockResolvedValueOnce('dest content');
    
    // User declines overwrite
    (p.confirm as jest.Mock).mockResolvedValueOnce(false);

    const result = await service.safeCopy('src', 'dest', false);
    expect(result).toBe(false);
    expect(fs.copy).not.toHaveBeenCalled();
  });

  it('should overwrite if user confirms', async () => {
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    (fs.readFile as unknown as jest.Mock)
      .mockResolvedValueOnce('source content')
      .mockResolvedValueOnce('dest content');
    
    // User accepts overwrite
    (p.confirm as jest.Mock).mockResolvedValueOnce(true);

    const result = await service.safeCopy('src', 'dest', false);
    expect(result).toBe(true);
    expect(fs.copy).toHaveBeenCalledWith('src', 'dest', { overwrite: true });
  });

  it('should copy if destination does not exist', async () => {
    (fs.pathExists as jest.Mock)
      .mockResolvedValueOnce(true) // source exists
      .mockResolvedValueOnce(false); // dest does not exist

    const result = await service.safeCopy('src', 'dest', false);
    expect(result).toBe(true);
    expect(fs.copy).toHaveBeenCalledWith('src', 'dest', { overwrite: true });
  });

  it('should not copy if in dry-run mode', async () => {
    (fs.pathExists as jest.Mock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const result = await service.safeCopy('src', 'dest', true);
    expect(result).toBe(true);
    expect(fs.copy).not.toHaveBeenCalled();
  });
});
