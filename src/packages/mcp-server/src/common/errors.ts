/**
 * Códigos de error estandarizados para el MCP Gateway.
 * Basados en JSON-RPC + errores de dominio Evolith.
 * Append-only: renombrar o reusar un código es breaking change.
 */

export const ErrorCodes = {
  // Validación
  VALIDATION_FAILED: "VALIDATION_FAILED",
  SCHEMA_INVALID: "SCHEMA_INVALID",
  REPO_NOT_FOUND: "REPO_NOT_FOUND",
  PHASE_INVALID: "PHASE_INVALID",
  RULESET_NOT_FOUND: "RULESET_NOT_FOUND",
  NOT_A_SATELLITE: "NOT_A_SATELLITE",

  // Ejecución
  GATE_BLOCKED: "GATE_BLOCKED",
  COMMAND_FAILED: "COMMAND_FAILED",
  TIMEOUT: "TIMEOUT",

  // I/O
  IO_ERROR: "IO_ERROR",
  PATH_NOT_FOUND: "PATH_NOT_FOUND",
  GIT_ERROR: "GIT_ERROR",

  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Concurrencia (core/ADR-0093 §3) — el estado base declarado por el llamante
  // ya no coincide con HEAD del workspace, o el recurso está bloqueado. La
  // escritura se rechaza ANTES de aplicarse.
  CONCURRENCY_CONFLICT: "CONCURRENCY_CONFLICT",

  // Internos
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Error de dominio lanzado por servicios y capturado por el filtro global.
 */
export class DomainException extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(`[${code}] ${message}`);
    this.name = "DomainException";
    this.code = code;
    this.details = details;
  }
}
