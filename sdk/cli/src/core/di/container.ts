import {
  IFileSystem,
  IConfigParser,
  ILogger,
  ILoggerProvider,
  IFileSystemProvider,
  IConfigParserProvider,
  SUPPORTED_FORMATS,
  SupportedFormat,
} from '../abstractions/interfaces';
import { NodeFileSystemProvider } from '../abstractions/providers/node-filesystem.provider';
import { YamlConfigParserProvider, JsonConfigParserProvider } from '../abstractions/providers/config-parser.provider';
import { NestLoggerProvider } from '../abstractions/providers/logger.provider';

export type ServiceIdentifier = string | symbol | { new(...args: unknown[]): unknown };

interface Registration<T = unknown> {
  instance?: T;
  factory?: () => T;
  scope: 'singleton' | 'transient';
}

export class DIContainer {
  private registrations: Map<ServiceIdentifier, Registration> = new Map();
  private loggerProvider: ILoggerProvider;
  private fileSystemProvider: IFileSystemProvider;
  private configParserProviders: Map<SupportedFormat, IConfigParserProvider> = new Map();

  constructor() {
    this.registerDefaultProviders();
  }

  private registerDefaultProviders(): void {
    this.registerInstance<ILoggerProvider>('ILoggerProvider', new NestLoggerProvider());
    this.registerInstance<IFileSystemProvider>('IFileSystemProvider', new NodeFileSystemProvider());
    this.registerInstance<IConfigParserProvider>('yaml', new YamlConfigParserProvider());
    this.registerInstance<IConfigParserProvider>('json', new JsonConfigParserProvider());
  }

  registerInstance<T>(id: ServiceIdentifier, instance: T): void {
    this.registrations.set(id, { instance, scope: 'singleton' });
  }

  registerSingleton<T>(id: ServiceIdentifier, factory: () => T): void {
    this.registrations.set(id, { factory, scope: 'singleton' });
  }

  registerTransient<T>(id: ServiceIdentifier, factory: () => T): void {
    this.registrations.set(id, { factory, scope: 'transient' });
  }

  resolve<T>(id: ServiceIdentifier): T {
    const registration = this.registrations.get(id);

    if (!registration) {
      throw new Error(`Service not registered: ${String(id)}`);
    }

    if (registration.scope === 'singleton' && registration.instance) {
      return registration.instance as T;
    }

    if (registration.factory) {
      const instance = registration.factory();

      if (registration.scope === 'singleton') {
        registration.instance = instance;
      }

      return instance as T;
    }

    throw new Error(`Cannot resolve service: ${String(id)}`);
  }

  createLogger(context: string): ILogger {
    return this.resolve<ILoggerProvider>('ILoggerProvider').createLogger(context);
  }

  createFileSystem(): IFileSystem {
    return this.resolve<IFileSystemProvider>('IFileSystemProvider').createFileSystem();
  }

  createConfigParser(format: SupportedFormat = 'yaml'): IConfigParser {
    const provider = this.configParserProviders.get(format) ||
      this.resolve<IConfigParserProvider>(format);
    return provider.createConfigParser(format);
  }

  setLoggerProvider(provider: ILoggerProvider): void {
    this.registerInstance<ILoggerProvider>('ILoggerProvider', provider);
  }

  setFileSystemProvider(provider: IFileSystemProvider): void {
    this.registerInstance<IFileSystemProvider>('IFileSystemProvider', provider);
  }

  setConfigParserProvider(format: SupportedFormat, provider: IConfigParserProvider): void {
    this.configParserProviders.set(format, provider);
    this.registerInstance<IConfigParserProvider>(format, provider);
  }
}

let globalContainer: DIContainer | null = null;

export function getContainer(): DIContainer {
  if (!globalContainer) {
    globalContainer = new DIContainer();
  }
  return globalContainer;
}

export function resetContainer(): void {
  globalContainer = null;
}

export function createChildContainer(): DIContainer {
  const child = new DIContainer();
  child.setLoggerProvider(getContainer().resolve<ILoggerProvider>('ILoggerProvider'));
  child.setFileSystemProvider(getContainer().resolve<IFileSystemProvider>('IFileSystemProvider'));
  return child;
}