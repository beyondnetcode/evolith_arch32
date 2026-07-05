import type {
  IGitHubApiClient,
  CreateRepoParams,
  GitHubRepo,
  BranchProtectionRules,
  GitHubFileParams,
  GitHubTokenInfo,
} from '@beyondnet/evolith-core-domain';

/** Raw GitHub REST API v3 repo shape (only fields we map) */
interface GitHubRawRepo {
  id: number;
  name: string;
  full_name: string;
  clone_url: string;
  ssh_url: string;
  html_url: string;
  private: boolean;
  default_branch: string;
  topics?: string[];
}

interface GitHubRawUser {
  login: string;
}

interface GitHubRawFileContent {
  sha: string;
}

interface GitHubRawHook {
  id: number;
  config: { url: string };
}

interface GitHubRawRateLimit {
  remaining: number;
  limit: number;
}

/**
 * Adapter that implements {@link IGitHubApiClient} using the native Node.js
 * global `fetch` (available from Node 18+; fully stable in Node 21+).
 * No additional npm dependencies required.
 */
export class GitHubApiAdapter implements IGitHubApiClient {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(token: string, baseUrl = 'https://api.github.com') {
    this.token = token;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async request<T>(method: string, path: string, body?: unknown): Promise<{ data: T; headers: Headers }> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
    };

    if (body !== undefined) {
      (init as RequestInit & { body: string }).body = JSON.stringify(body);
    }

    const response = await fetch(url, init);

    if (!response.ok) {
      throw new Error(`GitHub API request failed with status ${response.status}: ${method} ${path}`);
    }

    const data = (await response.json()) as T;
    return { data, headers: response.headers };
  }

  private mapRepo(raw: GitHubRawRepo): GitHubRepo {
    return {
      id: raw.id,
      name: raw.name,
      fullName: raw.full_name,
      cloneUrl: raw.clone_url,
      sshUrl: raw.ssh_url,
      htmlUrl: raw.html_url,
      private: raw.private,
      defaultBranch: raw.default_branch,
      topics: raw.topics ?? [],
    };
  }

  // ---------------------------------------------------------------------------
  // Interface implementation
  // ---------------------------------------------------------------------------

  async validateToken(): Promise<GitHubTokenInfo> {
    const { data, headers } = await this.request<GitHubRawUser>('GET', '/user');

    const scopesHeader = headers.get('x-oauth-scopes') ?? '';
    const scopes = scopesHeader
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const rateLimitHeaders: GitHubRawRateLimit = {
      remaining: parseInt(headers.get('x-ratelimit-remaining') ?? '0', 10),
      limit: parseInt(headers.get('x-ratelimit-limit') ?? '0', 10),
    };

    return {
      scopes,
      login: data.login,
      rateLimit: rateLimitHeaders,
    };
  }

  async createRepository(params: CreateRepoParams): Promise<GitHubRepo> {
    const isOrg = Boolean(params.owner);

    // Determine whether we're creating under a user account or an org.
    // We'll check if the owner matches the authenticated user below; for now
    // always attempt the /user/repos endpoint first and fall back to /orgs if
    // needed. In practice callers should know whether owner is an org.
    // A cleaner approach: always use /orgs/{owner}/repos when an owner is
    // supplied that differs from the token holder, but we can't know that
    // without an extra round-trip. GitHub will return 422 if owner mismatch,
    // so we expose both paths via the isOrg heuristic — callers should set
    // owner to the org name when targeting an org.
    const path = params.owner ? `/orgs/${params.owner}/repos` : '/user/repos';

    // Suppress the TypeScript "declared but value never read" hint for isOrg.
    void isOrg;

    const body: Record<string, unknown> = {
      name: params.name,
      description: params.description,
      private: params.private ?? false,
      auto_init: params.autoInit ?? false,
    };

    if (params.gitignoreTemplate) {
      body['gitignore_template'] = params.gitignoreTemplate;
    }
    if (params.licenseTemplate) {
      body['license_template'] = params.licenseTemplate;
    }

    const { data } = await this.request<GitHubRawRepo>('POST', path, body);
    return this.mapRepo(data);
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepo | null> {
    try {
      const { data } = await this.request<GitHubRawRepo>('GET', `/repos/${owner}/${repo}`);
      return this.mapRepo(data);
    } catch (error) {
      if (error instanceof Error && /status 404/.test(error.message)) {
        return null;
      }
      throw error;
    }
  }

  async applyBranchProtection(
    owner: string,
    repo: string,
    branch: string,
    rules: BranchProtectionRules,
  ): Promise<void> {
    const body: Record<string, unknown> = {
      enforce_admins: rules.enforceAdmins ?? false,
    };

    if (rules.requiredStatusChecks !== undefined) {
      body['required_status_checks'] = {
        strict: true,
        contexts: rules.requiredStatusChecks,
      };
    } else {
      body['required_status_checks'] = null;
    }

    if (rules.requirePullRequestReviews) {
      body['required_pull_request_reviews'] = {
        dismiss_stale_reviews: rules.dismissStaleReviews ?? false,
      };
    } else {
      body['required_pull_request_reviews'] = null;
    }

    body['restrictions'] = null;

    await this.request<unknown>('PUT', `/repos/${owner}/${repo}/branches/${branch}/protection`, body);
  }

  async pushFile(owner: string, repo: string, params: GitHubFileParams): Promise<void> {
    // Retrieve the current file SHA if it exists (needed for updates).
    let sha: string | undefined;
    try {
      const { data } = await this.request<GitHubRawFileContent>(
        'GET',
        `/repos/${owner}/${repo}/contents/${params.path}`,
      );
      sha = data.sha;
    } catch {
      // File does not exist yet — create it without a SHA.
    }

    const body: Record<string, unknown> = {
      message: params.message,
      content: Buffer.from(params.content).toString('base64'),
    };

    if (params.branch) {
      body['branch'] = params.branch;
    }
    if (sha) {
      body['sha'] = sha;
    }

    await this.request<unknown>('PUT', `/repos/${owner}/${repo}/contents/${params.path}`, body);
  }

  async createWebhook(
    owner: string,
    repo: string,
    url: string,
    events: string[],
  ): Promise<{ id: number; url: string }> {
    const body = {
      name: 'web',
      active: true,
      events,
      config: {
        url,
        content_type: 'json',
        insecure_ssl: '0',
      },
    };

    const { data } = await this.request<GitHubRawHook>('POST', `/repos/${owner}/${repo}/hooks`, body);
    return { id: data.id, url: data.config.url };
  }

  async addTopics(owner: string, repo: string, topics: string[]): Promise<void> {
    await this.request<unknown>('PUT', `/repos/${owner}/${repo}/topics`, { names: topics });
  }
}
