/**
 * Jira work-system connector adapter (GT-529 · axis 1 — positioning §8.3 / §9-6).
 *
 * The read-only INFRA seam behind the pure external-work ACL. It fetches already-shaped Jira
 * issues through an INJECTED {@link JiraHttpClient} (so this is unit-testable with a stub, free
 * of network config) and normalizes them via the pure `parseJiraIssues` ACL — which preserves
 * provenance, drops id-less (non-conforming) issues, and keeps `authorizesPhaseTransition` false.
 * This adapter adds no mapping of its own; the ACL is the single source of truth.
 */
import {
  parseJiraIssues,
  type JiraIssue,
  type CanonicalWorkItem,
} from '@beyondnet/evolith-core-domain/domain/external-work-acl';

/**
 * Minimal injected port for the Jira read side. An implementation performs the actual REST
 * search (JQL) and returns raw {@link JiraIssue} objects; the adapter stays pure of network
 * config and can be exercised with a stub.
 */
export interface JiraHttpClient {
  searchIssues(jql: string): Promise<JiraIssue[]>;
}

/**
 * Fetch Jira issues for a JQL query and map them to {@link CanonicalWorkItem}s through the pure
 * ACL. Read-only: provenance is preserved, id-less issues are dropped, and the transition
 * safeguard (`authorizesPhaseTransition === false`) is guaranteed by the ACL — never here.
 */
export async function fetchJiraWorkItems(
  client: JiraHttpClient,
  jql: string,
): Promise<CanonicalWorkItem[]> {
  const issues = await client.searchIssues(jql);
  return parseJiraIssues(issues);
}
