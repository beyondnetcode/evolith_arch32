export class EvolithError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'EvolithError';
  }
}

export class PlatformNotFoundError extends EvolithError {
  constructor(platform: string, hint?: string) {
    super(
      `${platform} not found in PATH`,
      'PLATFORM_NOT_FOUND',
      { platform, hint }
    );
  }
}

export class PhaseTransitionError extends EvolithError {
  constructor(from: string, to: string, reason: string) {
    super(
      `Cannot transition from ${from} to ${to}: ${reason}`,
      'PHASE_TRANSITION_ERROR',
      { from, to, reason }
    );
  }
}

export class CatalogLoadError extends EvolithError {
  constructor(catalog: string, cause: string) {
    super(
      `Failed to load catalog ${catalog}: ${cause}`,
      'CATALOG_LOAD_ERROR',
      { catalog }
    );
  }
}

export class ToolValidationError extends EvolithError {
  constructor(tool: string, reason: string) {
    super(
      `Tool ${tool} validation failed: ${reason}`,
      'TOOL_VALIDATION_ERROR',
      { tool }
    );
  }
}

export class CommandExecutionError extends EvolithError {
  constructor(command: string, exitCode: number, stderr: string) {
    super(
      `Command "${command}" failed with exit code ${exitCode}: ${stderr}`,
      'COMMAND_EXECUTION_ERROR',
      { command, exitCode, stderr }
    );
  }
}

export class ValidationError extends EvolithError {
  constructor(errors: string[]) {
    super(
      `Validation failed: ${errors.join(', ')}`,
      'VALIDATION_ERROR',
      { errors }
    );
  }
}

export function isEvolithError(error: unknown): error is EvolithError {
  return error instanceof EvolithError;
}

export function getErrorCode(error: unknown): string {
  if (isEvolithError(error)) {
    return error.code;
  }
  return 'UNKNOWN_ERROR';
}

export function getErrorContext(error: unknown): Record<string, unknown> | undefined {
  if (isEvolithError(error)) {
    return error.context;
  }
  return undefined;
}