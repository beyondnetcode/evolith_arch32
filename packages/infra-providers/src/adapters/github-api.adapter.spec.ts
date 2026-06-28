import { GitHubApiAdapter } from './github-api.adapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  const headersInit = new Headers(headers);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headersInit,
    json: async () => body,
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GitHubApiAdapter (GT-363)', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // -------------------------------------------------------------------------
  // validateToken
  // -------------------------------------------------------------------------

  describe('validateToken()', () => {
    it('returns login, scopes and rate limit from response headers', async () => {
      fetchMock.mockResolvedValueOnce(
        makeResponse(
          200,
          { login: 'octocat' },
          {
            'x-oauth-scopes': 'repo, gist',
            'x-ratelimit-remaining': '4999',
            'x-ratelimit-limit': '5000',
          },
        ),
      );

      const adapter = new GitHubApiAdapter('ghp_test_token');
      const info = await adapter.validateToken();

      expect(info.login).toBe('octocat');
      expect(info.scopes).toEqual(['repo', 'gist']);
      expect(info.rateLimit).toEqual({ remaining: 4999, limit: 5000 });

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.github.com/user');
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer ghp_test_token');
      expect((init.headers as Record<string, string>)['Accept']).toBe('application/vnd.github.v3+json');
    });

    it('handles empty x-oauth-scopes header gracefully', async () => {
      fetchMock.mockResolvedValueOnce(
        makeResponse(200, { login: 'octocat' }, {}),
      );

      const adapter = new GitHubApiAdapter('ghp_test_token');
      const info = await adapter.validateToken();

      expect(info.scopes).toEqual([]);
    });

    it('throws when the API returns a non-2xx status', async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(401, { message: 'Bad credentials' }));

      const adapter = new GitHubApiAdapter('bad_token');
      await expect(adapter.validateToken()).rejects.toThrow(/status 401/);
    });
  });

  // -------------------------------------------------------------------------
  // createRepository
  // -------------------------------------------------------------------------

  describe('createRepository()', () => {
    const rawRepo = {
      id: 1,
      name: 'my-repo',
      full_name: 'octocat/my-repo',
      clone_url: 'https://github.com/octocat/my-repo.git',
      ssh_url: 'git@github.com:octocat/my-repo.git',
      html_url: 'https://github.com/octocat/my-repo',
      private: false,
      default_branch: 'main',
      topics: ['nodejs'],
    };

    it('creates a repo under /orgs/{owner}/repos when owner provided', async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(201, rawRepo));

      const adapter = new GitHubApiAdapter('ghp_test_token');
      const repo = await adapter.createRepository({
        owner: 'octocat',
        name: 'my-repo',
        description: 'A test repo',
        private: false,
        autoInit: true,
      });

      expect(repo.id).toBe(1);
      expect(repo.name).toBe('my-repo');
      expect(repo.fullName).toBe('octocat/my-repo');
      expect(repo.cloneUrl).toBe('https://github.com/octocat/my-repo.git');
      expect(repo.sshUrl).toBe('git@github.com:octocat/my-repo.git');
      expect(repo.htmlUrl).toBe('https://github.com/octocat/my-repo');
      expect(repo.private).toBe(false);
      expect(repo.defaultBranch).toBe('main');
      expect(repo.topics).toEqual(['nodejs']);

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/orgs/octocat/repos');
    });

    it('throws on API error', async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(422, { message: 'name already exists' }));

      const adapter = new GitHubApiAdapter('ghp_test_token');
      await expect(
        adapter.createRepository({ owner: 'octocat', name: 'my-repo' }),
      ).rejects.toThrow(/status 422/);
    });
  });

  // -------------------------------------------------------------------------
  // getRepository
  // -------------------------------------------------------------------------

  describe('getRepository()', () => {
    const rawRepo = {
      id: 42,
      name: 'existing-repo',
      full_name: 'octocat/existing-repo',
      clone_url: 'https://github.com/octocat/existing-repo.git',
      ssh_url: 'git@github.com:octocat/existing-repo.git',
      html_url: 'https://github.com/octocat/existing-repo',
      private: true,
      default_branch: 'main',
      topics: [],
    };

    it('returns a mapped GitHubRepo when the repo exists (200)', async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(200, rawRepo));

      const adapter = new GitHubApiAdapter('ghp_test_token');
      const repo = await adapter.getRepository('octocat', 'existing-repo');

      expect(repo).not.toBeNull();
      expect(repo!.id).toBe(42);
      expect(repo!.name).toBe('existing-repo');
      expect(repo!.private).toBe(true);
      expect(repo!.topics).toEqual([]);

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.github.com/repos/octocat/existing-repo');
    });

    it('returns null when the repo does not exist (404)', async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(404, { message: 'Not Found' }));

      const adapter = new GitHubApiAdapter('ghp_test_token');
      const repo = await adapter.getRepository('octocat', 'ghost-repo');

      expect(repo).toBeNull();
    });

    it('re-throws non-404 errors', async () => {
      fetchMock.mockResolvedValueOnce(makeResponse(500, { message: 'Internal Server Error' }));

      const adapter = new GitHubApiAdapter('ghp_test_token');
      await expect(adapter.getRepository('octocat', 'some-repo')).rejects.toThrow(/status 500/);
    });
  });
});
