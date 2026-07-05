import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import {
  Deprecated,
  DeprecationInterceptor,
  __TEST__,
} from './deprecation.interceptor';

function makeCtx(headers: Record<string, string>, handler: object) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', url: '/api/v1/old', headers: {} }),
      getResponse: () => ({
        setHeader: (k: string, v: string) => {
          headers[k] = v;
        },
      }),
    }),
    getHandler: () => handler,
  } as unknown as ExecutionContext;
}

function noopHandler(): CallHandler {
  return { handle: () => of(null) } as CallHandler;
}

describe('DeprecationInterceptor', () => {
  const interceptor = new DeprecationInterceptor();

  it('does not set headers when the handler is not deprecated', async () => {
    const headers: Record<string, string> = {};
    class Ctrl {
      get() {}
    }
    const handler = Reflect.get(Ctrl.prototype, 'get') as object;
    await lastValueFrom(interceptor.intercept(makeCtx(headers, handler), noopHandler()));
    expect(headers).toEqual({});
  });

  it('sets Deprecation, Sunset, and Link headers on a deprecated handler', async () => {
    const headers: Record<string, string> = {};
    class Ctrl {
      @Deprecated({
        sunset: '2027-01-01T00:00:00Z',
        successor: '/api/v2/projects',
      })
      legacy() {}
    }
    const handler = Reflect.get(Ctrl.prototype, 'legacy') as object;
    await lastValueFrom(interceptor.intercept(makeCtx(headers, handler), noopHandler()));
    expect(headers['Deprecation']).toBe('true');
    expect(headers['Sunset']).toMatch(/GMT$/);
    expect(headers['Link']).toBe('</api/v2/projects>; rel="successor-version"');
  });

  it('omits Link when no successor is given', async () => {
    const headers: Record<string, string> = {};
    class Ctrl {
      @Deprecated({ sunset: '2027-01-01T00:00:00Z' })
      legacy() {}
    }
    const handler = Reflect.get(Ctrl.prototype, 'legacy') as object;
    await lastValueFrom(interceptor.intercept(makeCtx(headers, handler), noopHandler()));
    expect(headers['Link']).toBeUndefined();
  });

  it('preserves an explicit RFC 9745 deprecation timestamp', async () => {
    const headers: Record<string, string> = {};
    class Ctrl {
      @Deprecated({
        sunset: '2027-01-01T00:00:00Z',
        deprecation: '@1735689600',
      })
      legacy() {}
    }
    const handler = Reflect.get(Ctrl.prototype, 'legacy') as object;
    await lastValueFrom(interceptor.intercept(makeCtx(headers, handler), noopHandler()));
    expect(headers['Deprecation']).toBe('@1735689600');
  });

  it('toHttpDate leaves a properly formatted HTTP-date untouched', () => {
    const httpDate = 'Wed, 01 Jan 2027 00:00:00 GMT';
    expect(__TEST__.toHttpDate(httpDate)).toBe(httpDate);
  });
});
