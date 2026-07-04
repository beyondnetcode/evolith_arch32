export interface CreateRepoParams {
  owner: string;
  name: string;
  description?: string;
  private?: boolean;
  autoInit?: boolean;
  gitignoreTemplate?: string;
  licenseTemplate?: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  cloneUrl: string;
  sshUrl: string;
  htmlUrl: string;
  private: boolean;
  defaultBranch: string;
  topics: string[];
}

export interface BranchProtectionRules {
  requiredStatusChecks?: string[];
  requirePullRequestReviews?: boolean;
  enforceAdmins?: boolean;
  dismissStaleReviews?: boolean;
}

export interface GitHubFileParams {
  path: string;
  content: string;
  message: string;
  branch?: string;
}

export interface GitHubTokenInfo {
  scopes: string[];
  login: string;
  rateLimit: { remaining: number; limit: number };
}

export interface IGitHubApiClient {
  validateToken(): Promise<GitHubTokenInfo>;
  createRepository(params: CreateRepoParams): Promise<GitHubRepo>;
  getRepository(owner: string, repo: string): Promise<GitHubRepo | null>;
  applyBranchProtection(owner: string, repo: string, branch: string, rules: BranchProtectionRules): Promise<void>;
  pushFile(owner: string, repo: string, params: GitHubFileParams): Promise<void>;
  createWebhook(owner: string, repo: string, url: string, events: string[]): Promise<{ id: number; url: string }>;
  addTopics(owner: string, repo: string, topics: string[]): Promise<void>;
}
