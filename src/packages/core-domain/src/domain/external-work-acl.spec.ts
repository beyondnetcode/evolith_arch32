import {
  externalWorkAuthorizesTransition,
  mapJiraIssueType,
  parseJiraIssue,
  parseJiraIssues,
  type JiraIssue,
} from './external-work-acl';

const issue = (over: Partial<JiraIssue> & { fields?: Partial<NonNullable<JiraIssue['fields']>> } = {}): JiraIssue => ({
  id: '10001',
  key: 'PROJ-123',
  self: 'https://acme.atlassian.net/rest/api/3/issue/10001',
  fields: {
    summary: 'Add checkout flow',
    issuetype: { name: 'Story' },
    status: { name: 'In Progress' },
    created: '2026-07-01T10:00:00.000Z',
    updated: '2026-07-10T12:00:00.000Z',
    ...over.fields,
  },
  ...over,
});

describe('mapJiraIssueType (GT-529 — Jira type → canonical kind)', () => {
  it('maps the common Jira types case-insensitively, unknown otherwise', () => {
    expect(mapJiraIssueType('Epic')).toBe('epic');
    expect(mapJiraIssueType('user story')).toBe('story');
    expect(mapJiraIssueType('Sub-task')).toBe('task');
    expect(mapJiraIssueType('Version')).toBe('release');
    expect(mapJiraIssueType('Spike')).toBe('unknown');
    expect(mapJiraIssueType(undefined)).toBe('unknown');
  });
});

describe('parseJiraIssue (ACL — preserve provenance, reject non-conforming)', () => {
  it('preserves origin, identity, key, url and timestamps', () => {
    const item = parseJiraIssue(issue())!;
    expect(item.kind).toBe('story');
    expect(item.title).toBe('Add checkout flow');
    expect(item.status).toBe('In Progress');
    expect(item.provenance).toEqual({
      source: 'jira',
      externalId: '10001',
      externalKey: 'PROJ-123',
      url: 'https://acme.atlassian.net/rest/api/3/issue/10001',
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-10T12:00:00.000Z',
    });
  });

  it('rejects an issue with no id (no identity → no lineage), never fabricating one', () => {
    expect(parseJiraIssue({ key: 'PROJ-1', fields: { summary: 's' } })).toBeNull();
  });

  it('falls back to key then id for the title when summary is absent', () => {
    expect(parseJiraIssue({ id: '9', key: 'PROJ-9' })!.title).toBe('PROJ-9');
    expect(parseJiraIssue({ id: '9' })!.title).toBe('9');
  });

  it('parseJiraIssues drops non-conforming items', () => {
    const out = parseJiraIssues([issue({ id: '1' }), { key: 'no-id' }, issue({ id: '2' })]);
    expect(out.map((i) => i.provenance.externalId)).toEqual(['1', '2']);
  });
});

describe('transition safeguard (§9-6 — external work never authorizes a gate)', () => {
  it('authorizesPhaseTransition is false regardless of Jira status', () => {
    const done = parseJiraIssue(issue({ fields: { status: { name: 'Done' } } }))!;
    expect(done.authorizesPhaseTransition).toBe(false);
    expect(externalWorkAuthorizesTransition(done)).toBe(false);
  });
});
