import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import * as fs from 'fs-extra';

jest.mock('fs-extra');

describe('SyncService', () => {
  let service: SyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SyncService],
    }).compile();

    service = module.get<SyncService>(SyncService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should copy files that exist in the upstream repo', async () => {
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    
    await service.syncTemplatesFromUpstream();

    // 6 files expected based on implementation
    expect(fs.copy).toHaveBeenCalledTimes(6);
  });

  it('should not copy files if they do not exist upstream', async () => {
    (fs.pathExists as jest.Mock).mockResolvedValue(false);
    
    await service.syncTemplatesFromUpstream();

    expect(fs.copy).not.toHaveBeenCalled();
  });
});
