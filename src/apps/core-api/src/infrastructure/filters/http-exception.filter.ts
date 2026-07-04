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

const STATUS_TO_CODE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

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

    if (exception instanceof HttpException) {
      status = exception.getStatus();
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

      switch (status) {
        case HttpStatus.BAD_REQUEST: title = 'Bad Request'; break;
        case HttpStatus.UNAUTHORIZED: title = 'Unauthorized'; break;
        case HttpStatus.FORBIDDEN: title = 'Forbidden'; break;
        case HttpStatus.NOT_FOUND: title = 'Not Found'; break;
        case HttpStatus.UNPROCESSABLE_ENTITY: title = 'Unprocessable Entity'; break;
        case HttpStatus.TOO_MANY_REQUESTS: title = 'Too Many Requests'; break;
        default: title = exception.message || title;
      }
    } else if (exception instanceof Error) {
      detail = exception.message;

      if (detail.includes('not found') || detail.includes('does not exist')) {
        status = HttpStatus.NOT_FOUND;
        title = 'Not Found';
      } else if (detail.includes('validation') || detail.includes('invalid') || detail.includes('required')) {
        status = HttpStatus.UNPROCESSABLE_ENTITY;
        title = 'Unprocessable Entity';
      }
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
        code: STATUS_TO_CODE[status] ?? 'INTERNAL_ERROR',
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
