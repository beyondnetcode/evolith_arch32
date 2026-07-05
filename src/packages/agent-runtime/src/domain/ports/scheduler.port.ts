/**
 * ISchedulerPort — lets the runtime defer or recur work (e.g. re-check a blocked
 * initiative, run a nightly audit). Kept abstract so an in-memory timer, a cron
 * adapter, or a managed queue all satisfy it. MVP ships an in-memory adapter;
 * durable scheduling is a documented future extension.
 */

import type { AgentRuntimeRequest } from '../contracts/agent-runtime-request';

export interface ScheduledTask {
  readonly id: string;
  /** ISO-8601 UTC time to run, or a cron expression. */
  readonly when: string;
  /** The request to replay when the task fires. */
  readonly request: AgentRuntimeRequest;
  readonly recurring?: boolean;
}

export interface ISchedulerPort {
  schedule(task: ScheduledTask): Promise<void>;
  cancel(taskId: string): Promise<void>;
  /** Tasks due to run at/<= the given ISO time (default: now per adapter). */
  due(nowIso?: string): Promise<readonly ScheduledTask[]>;
}
