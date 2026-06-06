export interface FileExistsOptions {
  cwd?: string;
}

export interface FileReadOptions {
  encoding?: BufferEncoding;
  cwd?: string;
}

export interface FileWriteOptions {
  encoding?: BufferEncoding;
  cwd?: string;
}

export interface DirEntry {
  name: string;
  isDirectory: () => boolean;
  isFile: () => boolean;
}

export interface IFileSystem {
  exists(path: string, options?: FileExistsOptions): Promise<boolean>;
  existsSync(path: string): boolean;
  readFile(path: string, options?: FileReadOptions): Promise<string>;
  readJson(path: string, options?: FileReadOptions): Promise<unknown>;
  writeFile(path: string, content: string, options?: FileWriteOptions): Promise<void>;
  writeJson(path: string, data: unknown, options?: FileWriteOptions): Promise<void>;
  readdir(path: string): Promise<DirEntry[]>;
  readdirNames(path: string): Promise<string[]>;
  remove(path: string): Promise<void>;
  ensureDir(path: string): Promise<void>;
  stat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }>;
}

export interface IConfigParser {
  parse(content: string): unknown;
  stringify(data: unknown): string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  timestamp: string;
}

export interface ILogger {
  debug(message: string, context?: string): void;
  info(message: string, context?: string): void;
  warn(message: string, context?: string): void;
  error(message: string, context?: string): void;
}

export interface ILoggerProvider {
  createLogger(context: string): ILogger;
}

export interface IFileSystemProvider {
  createFileSystem(): IFileSystem;
}

export interface IConfigParserProvider {
  createConfigParser(format: string): IConfigParser;
}

export const SUPPORTED_FORMATS = ['yaml', 'json'] as const;
export type SupportedFormat = typeof SUPPORTED_FORMATS[number];