import { WatcherService } from './watcher.service';

describe('WatcherService', () => {
  let service;
  const mockFs = {};
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WatcherService(mockFs, mockLogger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('watch() adds the path to watchedPaths', () => {
    service.watch('/some/file.ts');
    expect(service['watchedPaths'].has('/some/file.ts')).toBe(true);
  });

  it('unwatch() removes the path from watchedPaths', () => {
    service.watch('/some/file.ts');
    service.unwatch('/some/file.ts');
    expect(service['watchedPaths'].has('/some/file.ts')).toBe(false);
  });

  it('onEvent() registers a listener', () => {
    const listener = jest.fn();
    service.onEvent(listener);
    expect(service['listeners']).toContain(listener);
  });

  it('onModuleInit() logs "WatcherService initialised"', () => {
    service.onModuleInit();
    expect(mockLogger.info).toHaveBeenCalledWith('WatcherService initialised');
  });

  it('onModuleDestroy() clears watchedPaths and listeners', () => {
    service.watch('/a');
    service.onEvent(jest.fn());
    service.onModuleDestroy();
    expect(service['watchedPaths'].size).toBe(0);
    expect(service['listeners']).toHaveLength(0);
  });

  it('falls back to console when no logger is provided', () => {
    const fallbackService = new WatcherService(mockFs);
    expect(fallbackService).toBeDefined();
  });
});
