/**
 * FileSchedulerAdapter — a DURABLE {@link ISchedulerPort} backed by a JSON file
 * (GT-386). Tasks survive a process restart: each mutation is persisted and
 * `due()` reads the current file, so a fresh instance on the same path replays
 * the same backlog. Like the in-memory default it starts no timers — a host
 * (cron worker, the CLI) drives `due()` and replays the requests.
 *
 * This is the zero-infra durable option (single-node / mounted volume). A
 * networked queue/cron service is a sibling adapter behind the same port.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { ISchedulerPort, ScheduledTask } from '../../domain/ports/scheduler.port';

export interface FileSchedulerOptions {
  /** JSON file backing the task store; parent dirs are created on first write. */
  readonly filePath: string;
  /** Injected clock (defaults to wall-clock UTC). */
  readonly now?: () => string;
}

export class FileSchedulerAdapter implements ISchedulerPort {
  private readonly now: () => string;

  constructor(private readonly options: FileSchedulerOptions) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async schedule(task: ScheduledTask): Promise<void> {
    const tasks = await this.load();
    tasks[task.id] = task;
    await this.save(tasks);
  }

  async cancel(taskId: string): Promise<void> {
    const tasks = await this.load();
    if (taskId in tasks) {
      delete tasks[taskId];
      await this.save(tasks);
    }
  }

  async due(nowIso?: string): Promise<readonly ScheduledTask[]> {
    const ref = Date.parse(nowIso ?? this.now());
    const tasks = await this.load();
    return Object.values(tasks).filter((t) => {
      const when = Date.parse(t.when);
      return Number.isFinite(when) && when <= ref; // cron strings are treated as "not due here"
    });
  }

  private async load(): Promise<Record<string, ScheduledTask>> {
    try {
      const raw = await fs.readFile(this.options.filePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, ScheduledTask>) : {};
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw err;
    }
  }

  private async save(tasks: Record<string, ScheduledTask>): Promise<void> {
    await fs.mkdir(path.dirname(this.options.filePath), { recursive: true });
    await fs.writeFile(this.options.filePath, JSON.stringify(tasks, null, 2), 'utf8');
  }
}
