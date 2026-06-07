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
  let watchMock: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [WatcherService],
    }).compile();

    service = module.get<WatcherService>(WatcherService);
    watchMock = {
      on: jest.fn().mockReturnThis(),
      close: jest.fn(),
    };
    (chokidar.watch as jest.Mock).mockReturnValue(watchMock);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startWatching', () => {
    it('should start watching the specified directory', () => {
      service.startWatching('/test/cwd');

      expect(chokidar.watch).toHaveBeenCalled();
    });

    it('should watch markdown files', () => {
      service.startWatching('/test/cwd');

      const callArgs = (chokidar.watch as jest.Mock).mock.calls[0];
      const patterns = callArgs[0];
      expect(patterns).toContain('**/*.md');
    });

    it('should watch package.json', () => {
      service.startWatching('/test/cwd');

      const callArgs = (chokidar.watch as jest.Mock).mock.calls[0];
      const patterns = callArgs[0];
      expect(patterns).toContain('package.json');
    });

    it('should watch evolith.setup.json', () => {
      service.startWatching('/test/cwd');

      const callArgs = (chokidar.watch as jest.Mock).mock.calls[0];
      const patterns = callArgs[0];
      expect(patterns).toContain('evolith.setup.json');
    });

    it('should use provided cwd in options', () => {
      service.startWatching('/custom/path');

      const callArgs = (chokidar.watch as jest.Mock).mock.calls[0];
      const options = callArgs[1];
      expect(options.cwd).toBe('/custom/path');
    });

    it('should use process.cwd() when no cwd is provided', () => {
      service.startWatching();

      const callArgs = (chokidar.watch as jest.Mock).mock.calls[0];
      const options = callArgs[1];
      expect(options.cwd).toBe(process.cwd());
    });

    it('should set persistent option to true', () => {
      service.startWatching('/test/cwd');

      const callArgs = (chokidar.watch as jest.Mock).mock.calls[0];
      const options = callArgs[1];
      expect(options.persistent).toBe(true);
    });

    it('should register change event handler', () => {
      service.startWatching('/test/cwd');

      expect(watchMock.on).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should register error event handler', () => {
      service.startWatching('/test/cwd');

      expect(watchMock.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should chain on calls', () => {
      service.startWatching('/test/cwd');

      expect(watchMock.on).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleFileChange', () => {
    it('should trigger change handler when file changes', () => {
      service.startWatching('/test/cwd');

      const changeHandler = watchMock.on.mock.calls.find(
        (call: any[]) => call[0] === 'change'
      )?.[1];

      expect(changeHandler).toBeDefined();
      changeHandler('test-file.md');
    });

    it('should log architecture file changes', () => {
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation(() => {});

      service.startWatching('/test/cwd');

      const changeHandler = watchMock.on.mock.calls.find(
        (call: any[]) => call[0] === 'change'
      )?.[1];

      changeHandler('architecture/pattern.md');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[IDE NOTIFY]')
      );

      logSpy.mockRestore();
    });

    it('should log docs file changes', () => {
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation(() => {});

      service.startWatching('/test/cwd');

      const changeHandler = watchMock.on.mock.calls.find(
        (call: any[]) => call[0] === 'change'
      )?.[1];

      changeHandler('docs/guide.md');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[IDE NOTIFY]')
      );

      logSpy.mockRestore();
    });

    it('should not notify for non-relevant files', () => {
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation(() => {});

      service.startWatching('/test/cwd');

      const changeHandler = watchMock.on.mock.calls.find(
        (call: any[]) => call[0] === 'change'
      )?.[1];

      changeHandler('src/index.ts');

      const notifyCalls = logSpy.mock.calls.filter(
        (call: any[]) => call[0]?.includes?.('[IDE NOTIFY]')
      );
      expect(notifyCalls).toHaveLength(0);

      logSpy.mockRestore();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close the watcher on module destroy', () => {
      service.startWatching('/test/cwd');
      service.onModuleDestroy();

      expect(watchMock.close).toHaveBeenCalled();
    });

    it('should not throw when watcher is not started', () => {
      expect(() => service.onModuleDestroy()).not.toThrow();
    });

    it('should log when watcher is stopped', () => {
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation(() => {});

      service.startWatching('/test/cwd');
      service.onModuleDestroy();

      expect(logSpy).toHaveBeenCalledWith('Watcher detenido.');

      logSpy.mockRestore();
    });
  });
});
