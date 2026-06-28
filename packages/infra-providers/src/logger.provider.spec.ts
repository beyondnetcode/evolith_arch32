import {
  NestLoggerProvider,
  NoOpLoggerProvider,
  ConsoleLoggerProvider,
} from './logger.provider';

describe('NoOpLoggerProvider', () => {
  it('captures every level into the buffer and clears it', () => {
    const logger = new NoOpLoggerProvider().createLogger('ctx') as {
      debug: (m: string) => void;
      info: (m: string) => void;
      warn: (m: string) => void;
      error: (m: string) => void;
      getLogs: () => Array<{ level: string; message: string }>;
      clear: () => void;
    };

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    const logs = logger.getLogs();
    expect(logs.map((l) => l.level)).toEqual(['debug', 'info', 'warn', 'error']);
    expect(logs.map((l) => l.message)).toEqual(['d', 'i', 'w', 'e']);

    logger.clear();
    expect(logger.getLogs()).toEqual([]);
  });

  it('getLogs returns a defensive copy', () => {
    const logger = new NoOpLoggerProvider().createLogger('ctx') as {
      info: (m: string) => void;
      getLogs: () => unknown[];
    };
    logger.info('one');
    const snapshot = logger.getLogs();
    logger.info('two');
    expect(snapshot).toHaveLength(1);
  });
});

describe('ConsoleLoggerProvider', () => {
  const spies: jest.SpyInstance[] = [];

  afterEach(() => {
    spies.forEach((s) => s.mockRestore());
    spies.length = 0;
  });

  it('writes a formatted line to the matching console method per level', () => {
    const debug = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
    const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    spies.push(debug, info, warn, error);

    const logger = new ConsoleLoggerProvider().createLogger('MyCtx');
    logger.debug('hello');
    logger.info('hi');
    logger.warn('careful');
    logger.error('boom');

    expect(debug).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);

    const line = String(info.mock.calls[0][0]);
    expect(line).toContain('[INFO]');
    expect(line).toContain('[MyCtx]');
    expect(line).toContain('hi');
  });
});

describe('NestLoggerProvider', () => {
  it('forwards each level to the underlying Nest Logger instance', () => {
    const logger = new NestLoggerProvider().createLogger('NestCtx') as unknown as {
      logger: { debug: jest.Mock; log: jest.Mock; warn: jest.Mock; error: jest.Mock };
      debug: (m: string) => void;
      info: (m: string) => void;
      warn: (m: string) => void;
      error: (m: string) => void;
    };

    logger.logger.debug = jest.fn();
    logger.logger.log = jest.fn();
    logger.logger.warn = jest.fn();
    logger.logger.error = jest.fn();

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(logger.logger.debug).toHaveBeenCalledWith('d', undefined);
    expect(logger.logger.log).toHaveBeenCalledWith('i', undefined);
    expect(logger.logger.warn).toHaveBeenCalledWith('w', undefined);
    expect(logger.logger.error).toHaveBeenCalledWith('e', undefined);
  });
});
