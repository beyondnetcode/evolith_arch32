/**
 * External work-system Anti-Corruption Layer (GT-529 · axis 1 — positioning §8.3 / §9-6).
 *
 * Lets Evolith INTEGRATE an external work system (Jira first) WITHOUT ceding governance
 * authority. It maps external work items (ideas/epics/stories/tasks/releases) to ONE canonical
 * shape that PRESERVES provenance — origin, identity, timestamps, lineage — and it encodes the
 * transition safeguard: external work INFORMS but never AUTHORIZES a phase transition (completing
 * a Jira workflow does not drive an Evolith gate). Non-conforming items (no identity) are rejected,
 * not silently trusted.
 *
 * Layering: PURE. Fetching from the Jira REST API is the read-only connector/infra step (follow-on);
 * this takes already-fetched objects and normalizes them across sources.
 */

/** Where an imported work item came from — the lineage Evolith must preserve (§8.3). */
export interface WorkItemProvenance {
  readonly source: string; // e.g. 'jira'
  /** Stable external id (never shown as an internal id). */
  readonly externalId: string;
  /** Human external key, e.g. `PROJ-123`. */
  readonly externalKey?: string;
  /** Link back to the origin record. */
  readonly url?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export type WorkItemKind = 'idea' | 'epic' | 'story' | 'task' | 'release' | 'unknown';

/** An external work item, normalized behind the ACL. */
export interface CanonicalWorkItem {
  readonly kind: WorkItemKind;
  readonly title: string;
  readonly status?: string;
  readonly provenance: WorkItemProvenance;
  /**
   * By CONTRACT always `false`: external work never authorizes a phase transition on its own
   * (§9-6). Kept in the model so a consumer cannot forget the safeguard.
   */
  readonly authorizesPhaseTransition: false;
}

/**
 * The transition safeguard (§9-6). External work-item state — however "done" in Jira — never
 * authorizes an Evolith phase transition by itself. Always `false`, by design.
 */
export function externalWorkAuthorizesTransition(_item: CanonicalWorkItem): boolean {
  return false;
}

// ---------------------------------------------------------------------------
// Jira mapper (the first external work system)
// ---------------------------------------------------------------------------

/** Partial Jira issue shape (Jira REST v3) — only the fields the ACL reads. */
export interface JiraIssue {
  readonly id?: string;
  readonly key?: string;
  readonly self?: string; // canonical url
  readonly fields?: {
    readonly summary?: string;
    readonly issuetype?: { readonly name?: string };
    readonly status?: { readonly name?: string };
    readonly created?: string;
    readonly updated?: string;
  };
}

const JIRA_TYPE_MAP: Readonly<Record<string, WorkItemKind>> = {
  idea: 'idea',
  epic: 'epic',
  story: 'story',
  'user story': 'story',
  task: 'task',
  'sub-task': 'task',
  subtask: 'task',
  bug: 'task',
  release: 'release',
  version: 'release',
};

/** Map a Jira issue-type name to a canonical {@link WorkItemKind} (`unknown` when unmapped). */
export function mapJiraIssueType(name: string | undefined): WorkItemKind {
  if (!name) return 'unknown';
  return JIRA_TYPE_MAP[name.trim().toLowerCase()] ?? 'unknown';
}

/**
 * Map a Jira issue to a {@link CanonicalWorkItem}, preserving provenance. Returns `null` for a
 * non-conforming issue (no `id` → no identity/lineage) — the ACL rejects rather than fabricates.
 */
export function parseJiraIssue(issue: JiraIssue): CanonicalWorkItem | null {
  const externalId = issue.id;
  if (!externalId) return null;
  const f = issue.fields ?? {};
  return {
    kind: mapJiraIssueType(f.issuetype?.name),
    title: f.summary ?? issue.key ?? externalId,
    status: f.status?.name,
    provenance: {
      source: 'jira',
      externalId,
      externalKey: issue.key,
      url: issue.self,
      createdAt: f.created,
      updatedAt: f.updated,
    },
    authorizesPhaseTransition: false,
  };
}

/** Map a batch of Jira issues, dropping non-conforming ones (read-only, no fabrication). */
export function parseJiraIssues(issues: readonly JiraIssue[]): CanonicalWorkItem[] {
  const out: CanonicalWorkItem[] = [];
  for (const issue of issues) {
    const item = parseJiraIssue(issue);
    if (item) out.push(item);
  }
  return out;
}
