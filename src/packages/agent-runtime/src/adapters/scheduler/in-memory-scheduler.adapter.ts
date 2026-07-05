/**
 * InMemorySchedulerAdapter — default {@link ISchedulerPort}. Stores tasks in a
 * map and reports those due by ISO time. No timers are started here on purpose:
 * a host (cron, queue worker, the CLI) drives `due()` and replays the requests.
 * Durable scheduling is a documented future extension.
 */

import type { ISchedulerPort, ScheduledTask } from '../../domain/ports/scheduler.port';

export class InMemorySchedulerAdapter implements ISchedulerPort {
  private readonly tasks = new Map<string, ScheduledTask>();

  constructor(private readonly now: () => string = () => new Date().toISOString()) {}

  async schedule(task: ScheduledTask): Promise<void> {
    this.tasks.set(task.id, task);
  }

  async cancel(taskId: string): Promise<void> {
    this.tasks.delete(taskId);
  }

  async due(nowIso?: string): Promise<readonly ScheduledTask[]> {
    const ref = Date.parse(nowIso ?? this.now());
    return [...this.tasks.values()].filter((t) => {
      const when = Date.parse(t.when);
      return Number.isFinite(when) && when <= ref; // cron strings are treated as "not due here"
    });
  }
}
