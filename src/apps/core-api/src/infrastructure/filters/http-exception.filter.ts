import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  buildEnvelopeMeta,
  ErrorEnvelope,
} from '../interceptors/envelope.interceptor';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  traceId?: string;
  timestamp: string;
  errors?: unknown[];
}

/** Registry: HTTP status → code string (replaces switch statement). */
const STATUS_TO_CODE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: 'UNSUPPORTED_MEDIA_TYPE',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

/** Registry: HTTP status → human-readable title (replaces switch statement). */
const STATUS_TO_TITLE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'Payload Too Large',
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: 'Unsupported Media Type',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
};

/**
 * GT-715: what express's body parser throws. It is a plain `Error` decorated by
 * `http-errors` — `type` names the cause, `status` is the code the client
 * deserves, `expose` says the message is safe to return — and none of that is an
 * `HttpException`, so before this the filter classified it by message and
 * answered 500 "An unexpected error occurred". Measured with an inline
 * evaluation context of 126 KB against the 100 KB default: a masked 500, no log.
 */
interface BodyParserError extends Error {
  type?: string;
  status?: number;
  expose?: boolean;
  limit?: number;
  length?: number;
}

function isBodyParserError(e: Error): e is BodyParserError {
  const candidate = e as BodyParserError;
  return (
    typeof candidate.type === 'string' &&
    /^(entity|encoding|charset|request)\./.test(candidate.type) &&
    typeof candidate.status === 'number' &&
    candidate.status >= 400 &&
    candidate.status < 500
  );
}

/** The 413 says what was received and what the ceiling is; a bare "too large" sends the caller guessing. */
function describeBodyParserError(e: BodyParserError): string {
  if (e.type === 'entity.too.large') {
    const received = typeof e.length === 'number' ? `${e.length} bytes received` : 'request body';
    const ceiling = typeof e.limit === 'number' ? `${e.limit} bytes` : 'the configured ceiling';
    return `Request body too large: ${received}, the limit is ${ceiling} (EVOLITH_MAX_BODY_BYTES).`;
  }
  return e.message;
}

/**
 * Exception classifier — maps Error instances to HTTP status codes.
 * Uses a registry of matchers instead of if/else chains (OCP: new exception
 * types are added by registering a new matcher, not modifying this filter).
 */
interface ExceptionMatcher {
  match(exception: Error): boolean;
  getStatus(): number;
  getTitle(): string;
  getDomainCode(): string;
}

const EXCEPTION_MATCHERS: ExceptionMatcher[] = [
  {
    match: (e) => e.name === 'RulesetCorpusNotResolvedError',
    getStatus: () => HttpStatus.INTERNAL_SERVER_ERROR,
    getTitle: () => 'Ruleset Corpus Not Resolved',
    getDomainCode: () => 'INTERNAL_ERROR',
  },
  {
    match: (e) => e.name === 'RulesetsNotFoundError',
    getStatus: () => HttpStatus.UNPROCESSABLE_ENTITY,
    getTitle: () => 'Ruleset Not Found',
    getDomainCode: () => 'RULESET_NOT_FOUND',
  },
  {
    // GT-678: the satellite's `spec.rulesets.overrides` document is the
    // caller's input; one that is missing, malformed or off-schema is 422 with
    // SCHEMA_INVALID, the code the CLI (exit 3) and MCP report for it.
    match: (e) => e.name === 'RuleOverridesInvalidError',
    getStatus: () => HttpStatus.UNPROCESSABLE_ENTITY,
    getTitle: () => 'Rule Overrides Invalid',
    getDomainCode: () => 'SCHEMA_INVALID',
  },
  {
    match: (e) => e.message.includes('not found') || e.message.includes('does not exist'),
    getStatus: () => HttpStatus.NOT_FOUND,
    getTitle: () => 'Not Found',
    getDomainCode: () => '',
  },
  {
    match: (e) => e.message.includes('validation') || e.message.includes('invalid') || e.message.includes('required'),
    getStatus: () => HttpStatus.UNPROCESSABLE_ENTITY,
    getTitle: () => 'Unprocessable Entity',
    getDomainCode: () => '',
  },
];

function classifyException(exception: Error): { status: number; title: string; domainCode: string } {
  if (isBodyParserError(exception)) {
    // GT-715: checked BEFORE the registry — the parser already chose the status
    // (413, 400, 415…) and the message matchers below ("invalid", "required")
    // must never get a chance to reclassify a 413 into a 422.
    const status = exception.status as number;
    return {
      status,
      title: STATUS_TO_TITLE[status] ?? 'Bad Request',
      domainCode: STATUS_TO_CODE[status] ?? 'BAD_REQUEST',
    };
  }
  for (const matcher of EXCEPTION_MATCHERS) {
    if (matcher.match(exception)) {
      return { status: matcher.getStatus(), title: matcher.getTitle(), domainCode: matcher.getDomainCode() };
    }
  }
  return { status: HttpStatus.INTERNAL_SERVER_ERROR, title: 'Internal Server Error', domainCode: 'INTERNAL_ERROR' };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const startedAt =
      (request as Request & { __envelopeStartedAt?: number }).__envelopeStartedAt ??
      Date.now();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred';
    let errors: unknown[] | undefined;
    let domainCode: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      title = STATUS_TO_TITLE[status] || exception.message || title;

      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        detail = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, unknown>;
        detail = (res.message as string) || exception.message;
        if (Array.isArray(res.message)) {
          errors = res.message as unknown[];
          detail = 'Validation failed';
        }
      }
    } else if (exception instanceof Error) {
      detail = isBodyParserError(exception) ? describeBodyParserError(exception) : exception.message;
      const classified = classifyException(exception);
      status = classified.status;
      title = classified.title;
      domainCode = classified.domainCode || undefined;
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const correlationId = request.headers['x-correlation-id'] as string;

    this.logIfServerError(status, exception, request);

    const problem: ProblemDetails = {
      type: this.getTypeUri(status),
      title,
      status,
      detail: isProduction && status >= 500 ? 'An unexpected error occurred' : detail,
      instance: request.url,
      timestamp: new Date().toISOString(),
    };

    if (correlationId) {
      problem.traceId = correlationId;
    }

    if (errors) {
      problem.errors = errors;
    }

    const meta = buildEnvelopeMeta(request, startedAt);
    const envelope: ErrorEnvelope = {
      success: false,
      error: {
        code: domainCode ?? STATUS_TO_CODE[status] ?? 'INTERNAL_ERROR',
        message: problem.detail,
        details: problem as unknown as Record<string, unknown>,
      },
      meta,
    };

    response
      .status(status)
      .setHeader('Content-Type', 'application/json')
      .setHeader('X-Problem-Format', 'rfc9457')
      .json(envelope);
  }

  /**
   * GT-715: a 5xx the client sees as "An unexpected error occurred" must be
   * readable by the operator somewhere. The masking in `catch` is right for the
   * wire and was, until now, the only place the error went.
   */
  private logIfServerError(status: number, exception: unknown, request: Request): void {
    if (status < 500) return;
    const correlationId = request.headers['x-correlation-id'];
    const named = exception instanceof Error ? `${exception.name}: ${exception.message}` : String(exception);
    this.logger.error(
      `${request.method} ${request.url} -> ${status} ${named}${correlationId ? ` (correlationId ${String(correlationId)})` : ''}`,
      exception instanceof Error ? exception.stack : undefined,
    );
  }

  private getTypeUri(status: number): string {
    const base = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/';
    return `${base}${status}`;
  }
}
