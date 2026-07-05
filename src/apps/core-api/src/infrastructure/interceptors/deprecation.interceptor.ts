import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Response } from 'express';

const DEPRECATION_META = Symbol.for('evolith.rest.deprecation');

export interface DeprecationOptions {
  /** Required: RFC 7231 HTTP-date or ISO 8601 date string for the Sunset header. */
  sunset: string;
  /** Optional: a successor route emitted as Link rel="successor-version". */
  successor?: string;
  /**
   * Optional: RFC 9745 deprecation timestamp. Defaults to `true`, meaning
   * "deprecated as of an unspecified date in the past".
   */
  deprecation?: string | true;
}

/**
 * Mark a route handler as deprecated. The {@link DeprecationInterceptor}
 * reads this metadata and emits RFC 8594 / RFC 9745 response headers.
 */
export const Deprecated = (options: DeprecationOptions): MethodDecorator =>
  (_target, _key, descriptor) => {
    Reflect.defineMetadata(DEPRECATION_META, options, descriptor.value as object);
  };

function toHttpDate(value: string): string {
  if (/GMT$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toUTCString();
}

@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();
    const meta = Reflect.getMetadata(DEPRECATION_META, handler) as
      | DeprecationOptions
      | undefined;

    if (meta) {
      const res = context.switchToHttp().getResponse<Response>();
      const deprecationValue =
        meta.deprecation === undefined ? 'true' : String(meta.deprecation);
      res.setHeader('Deprecation', deprecationValue);
      res.setHeader('Sunset', toHttpDate(meta.sunset));
      if (meta.successor) {
        res.setHeader('Link', `<${meta.successor}>; rel="successor-version"`);
      }
    }

    return next.handle().pipe(tap(() => undefined));
  }
}

export const __TEST__ = { DEPRECATION_META, toHttpDate };
