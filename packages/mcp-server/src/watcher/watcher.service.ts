import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { IFileSystem } from '@evolith/core';
import { FILE_SYSTEM } from '../domain/domain.tokens';

export interface WatchEvent {
  path: string;
  type: 'changed' | 'added' | 'removed';
  timestamp: string;
}

export interface ILogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

@Injectable()
export class WatcherService implements OnModuleInit, OnModuleDestroy {
  private watchedPaths: Set<string> = new Set();
  private listeners: Array<(event: WatchEvent) => void> = [];
  private readonly logger: ILogger;

  constructor(
    @Inject(FILE_SYSTEM) private readonly fs: IFileSystem,
    logger?: ILogger,
  ) {
    this.logger = logger ?? (console as unknown as ILogger);
  }

  watch(filePath: string): void {
    this.watchedPaths.add(filePath);
    this.logger.info(`WatcherService: watching ${filePath}`);
  }

  unwatch(filePath: string): void {
    this.watchedPaths.delete(filePath);
  }

  onEvent(listener: (event: WatchEvent) => void): void {
    this.listeners.push(listener);
  }

  onModuleInit(): void {
    this.logger.info('WatcherService initialised');
  }

  onModuleDestroy(): void {
    this.watchedPaths.clear();
    this.listeners = [];
  }
}
