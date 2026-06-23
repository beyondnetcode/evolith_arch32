import { calculateDora } from './dora-calculator';
import type { GitCommit } from './git-log-reader';

function commit(partial: Partial<GitCommit> & { hash: string; date: string }): GitCommit {
  return {
    subject: 'feat: x',
    parents: [],
    isMerge: false,
    ...partial,
  } as GitCommit;
}

describe('calculateDora', () => {
  it('returns empty metrics flagged unavailable when there are no commits', () => {
    const m = calculateDora([], 30);
    expect(m.available).toBe(false);
    expect(m.totalCommits).toBe(0);
    expect(m.analyzedDays).toBe(30);
    expect(m.deploymentFrequency.rating).toBe('unknown');
    expect(m.leadTimeForChanges.rating).toBe('unknown');
    expect(m.changeFailureRate.rating).toBe('unknown');
    expect(m.timeToRestore.rating).toBe('unknown');
  });

  it('falls back to all commits when there are no merges', () => {
    const commits = Array.from({ length: 7 }, (_, i) =>
      commit({ hash: `h${i}`, date: `2026-06-${10 + i}T00:00:00Z`, subject: 'feat: x' }),
    );
    const m = calculateDora(commits, 7);
    expect(m.available).toBe(true);
    expect(m.totalCommits).toBe(7);
    expect(m.deploymentFrequency.value).toBeCloseTo(7);
    expect(m.deploymentFrequency.rating).toBe('high');
    expect(m.deploymentFrequency.label).toMatch(/\/week/);
    expect(m.leadTimeForChanges.rating).toBe('unknown');
    expect(m.timeToRestore.rating).toBe('unknown');
  });

  it('computes lead time from merge commits and rates it', () => {
    const featureTip = commit({ hash: 'feat1', date: '2026-06-10T10:00:00Z' });
    const merge = commit({
      hash: 'merge1',
      date: '2026-06-10T12:30:00Z',
      parents: ['mainPrev', 'feat1'],
      isMerge: true,
      subject: 'merge: branch',
    });
    const main = commit({ hash: 'mainPrev', date: '2026-06-09T00:00:00Z' });

    const m = calculateDora([merge, featureTip, main], 7);
    expect(m.leadTimeForChanges.value).toBeCloseTo(2.5, 1);
    expect(m.leadTimeForChanges.rating).toBe('high');
    expect(m.leadTimeForChanges.label).toMatch(/h$/);
  });

  it('counts fix/revert subjects toward change failure rate', () => {
    const commits = [
      commit({ hash: 'a', date: '2026-06-10T00:00:00Z', subject: 'feat: a' }),
      commit({ hash: 'b', date: '2026-06-10T01:00:00Z', subject: 'fix: bug' }),
      commit({ hash: 'c', date: '2026-06-10T02:00:00Z', subject: 'revert: old' }),
      commit({ hash: 'd', date: '2026-06-10T03:00:00Z', subject: 'docs: x' }),
    ];
    const m = calculateDora(commits, 7);
    expect(m.changeFailureRate.value).toBeCloseTo(50);
    expect(m.changeFailureRate.rating).toBe('low');
    expect(m.changeFailureRate.label).toBe('50.0%');
  });

  it('computes time-to-restore from preceding non-fix commit', () => {
    const commits = [
      commit({ hash: 'a', date: '2026-06-10T00:00:00Z', subject: 'feat: a' }),
      commit({ hash: 'b', date: '2026-06-10T00:30:00Z', subject: 'fix: regression' }),
    ];
    const m = calculateDora(commits, 7);
    expect(m.timeToRestore.value).toBeCloseTo(0.5, 1);
    expect(m.timeToRestore.rating).toBe('elite');
    expect(m.timeToRestore.label).toMatch(/min$/);
  });

  it('reports days label when lead time exceeds 24h', () => {
    const featureTip = commit({ hash: 'f', date: '2026-06-01T00:00:00Z' });
    const merge = commit({
      hash: 'm',
      date: '2026-06-08T00:00:00Z',
      parents: ['p', 'f'],
      isMerge: true,
      subject: 'merge: feature',
    });
    const m = calculateDora([merge, featureTip], 30);
    expect(m.leadTimeForChanges.label).toMatch(/days$/);
    expect(m.leadTimeForChanges.rating).toBe('medium');
  });

  it('reports monthly cadence when fewer than 1 deploy/week', () => {
    const commits = [commit({ hash: 'a', date: '2026-06-10T00:00:00Z', subject: 'chore: bump' })];
    const m = calculateDora(commits, 30);
    expect(m.deploymentFrequency.label).toMatch(/\/month/);
  });
});
