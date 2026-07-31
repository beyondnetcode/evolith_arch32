export { NodeFileSystemProvider } from './node-filesystem.provider';
export { NodeProcessRunner } from './node-process-runner.provider';
export type { NodeProcessRunnerOptions } from './node-process-runner.provider';
export { NodeWorkspaceMaterializer } from './workspace-materializer.provider';
export type { NodeWorkspaceMaterializerOptions } from './workspace-materializer.provider';
export { NestLoggerProvider, ConsoleLoggerProvider, NoOpLoggerProvider } from './logger.provider';
export { YamlConfigParserProvider, JsonConfigParserProvider } from './config-parser.provider';
export { DiskRulesetRepository, RulesetsNotFoundError } from './disk-ruleset.repository';
// GT-646 — the corpus is deployment state; a long-running surface must load it once.
export { CachingRulesetRepository } from './caching-ruleset.repository';
export { WebhookAdapter } from './webhook.adapter';
export { FileWaiverStore } from './file-waiver-store.provider';
export {
  MoscowPrioritizationService,
  MoscowItem,
  MoscowAnalysis,
  MoscowPriority,
} from './moscow-prioritization.service';
export { GitHubApiAdapter } from './adapters/github-api.adapter';
export type {
  IGitHubApiClient,
  CreateRepoParams,
  GitHubRepo,
  BranchProtectionRules,
  GitHubFileParams,
  GitHubTokenInfo,
} from '@beyondnet/evolith-core-domain';
export { NxWorkspaceStrategy } from './architecture/nx-workspace.strategy';
export type { NxWorkspaceStrategyOptions } from './architecture/nx-workspace.strategy';
export { resolveRulesetFilePath } from './architecture/ruleset-file-resolver';
export { loadBackstageOwnership } from './backstage-catalog.loader';
export { fetchJiraWorkItems } from './jira-work-system.adapter';
export type { JiraHttpClient } from './jira-work-system.adapter';
export { LangfuseEvidenceAdapter } from './langfuse-evidence.adapter';
export type { LangfuseHttpClient } from './langfuse-evidence.adapter';
export { fetchBlueprintOwnership } from './idp-blueprint.adapter';
export type { BlueprintHttpClient } from './idp-blueprint.adapter';
export {
  LighthouseEvidenceProvider,
  createHeadlessChromeRunner,
  severityForScore,
  LIGHTHOUSE_PROVIDER_ID,
  LIGHTHOUSE_ADAPTER_VERSION,
} from './lighthouse-evidence.provider';
export type {
  IQualitySignalProvider,
  CollectionContext,
  CollectionTarget,
  LighthouseRunner,
  LighthouseRunResult,
  LighthouseCategoryResult,
  LighthouseEvidenceProviderOptions,
} from './lighthouse-evidence.provider';

// GT-604 — the ONE client every verdict-producing surface deposits through. Three
// surfaces each writing their own fetch is three chances to drop the rule engine,
// to rename `accountableOwner` back to `owner`, or to put a `tenantId` in the body
// — and the last is a security hole, not a typo.
export {
  TrackerEvaluationIngestClient,
  EvaluationIngestError,
  createEvaluationIngestClientFromEnv,
  depositEvaluation,
  EVOLITH_TRACKER_URL_ENV,
  EVOLITH_TRACKER_API_KEY_ENV,
} from './tracker/evaluation-ingest.client';
export type {
  EvaluationIngestAck,
  TrackerEvaluationIngestClientOptions,
  DepositOutcome,
  DepositEvaluationInput,
  IngestFetchLike,
} from './tracker/evaluation-ingest.client';
