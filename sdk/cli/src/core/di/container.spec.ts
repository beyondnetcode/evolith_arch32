import { DIContainer, getContainer, resetContainer, createChildContainer } from './container';
import { ILoggerProvider, IFileSystemProvider, IConfigParserProvider, IFileSystem } from '../abstractions/interfaces';

const createMockFileSystem = (): IFileSystem => {
  const mock = (): any => mock;
  return {
    exists: mock() as any,
    existsSync: (): boolean => true,
    readFile: mock() as any,
    readJson: mock() as any,
    writeFile: mock() as any,
    writeJson: mock() as any,
    readdir: mock() as any,
    readdirNames: mock() as any,
    remove: mock() as any,
    ensureDir: mock() as any,
    stat: mock() as any,
  };
};

describe('DIContainer', () => {
  let container: DIContainer;

  beforeEach(() => {
    resetContainer();
    container = new DIContainer();
  });

  afterEach(() => {
    resetContainer();
  });

  describe('registerInstance', () => {
    it('should register and resolve instance', () => {
      const instance = { value: 'test' };
      container.registerInstance('test-service', instance);
      const resolved = container.resolve('test-service');
      expect(resolved).toBe(instance);
    });

    it('should throw when resolving unregistered service', () => {
      expect(() => container.resolve('non-existent')).toThrow('Service not registered');
    });

    it('should register instance with symbol identifier', () => {
      const symbolId = Symbol('test');
      const instance = { data: 'symbol-test' };
      container.registerInstance(symbolId, instance);

      expect(container.resolve(symbolId)).toBe(instance);
    });

    it('should register instance with class identifier', () => {
      class TestService {
        name = 'test';
      }
      const instance = new TestService();
      container.registerInstance(TestService, instance);

      expect(container.resolve(TestService)).toBe(instance);
    });

    it('should overwrite existing registration', () => {
      const instance1 = { value: 1 };
      const instance2 = { value: 2 };
      container.registerInstance('overwrite-test', instance1);
      container.registerInstance('overwrite-test', instance2);

      expect(container.resolve('overwrite-test')).toBe(instance2);
    });
  });

  describe('registerSingleton', () => {
    it('should create singleton via factory', () => {
      let callCount = 0;
      container.registerSingleton('counter', () => {
        callCount++;
        return { count: callCount };
      });

      const instance1 = container.resolve('counter');
      const instance2 = container.resolve('counter');

      expect(instance1).toBe(instance2);
      expect(callCount).toBe(1);
    });

    it('should cache singleton instance after first resolution', () => {
      const factory = jest.fn().mockReturnValue({ id: 1 });
      container.registerSingleton('cached', factory);

      container.resolve('cached');
      container.resolve('cached');
      container.resolve('cached');

      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe('registerTransient', () => {
    it('should create new instance each time', () => {
      let callCount = 0;
      container.registerTransient('transient-service', () => {
        callCount++;
        return { id: callCount };
      });

      const instance1 = container.resolve('transient-service');
      const instance2 = container.resolve('transient-service');

      expect(instance1).not.toBe(instance2);
      expect((instance1 as any).id).toBe(1);
      expect((instance2 as any).id).toBe(2);
      expect(callCount).toBe(2);
    });
  });

  describe('resolve', () => {
    it('should throw when registration has no instance or factory', () => {
      (container as any).registrations.set('broken', { scope: 'singleton' });

      expect(() => container.resolve('broken')).toThrow('Cannot resolve service');
    });

    it('should resolve singleton with factory on first call', () => {
      const instance = { name: 'factory-singleton' };
      container.registerSingleton('factory-singleton', () => instance);

      const resolved = container.resolve('factory-singleton');
      expect(resolved).toBe(instance);
    });

    it('should resolve transient with factory each call', () => {
      container.registerTransient('factory-transient', () => ({ name: 'transient' }));

      const resolved1 = container.resolve('factory-transient');
      const resolved2 = container.resolve('factory-transient');

      expect(resolved1).toEqual(resolved2);
      expect(resolved1).not.toBe(resolved2);
    });
  });

  describe('createLogger', () => {
    it('should create logger via provider', () => {
      const logger = container.createLogger('TestContext');
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should create different loggers for different contexts', () => {
      const logger1 = container.createLogger('Context1');
      const logger2 = container.createLogger('Context2');

      expect(logger1).toBeDefined();
      expect(logger2).toBeDefined();
    });
  });

  describe('createFileSystem', () => {
    it('should create file system via provider', () => {
      const fs = container.createFileSystem();
      expect(fs).toBeDefined();
      expect(typeof fs.exists).toBe('function');
    });
  });

  describe('createConfigParser', () => {
    it('should create config parser for yaml', () => {
      const parser = container.createConfigParser('yaml');
      expect(parser).toBeDefined();
      expect(typeof parser.parse).toBe('function');
    });

    it('should create config parser for json', () => {
      const parser = container.createConfigParser('json');
      expect(parser).toBeDefined();
      expect(typeof parser.parse).toBe('function');
    });

    it('should default to yaml when no format specified', () => {
      const parser = container.createConfigParser();
      expect(parser).toBeDefined();
    });

    it('should use config parser provider cache', () => {
      const mockProvider: IConfigParserProvider = {
        createConfigParser: jest.fn().mockReturnValue({
          parse: jest.fn(),
          stringify: jest.fn(),
        }),
      };

      container.setConfigParserProvider('yaml', mockProvider);
      container.createConfigParser('yaml');

      expect(mockProvider.createConfigParser).toHaveBeenCalledWith('yaml');
    });
  });

  describe('setLoggerProvider', () => {
    it('should replace logger provider', () => {
      const mockProvider: ILoggerProvider = {
        createLogger: (context: string) => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
      };

      container.setLoggerProvider(mockProvider);
      const logger = container.createLogger('new-context');
      expect(logger).toBeDefined();
    });

    it('should use new provider for subsequent logger creation', () => {
      const createLoggerFn = jest.fn().mockReturnValue({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      });

      const mockProvider: ILoggerProvider = {
        createLogger: createLoggerFn,
      };

      container.setLoggerProvider(mockProvider);
      container.createLogger('test');

      expect(createLoggerFn).toHaveBeenCalledWith('test');
    });
  });

  describe('setFileSystemProvider', () => {
    it('should replace file system provider', () => {
      const mockProvider: IFileSystemProvider = {
        createFileSystem: () => createMockFileSystem(),
      };

      container.setFileSystemProvider(mockProvider);
      const fs = container.createFileSystem();
      expect(fs).toBeDefined();
    });

    it('should use new provider for subsequent file system creation', () => {
      const mockFs = createMockFileSystem();
      const createFileSystemFn = jest.fn().mockReturnValue(mockFs);

      const mockProvider: IFileSystemProvider = {
        createFileSystem: createFileSystemFn,
      };

      container.setFileSystemProvider(mockProvider);
      const fs = container.createFileSystem();

      expect(createFileSystemFn).toHaveBeenCalled();
      expect(fs).toBe(mockFs);
    });
  });

  describe('setConfigParserProvider', () => {
    it('should register config parser provider', () => {
      const mockProvider: IConfigParserProvider = {
        createConfigParser: jest.fn().mockReturnValue({
          parse: jest.fn(),
          stringify: jest.fn(),
        }),
      };

      container.setConfigParserProvider('json', mockProvider);
      const parser = container.createConfigParser('json');

      expect(parser).toBeDefined();
    });

    it('should register provider for both cache and resolution', () => {
      const mockProvider: IConfigParserProvider = {
        createConfigParser: jest.fn().mockReturnValue({
          parse: jest.fn(),
          stringify: jest.fn(),
        }),
      };

      container.setConfigParserProvider('yaml', mockProvider);

      const resolved = container.resolve<IConfigParserProvider>('yaml');
      expect(resolved).toBe(mockProvider);
    });
  });

  describe('default providers', () => {
    it('should have ILoggerProvider registered by default', () => {
      const provider = container.resolve<ILoggerProvider>('ILoggerProvider');
      expect(provider).toBeDefined();
      expect(typeof provider.createLogger).toBe('function');
    });

    it('should have IFileSystemProvider registered by default', () => {
      const provider = container.resolve<IFileSystemProvider>('IFileSystemProvider');
      expect(provider).toBeDefined();
      expect(typeof provider.createFileSystem).toBe('function');
    });

    it('should have yaml config parser registered by default', () => {
      const provider = container.resolve<IConfigParserProvider>('yaml');
      expect(provider).toBeDefined();
      expect(typeof provider.createConfigParser).toBe('function');
    });

    it('should have json config parser registered by default', () => {
      const provider = container.resolve<IConfigParserProvider>('json');
      expect(provider).toBeDefined();
      expect(typeof provider.createConfigParser).toBe('function');
    });
  });

  describe('global container', () => {
    it('should return same instance with getContainer', () => {
      const container1 = getContainer();
      const container2 = getContainer();
      expect(container1).toBe(container2);
    });

    it('should reset container with resetContainer', () => {
      const container1 = getContainer();
      resetContainer();
      const container2 = getContainer();
      expect(container1).not.toBe(container2);
    });

    it('should create new container after reset', () => {
      const container1 = getContainer();
      resetContainer();
      const container2 = getContainer();

      expect(container2).toBeInstanceOf(DIContainer);
    });
  });

  describe('createChildContainer', () => {
    it('should inherit providers from parent', () => {
      const parent = getContainer();
      const child = createChildContainer();

      expect(child).toBeDefined();
      const logger = child.createLogger('child');
      expect(logger).toBeDefined();
    });

    it('should create independent child container', () => {
      const parent = getContainer();
      const child = createChildContainer();

      expect(child).not.toBe(parent);
    });

    it('should inherit file system provider', () => {
      const child = createChildContainer();

      const fs = child.createFileSystem();
      expect(fs).toBeDefined();
    });

    it('should have default providers initialized', () => {
      const child = createChildContainer();

      expect(() => child.createLogger('test')).not.toThrow();
      expect(() => child.createFileSystem()).not.toThrow();
      expect(() => child.createConfigParser('yaml')).not.toThrow();
    });
  });
});
