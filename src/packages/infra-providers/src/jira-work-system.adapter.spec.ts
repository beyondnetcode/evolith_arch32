import {
  fetchJiraWorkItems,
  type JiraHttpClient,
} from './jira-work-system.adapter';
import type { JiraIssue } from '@beyondnet/evolith-core-domain/domain/external-work-acl';

/** Two canned issues: one conforming, one WITHOUT an id (non-conforming → dropped by the ACL). */
const CANNED_ISSUES: JiraIssue[] = [
  {
    id: '10001',
    key: 'PROJ-1',
    self: 'https://jira.example.com/rest/api/3/issue/10001',
    fields: {
      summary: 'Ship the governance connector',
      issuetype: { name: 'Story' },
      status: { name: 'In Progress' },
      created: '2026-07-01T10:00:00.000Z',
      updated: '2026-07-10T12:30:00.000Z',
    },
  },
  {
    // no `id` → no identity/lineage → the ACL rejects it (no fabrication)
    key: 'PROJ-2',
    self: 'https://jira.example.com/rest/api/3/issue/PROJ-2',
    fields: {
      summary: 'Ghost issue with no id',
      issuetype: { name: 'Task' },
      status: { name: 'Done' },
    },
  },
];

/** Stub client — records the JQL it was asked for and returns the canned batch. No network. */
class StubJiraHttpClient implements JiraHttpClient {
  lastJql?: string;
  constructor(private readonly issues: JiraIssue[]) {}
  async searchIssues(jql: string): Promise<JiraIssue[]> {
    this.lastJql = jql;
    return this.issues;
  }
}

describe('fetchJiraWorkItems (Jira work-system adapter)', () => {
  it('maps via the ACL: preserves provenance, drops the id-less issue, keeps safeguard false', async () => {
    const client = new StubJiraHttpClient(CANNED_ISSUES);

    const items = await fetchJiraWorkItems(client, 'project = PROJ ORDER BY created');

    // it forwarded the JQL to the injected client
    expect(client.lastJql).toBe('project = PROJ ORDER BY created');

    // the id-less issue is dropped → only the conforming one survives
    expect(items).toHaveLength(1);

    const [item] = items;

    // provenance preserved (origin, identity, key, url, timestamps)
    expect(item.provenance).toEqual({
      source: 'jira',
      externalId: '10001',
      externalKey: 'PROJ-1',
      url: 'https://jira.example.com/rest/api/3/issue/10001',
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-10T12:30:00.000Z',
    });

    // mapped fields
    expect(item.kind).toBe('story');
    expect(item.title).toBe('Ship the governance connector');
    expect(item.status).toBe('In Progress');

    // the transition safeguard is guaranteed by the ACL — never authorizes a phase transition
    expect(item.authorizesPhaseTransition).toBe(false);
  });

  it('returns an empty batch when the client yields no issues', async () => {
    const client = new StubJiraHttpClient([]);
    await expect(fetchJiraWorkItems(client, 'project = EMPTY')).resolves.toEqual([]);
  });
});
