export interface RepoDetectionResult {
  /** Directory name from the filesystem root */
  repoName: string;

  /** Git remote origin URL (https or ssh), null if no remote */
  remoteUrl: string | null;

  /** Parsed owner from remoteUrl, null if unavailable */
  remoteOwner: string | null;

  /** Detected runtime from lock files / config */
  runtime: 'nodejs' | 'dotnet' | 'python' | 'unknown';

  /** Detected package manager (from lock files) */
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'nuget' | 'unknown';

  /** Detected framework (e.g. 'nestjs', 'fastapi', 'express') */
  framework: string | null;

  /** Detected CI platform (from .github/workflows, .gitlab-ci.yml, etc.) */
  ciPlatform: 'github' | 'gitlab' | 'azure' | 'none';

  /** Whether docs already exist */
  hasDocs: boolean;

  /** Whether governance dirs already exist */
  hasGovernance: boolean;

  /** Whether evolith.yaml already exists */
  hasEvolithYaml: boolean;

  /** Whether AGENTS.md already exists */
  hasAgentsMd: boolean;
}
