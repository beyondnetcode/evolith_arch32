export { StructuredLogger, logger, LogLevel } from './structured-logger';
export type { LogEntry, LogError, LoggerConfig } from './structured-logger';
export {
  Timed,
  TimedSync,
  measureTime,
  measureTimeSync,
  OperationTimer,
  profile,
} from './timing';
export type { TimingResult } from './timing';
export {
  ErrorReporter,
  errorReporter,
  withErrorReporting,
  OperationContext,
} from './error-reporter';
export type { ErrorReport, ErrorContext } from './error-reporter';
export { CommandWatcher, commandWatcher, CommandBuilder } from './command-watcher';
export type { CommandTrace } from './command-watcher';
export { ToolUsageTelemetry } from './tool-usage-telemetry.service';
export type { ToolUsageEvent, ToolUsageStats, TelemetryReport } from './tool-usage-telemetry.service';
export { initCliOtel, shutdownCliOtel, isOtelEnabled, cliTracer } from './otel-tracing';