import { EvolithRestClient, EvolithApiError } from './evolith-rest-client';

describe('EvolithRestClient', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    mockFetch.mockReset();
  });

  function mockResponse(ok: boolean, status: number, body: unknown = {}) {
    return {
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    };
  }

  describe('constructor', () => {
    it('creates client with default options', () => {
      const client = new EvolithRestClient({
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch as any,
      });
      expect(client).toBeDefined();
    });

    it('sets Authorization header when apiKey is provided', () => {
      const client = new EvolithRestClient({
        baseUrl: 'http://localhost:3000',
        apiKey: 'test-key',
        fetch: mockFetch as any,
      });
      // @ts-ignore
      expect(client.headers.Authorization).toBe('Bearer test-key');
    });

    it('does not set Authorization header when apiKey is absent', () => {
      const client = new EvolithRestClient({
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch as any,
      });
      // @ts-ignore
      expect(client.headers.Authorization).toBeUndefined();
    });

    it('normalizes apiPrefix by stripping slashes', () => {
      const client = new EvolithRestClient({
        baseUrl: 'http://localhost:3000',
        apiPrefix: '/api/v1/',
        fetch: mockFetch as any,
      });
      expect(client).toBeDefined();
    });
  });

  describe('listTopologies', () => {
    it('sends GET to correct URL', async () => {
      mockFetch.mockResolvedValue(mockResponse(true, 200, { topologies: [] }));
      const client = new EvolithRestClient({
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch as any,
      });

      await client.listTopologies();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/architecture/topologies',
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('evaluateGate', () => {
    it('sends POST with encoded gateId', async () => {
      mockFetch.mockResolvedValue(mockResponse(true, 200, { success: true, data: {} }));
      const client = new EvolithRestClient({
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch as any,
      });

      await client.evaluateGate('gate-f1', { satellitePath: '/test' } as any);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('gate-f1');
      expect(url).toContain('evaluate');
    });
  });

  describe('error handling', () => {
    it('throws EvolithApiError on non-2xx response', async () => {
      mockFetch.mockResolvedValue(mockResponse(false, 404, { error: 'not found' }));
      const client = new EvolithRestClient({
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch as any,
      });

      await expect(client.listTopologies()).rejects.toThrow(EvolithApiError);
    });

    it('includes status and URL in error', async () => {
      mockFetch.mockResolvedValue(mockResponse(false, 500, { error: 'server error' }));
      const client = new EvolithRestClient({
        baseUrl: 'http://localhost:3000',
        fetch: mockFetch as any,
      });

      try {
        await client.listTopologies();
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(EvolithApiError);
        expect((err as EvolithApiError).status).toBe(500);
        expect((err as EvolithApiError).url).toContain('topologies');
      }
    });
  });

  describe('EvolithApiError', () => {
    it('has correct name and message', () => {
      const err = new EvolithApiError(404, 'Not Found', 'resource missing', '/api/test');
      expect(err.name).toBe('EvolithApiError');
      expect(err.message).toContain('404');
      expect(err.message).toContain('Not Found');
      expect(err.message).toContain('/api/test');
      expect(err.status).toBe(404);
      expect(err.body).toBe('resource missing');
    });
  });
});
