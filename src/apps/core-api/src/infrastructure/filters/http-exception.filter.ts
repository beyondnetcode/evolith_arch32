import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
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
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
};

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
  for (const matcher of EXCEPTION_MATCHERS) {
    if (matcher.match(exception)) {
      return { status: matcher.getStatus(), title: matcher.getTitle(), domainCode: matcher.getDomainCode() };
    }
  }
  return { status: HttpStatus.INTERNAL_SERVER_ERROR, title: 'Internal Server Error', domainCode: 'INTERNAL_ERROR' };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
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
      detail = exception.message;
      const classified = classifyException(exception);
      status = classified.status;
      title = classified.title;
      domainCode = classified.domainCode || undefined;
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const correlationId = request.headers['x-correlation-id'] as string;

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

  private getTypeUri(status: number): string {
    const base = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/';
    return `${base}${status}`;
  }
}
