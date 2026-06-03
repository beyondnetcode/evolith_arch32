import { Test, TestingModule } from '@nestjs/testing';
import { WatcherService } from './watcher.service';
import * as chokidar from 'chokidar';

jest.mock('chokidar', () => {
  const watcherMock = {
    on: jest.fn().mockReturnThis(),
    close: jest.fn(),
  };
  return {
    watch: jest.fn(() => watcherMock),
  };
});

describe('WatcherService', () => {
  let service: WatcherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WatcherService],
    }).compile();

    service = module.get<WatcherService>(WatcherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should start watching the specified directory', () => {
    service.startWatching('/test/cwd');
    expect(chokidar.watch).toHaveBeenCalled();
  });

  it('should close the watcher on module destroy', () => {
    service.startWatching('/test/cwd');
    service.onModuleDestroy();
    
    // We need to get the mocked instance returned by chokidar.watch
    const watchMock = (chokidar.watch as jest.Mock).mock.results[0].value;
    expect(watchMock.close).toHaveBeenCalled();
  });
});
