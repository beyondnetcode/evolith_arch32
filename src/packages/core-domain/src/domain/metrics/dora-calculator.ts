/**
 * Calculates DORA (DevOps Research and Assessment) metrics from git history.
 *
 * Proxies used (all derived from git log, no external data needed):
 *
 *  Deployment Frequency  — merge commits (or all commits if no merges) per week
 *  Lead Time for Changes — median time between a feature's first commit and its
 *                          merge to the current branch (ms→hours)
 *  Change Failure Rate   — % of commits whose subject starts with fix/hotfix/revert/rollback
 *  Time to Restore       — median gap between a "fix" commit and the previous
 *                          non-fix commit (approximates MTTR)
 *
 * DORA 2023 performance bands are used for ratings.
 */

import type { GitCommit } from './git-log-reader';

// ── types ─────────────────────────────────────────────────────────────────────

export type DoraRating = 'elite' | 'high' | 'medium' | 'low' | 'unknown';

export interface DoraMetric {
  /** Computed numerical value */
  value: number;
  /** Human-readable label */
  label: string;
  rating: DoraRating;
  /** What the value represents */
  unit: string;
}

export interface DoraMetrics {
  deploymentFrequency: DoraMetric;
  leadTimeForChanges: DoraMetric;
  changeFailureRate: DoraMetric;
  timeToRestore: DoraMetric;
  /** How many days of history were analysed */
  analyzedDays: number;
  /** Total commits in window */
  totalCommits: number;
  /** Whether git history was available */
  available: boolean;
}

// ── rating helpers ────────────────────────────────────────────────────────────

function rateDeployFreq(perWeek: number): DoraRating {
  if (perWeek > 7) return 'elite';   // multiple per day
  if (perWeek >= 1) return 'high';   // daily to weekly
  if (perWeek >= 0.25) return 'medium'; // weekly to monthly
  return 'low';
}

function rateLeadTime(hours: number): DoraRating {
  if (hours < 1) return 'elite';
  if (hours < 168) return 'high';    // < 1 week
  if (hours < 720) return 'medium';  // < 1 month
  return 'low';
}

function rateFailureRate(pct: number): DoraRating {
  if (pct <= 5) return 'elite';
  if (pct <= 10) return 'high';
  if (pct <= 15) return 'medium';
  return 'low';
}

function rateMttr(hours: number): DoraRating {
  if (hours < 1) return 'elite';
  if (hours < 24) return 'high';
  if (hours < 168) return 'medium';
  return 'low';
}

// ── math helpers ─────────────────────────────────────────────────────────────

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function hoursLabel(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

const FIX_RE = /^(fix|hotfix|revert|rollback|bugfix|patch)[\s!(:]/i;

// ── main calculator ───────────────────────────────────────────────────────────

export function calculateDora(commits: GitCommit[], sinceDays: number): DoraMetrics {
  if (commits.length === 0) {
    return emptyMetrics(sinceDays);
  }

  const weeks = sinceDays / 7;

  // ── 1. Deployment Frequency ────────────────────────────────────────────────
  // Prefer merge commits as proxy for deployments; fall back to all commits.
  const deploys = commits.filter(c => c.isMerge);
  const deployCount = deploys.length > 0 ? deploys.length : commits.length;
  const deploysPerWeek = deployCount / weeks;

  const deployFreq: DoraMetric = {
    value: deploysPerWeek,
    label: deploysPerWeek >= 1
      ? `${deploysPerWeek.toFixed(1)}/week`
      : `${(deploysPerWeek * 4).toFixed(1)}/month`,
    rating: rateDeployFreq(deploysPerWeek),
    unit: 'deployments/week',
  };

  // ── 2. Lead Time for Changes ───────────────────────────────────────────────
  // For each merge commit, the lead time is the age gap between the oldest
  // parent commit (feature branch tip) and the merge commit itself.
  // Uses commit dates as proxy — requires commits are in chronological order.
  const commitDateMs: Map<string, number> = new Map();
  for (const c of commits) {
    commitDateMs.set(c.hash, new Date(c.date).getTime());
  }

  const leadTimesHours: number[] = [];
  for (const merge of deploys) {
    const mergeMs = commitDateMs.get(merge.hash) ?? 0;
    // Second parent is the feature branch tip
    const featureHash = merge.parents[1];
    const featureMs = featureHash ? (commitDateMs.get(featureHash) ?? mergeMs) : mergeMs;
    const diffHours = (mergeMs - featureMs) / 3_600_000;
    if (diffHours > 0 && diffHours < 24 * 30) { // sanity: < 30 days
      leadTimesHours.push(diffHours);
    }
  }

  const medianLeadHours = leadTimesHours.length > 0 ? median(leadTimesHours) : 0;
  const leadTime: DoraMetric = {
    value: medianLeadHours,
    label: leadTimesHours.length > 0 ? hoursLabel(medianLeadHours) : 'n/a (no merges)',
    rating: leadTimesHours.length > 0 ? rateLeadTime(medianLeadHours) : 'unknown',
    unit: 'hours (median)',
  };

  // ── 3. Change Failure Rate ─────────────────────────────────────────────────
  const fixCommits = commits.filter(c => FIX_RE.test(c.subject));
  const cfr = (fixCommits.length / commits.length) * 100;
  const changeFailureRate: DoraMetric = {
    value: cfr,
    label: `${cfr.toFixed(1)}%`,
    rating: rateFailureRate(cfr),
    unit: '% fix/revert commits',
  };

  // ── 4. Time to Restore (MTTR proxy) ───────────────────────────────────────
  // For each fix commit, find the most recent non-fix commit before it.
  // The gap approximates how long the bug was present (time to restore).
  const sorted = [...commits].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const restoreTimesHours: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (!FIX_RE.test(sorted[i].subject)) continue;
    // Find nearest preceding non-fix commit
    for (let j = i - 1; j >= 0; j--) {
      if (!FIX_RE.test(sorted[j].subject)) {
        const diffH = (new Date(sorted[i].date).getTime() - new Date(sorted[j].date).getTime()) / 3_600_000;
        if (diffH > 0 && diffH < 24 * 14) { // sanity: < 2 weeks
          restoreTimesHours.push(diffH);
        }
        break;
      }
    }
  }

  const medianRestoreHours = restoreTimesHours.length > 0 ? median(restoreTimesHours) : 0;
  const timeToRestore: DoraMetric = {
    value: medianRestoreHours,
    label: restoreTimesHours.length > 0 ? hoursLabel(medianRestoreHours) : 'n/a (no fix commits)',
    rating: restoreTimesHours.length > 0 ? rateMttr(medianRestoreHours) : 'unknown',
    unit: 'hours (median)',
  };

  return {
    deploymentFrequency: deployFreq,
    leadTimeForChanges: leadTime,
    changeFailureRate,
    timeToRestore,
    analyzedDays: sinceDays,
    totalCommits: commits.length,
    available: true,
  };
}

function emptyMetrics(sinceDays: number): DoraMetrics {
  const none: DoraMetric = { value: 0, label: 'n/a', rating: 'unknown', unit: '' };
  return {
    deploymentFrequency: none,
    leadTimeForChanges: none,
    changeFailureRate: none,
    timeToRestore: none,
    analyzedDays: sinceDays,
    totalCommits: 0,
    available: false,
  };
}
