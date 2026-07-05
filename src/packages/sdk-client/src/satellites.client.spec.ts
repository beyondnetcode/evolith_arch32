/**
 * SatellitesClient — unit tests
 *
 * Uses jest-mocked globalThis.fetch; never hits the network.
 * Covers: register, list, get, update, link — including error paths.
 */

import { SatellitesClient } from './satellites.client';
import type { SatelliteRecord, RegisterSatelliteInput } from './satellites.client';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SATELLITE: SatelliteRecord = {
  id: 'sat_001',
  name: 'my-service',
  owner: 'acme',
  repoUrl: 'https://github.com/acme/my-service',
  cloneUrl: 'https://github.com/acme/my-service.git',
  sshUrl: 'git@github.com:acme/my-service.git',
  topology: 'micro',
  phase: 'discovery',
  status: 'provisioning',
  mode: 'create',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

/** Build a mock global fetch that resolves with an ok JSON response. */
function mockFetch(data: unknown): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data, meta: {} }),
  });
}

/** Build a mock fetch that returns a non-ok response. */
function errorFetch(status: number): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ success: false, error: { code: 'ERR', message: 'fail' }, meta: {} }),
  });
}

/** Returns the [url, init] of the last fetch call. */
function lastCall(mock: jest.Mock): [string, RequestInit] {
  return mock.mock.calls[mock.mock.calls.length - 1] as [string, RequestInit];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function withFetch(mock: jest.Mock, fn: () => Promise<unknown>): Promise<unknown> {
  const original = globalThis.fetch;
  (globalThis as { fetch: typeof fetch }).fetch = mock as unknown as typeof fetch;
  return fn().finally(() => {
    (globalThis as { fetch: typeof fetch }).fetch = original;
  });
}

// ─── SatellitesClient ─────────────────────────────────────────────────────────

describe('SatellitesClient', () => {
  it('instantiates without throwing', () => {
    const client = new SatellitesClient('http://localhost:3000');
    expect(client).toBeInstanceOf(SatellitesClient);
  });

  it('strips a trailing slash from baseUrl', async () => {
    const mock = mockFetch({ satellites: [] });
    await withFetch(mock, () => {
      const client = new SatellitesClient('http://localhost:3000/');
      return client.list();
    });
    expect(lastCall(mock)[0]).toBe('http://localhost:3000/api/v1/satellites');
  });

  it('adds an Authorization header when apiKey is provided', async () => {
    const mock = mockFetch({ satellites: [] });
    await withFetch(mock, () => {
      const client = new SatellitesClient('http://localhost:3000', 'test-token');
      return client.list();
    });
    const headers = lastCall(mock)[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-token');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('omits the Authorization header when no apiKey is provided', async () => {
    const mock = mockFetch({ satellites: [] });
    await withFetch(mock, () => {
      const client = new SatellitesClient('http://localhost:3000');
      return client.list();
    });
    const headers = lastCall(mock)[1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  // ─── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    const INPUT: RegisterSatelliteInput = {
      name: 'my-service',
      owner: 'acme',
      topology: 'micro',
      phase: 'discovery',
      repoUrl: 'https://github.com/acme/my-service',
      cloneUrl: 'https://github.com/acme/my-service.git',
      sshUrl: 'git@github.com:acme/my-service.git',
    };

    it('POSTs to /api/v1/satellites and returns the satellite record', async () => {
      const mock = mockFetch({ satellite: SATELLITE });
      const result = await withFetch(mock, () => {
        const client = new SatellitesClient('http://localhost:3000');
        return client.register(INPUT);
      });

      const [url, init] = lastCall(mock);
      expect(url).toBe('http://localhost:3000/api/v1/satellites');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual(INPUT);
      expect(result).toEqual(SATELLITE);
    });

    it('throws when the server responds with a non-ok status', async () => {
      const mock = errorFetch(422);
      await expect(
        withFetch(mock, () => new SatellitesClient('http://localhost:3000').register(INPUT)),
      ).rejects.toThrow('Register satellite failed: 422');
    });
  });

  // ─── list ───────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('GETs /api/v1/satellites and returns the satellites array', async () => {
      const mock = mockFetch({ satellites: [SATELLITE] });
      const result = await withFetch(mock, () => {
        const client = new SatellitesClient('http://localhost:3000');
        return client.list();
      });

      const [url, init] = lastCall(mock);
      expect(url).toBe('http://localhost:3000/api/v1/satellites');
      expect(init.method).toBeUndefined(); // defaults to GET
      expect(result).toEqual([SATELLITE]);
    });

    it('throws when the server responds with a non-ok status', async () => {
      const mock = errorFetch(500);
      await expect(
        withFetch(mock, () => new SatellitesClient('http://localhost:3000').list()),
      ).rejects.toThrow('List satellites failed: 500');
    });
  });

  // ─── get ────────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('GETs /api/v1/satellites/:id with the encoded id and returns the satellite', async () => {
      const mock = mockFetch({ satellite: SATELLITE });
      const result = await withFetch(mock, () => {
        const client = new SatellitesClient('http://localhost:3000');
        return client.get('sat_001');
      });

      const [url] = lastCall(mock);
      expect(url).toBe('http://localhost:3000/api/v1/satellites/sat_001');
      expect(result).toEqual(SATELLITE);
    });

    it('encodes the satellite id in the URL', async () => {
      const mock = mockFetch({ satellite: SATELLITE });
      await withFetch(mock, () => {
        const client = new SatellitesClient('http://localhost:3000');
        return client.get('sat/with spaces');
      });
      expect(lastCall(mock)[0]).toBe('http://localhost:3000/api/v1/satellites/sat%2Fwith%20spaces');
    });

    it('returns null when the server responds with 404', async () => {
      const mock = jest.fn().mockResolvedValue({ ok: false, status: 404 });
      const result = await withFetch(mock, () => {
        const client = new SatellitesClient('http://localhost:3000');
        return client.get('sat_not_found');
      });
      expect(result).toBeNull();
    });

    it('throws on non-404 errors', async () => {
      const mock = errorFetch(503);
      await expect(
        withFetch(mock, () => new SatellitesClient('http://localhost:3000').get('sat_001')),
      ).rejects.toThrow('Get satellite failed: 503');
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('PATCHes /api/v1/satellites/:id and returns the updated satellite', async () => {
      const updated = { ...SATELLITE, status: 'active' as const };
      const mock = mockFetch({ satellite: updated });
      const result = await withFetch(mock, () => {
        const client = new SatellitesClient('http://localhost:3000');
        return client.update('sat_001', { status: 'active' });
      });

      const [url, init] = lastCall(mock);
      expect(url).toBe('http://localhost:3000/api/v1/satellites/sat_001');
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(init.body as string)).toEqual({ status: 'active' });
      expect((result as SatelliteRecord).status).toBe('active');
    });

    it('throws when the server responds with a non-ok status', async () => {
      const mock = errorFetch(400);
      await expect(
        withFetch(mock, () =>
          new SatellitesClient('http://localhost:3000').update('sat_001', { status: 'error' }),
        ),
      ).rejects.toThrow('Update satellite failed: 400');
    });
  });

  // ─── link ───────────────────────────────────────────────────────────────────

  describe('link', () => {
    it('POSTs to /api/v1/satellites/:id/link with targetSatelliteId in the body', async () => {
      const linked = { ...SATELLITE, status: 'linked' as const };
      const mock = mockFetch({ satellite: linked });
      const result = await withFetch(mock, () => {
        const client = new SatellitesClient('http://localhost:3000');
        return client.link('sat_001', 'sat_002');
      });

      const [url, init] = lastCall(mock);
      expect(url).toBe('http://localhost:3000/api/v1/satellites/sat_001/link');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({ targetSatelliteId: 'sat_002' });
      expect((result as SatelliteRecord).status).toBe('linked');
    });

    it('throws when the server responds with a non-ok status', async () => {
      const mock = errorFetch(409);
      await expect(
        withFetch(mock, () =>
          new SatellitesClient('http://localhost:3000').link('sat_001', 'sat_002'),
        ),
      ).rejects.toThrow('Link satellite failed: 409');
    });
  });
});
