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

  describe('createLogger', () => {
    it('should create logger via provider', () => {
      const logger = container.createLogger('TestContext');
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
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
  });

  describe('createChildContainer', () => {
    it('should inherit providers from parent', () => {
      const parent = getContainer();
      const child = createChildContainer();

      expect(child).toBeDefined();
      const logger = child.createLogger('child');
      expect(logger).toBeDefined();
    });
  });
});