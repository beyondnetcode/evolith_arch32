import { calculateDora, DoraMetrics } from './dora-calculator';
import type { GitCommit } from './git-log-reader';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeCommit(overrides: Partial<GitCommit> & { hash: string; date: string }): GitCommit {
  return {
    subject: 'feat: some feature',
    parents: ['abc'],
    isMerge: false,
    ...overrides,
  };
}

/** Build a sequence of commits N days apart, starting from `startDaysAgo` */
function dailyCommits(count: number, startDaysAgo = 89): GitCommit[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const ms = now - (startDaysAgo - i) * 86_400_000;
    return makeCommit({ hash: `hash${i}`, date: new Date(ms).toISOString() });
  });
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('calculateDora', () => {
  describe('empty history', () => {
    it('returns available=false when no commits', () => {
      const result = calculateDora([], 90);
      expect(result.available).toBe(false);
      expect(result.totalCommits).toBe(0);
    });

    it('all metrics return unknown rating', () => {
      const result = calculateDora([], 90);
      expect(result.deploymentFrequency.rating).toBe('unknown');
      expect(result.leadTimeForChanges.rating).toBe('unknown');
      expect(result.changeFailureRate.rating).toBe('unknown');
      expect(result.timeToRestore.rating).toBe('unknown');
    });
  });

  describe('deployment frequency', () => {
    it('rates daily commits as high (≥1/week)', () => {
      const commits = dailyCommits(90);
      const result = calculateDora(commits, 90);
      // 90 commits / 13 weeks ≈ 6.9/week → high
      expect(result.deploymentFrequency.rating).toBe('high');
      expect(result.deploymentFrequency.value).toBeGreaterThan(1);
    });

    it('rates multiple-per-day as elite (>7/week)', () => {
      // 200 commits in 7 days → ~28/week
      const commits = Array.from({ length: 200 }, (_, i) =>
        makeCommit({ hash: `h${i}`, date: new Date(Date.now() - i * 3_600_000).toISOString() }),
      );
      const result = calculateDora(commits, 7);
      expect(result.deploymentFrequency.rating).toBe('elite');
    });

    it('prefers merge commits over all commits', () => {
      const commits = dailyCommits(90);
      // Add 3 merge commits
      const merges = [0, 30, 60].map(i => makeCommit({
        hash: `merge${i}`,
        date: commits[i].date,
        isMerge: true,
        parents: [commits[i].hash, `feature${i}`],
        subject: `Merge branch 'feature${i}'`,
      }));
      const result = calculateDora([...commits, ...merges], 90);
      // 3 merges / 13 weeks ≈ 0.23/week → low
      expect(result.deploymentFrequency.rating).toBe('low');
      expect(result.deploymentFrequency.value).toBeCloseTo(3 / (90 / 7), 1);
    });

    it('rates 2 deploys per week as high', () => {
      // 26 merge commits over 90 days ≈ 2/week
      const merges = Array.from({ length: 26 }, (_, i) => makeCommit({
        hash: `m${i}`,
        date: new Date(Date.now() - i * 3 * 86_400_000).toISOString(),
        isMerge: true,
        parents: ['p1', `f${i}`],
        subject: 'Merge branch feature',
      }));
      const result = calculateDora(merges, 90);
      expect(result.deploymentFrequency.rating).toBe('high');
    });
  });

  describe('change failure rate', () => {
    it('returns 0% when no fix commits', () => {
      const result = calculateDora(dailyCommits(10), 90);
      expect(result.changeFailureRate.value).toBe(0);
      expect(result.changeFailureRate.rating).toBe('elite');
    });

    it('detects fix: prefix', () => {
      const commits = [
        makeCommit({ hash: 'h1', date: new Date().toISOString(), subject: 'feat: new thing' }),
        makeCommit({ hash: 'h2', date: new Date().toISOString(), subject: 'fix: broken thing' }),
        makeCommit({ hash: 'h3', date: new Date().toISOString(), subject: 'fix: another bug' }),
        makeCommit({ hash: 'h4', date: new Date().toISOString(), subject: 'feat: another feature' }),
      ];
      const result = calculateDora(commits, 90);
      expect(result.changeFailureRate.value).toBe(50); // 2/4
    });

    it('detects hotfix, revert, rollback prefixes', () => {
      const commits = [
        makeCommit({ hash: 'h1', date: new Date().toISOString(), subject: 'hotfix: urgent' }),
        makeCommit({ hash: 'h2', date: new Date().toISOString(), subject: 'revert: bad deploy' }),
        makeCommit({ hash: 'h3', date: new Date().toISOString(), subject: 'rollback: db migration' }),
        makeCommit({ hash: 'h4', date: new Date().toISOString(), subject: 'feat: clean feature' }),
      ];
      const result = calculateDora(commits, 90);
      expect(result.changeFailureRate.value).toBe(75); // 3/4
      expect(result.changeFailureRate.rating).toBe('low');
    });

    it('rates 3% as elite', () => {
      const commits: GitCommit[] = [
        ...Array.from({ length: 97 }, (_, i) => makeCommit({ hash: `feat${i}`, date: new Date().toISOString() })),
        ...Array.from({ length: 3 }, (_, i) => makeCommit({ hash: `fix${i}`, date: new Date().toISOString(), subject: 'fix: bug' })),
      ];
      const result = calculateDora(commits, 90);
      expect(result.changeFailureRate.rating).toBe('elite');
    });
  });

  describe('lead time for changes', () => {
    it('returns unknown when no merge commits', () => {
      const result = calculateDora(dailyCommits(10), 90);
      expect(result.leadTimeForChanges.rating).toBe('unknown');
    });

    it('calculates lead time from merge parent timestamps', () => {
      const now = Date.now();
      const featureDate = new Date(now - 2 * 3_600_000).toISOString(); // 2h ago
      const mergeDate = new Date(now).toISOString();

      const feature = makeCommit({ hash: 'feature1', date: featureDate });
      const merge = makeCommit({
        hash: 'merge1',
        date: mergeDate,
        isMerge: true,
        parents: ['main', 'feature1'],
        subject: "Merge branch 'feature'",
      });

      const result = calculateDora([feature, merge], 90);
      expect(result.leadTimeForChanges.value).toBeCloseTo(2, 0); // ~2 hours
      expect(result.leadTimeForChanges.rating).toBe('high'); // < 1 week
    });

    it('rates sub-hour lead time as elite', () => {
      const now = Date.now();
      const feature = makeCommit({ hash: 'f1', date: new Date(now - 30 * 60_000).toISOString() });
      const merge = makeCommit({
        hash: 'm1', date: new Date(now).toISOString(),
        isMerge: true, parents: ['main', 'f1'],
        subject: 'Merge',
      });
      const result = calculateDora([feature, merge], 90);
      expect(result.leadTimeForChanges.rating).toBe('elite');
    });
  });

  describe('time to restore', () => {
    it('returns unknown when no fix commits', () => {
      const result = calculateDora(dailyCommits(10), 90);
      expect(result.timeToRestore.rating).toBe('unknown');
    });

    it('calculates time between bug introduction and fix', () => {
      const now = Date.now();
      const feat = makeCommit({ hash: 'feat1', date: new Date(now - 4 * 3_600_000).toISOString(), subject: 'feat: deploy' });
      const fix = makeCommit({ hash: 'fix1', date: new Date(now).toISOString(), subject: 'fix: resolve production issue' });

      const result = calculateDora([feat, fix], 90);
      expect(result.timeToRestore.value).toBeCloseTo(4, 0); // ~4 hours
      expect(result.timeToRestore.rating).toBe('high'); // < 1 day
    });
  });

  describe('metadata', () => {
    it('reports correct analyzedDays and totalCommits', () => {
      const commits = dailyCommits(30);
      const result = calculateDora(commits, 90);
      expect(result.analyzedDays).toBe(90);
      expect(result.totalCommits).toBe(30);
      expect(result.available).toBe(true);
    });
  });
});
