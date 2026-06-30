/**
 * GT-386 — the filesystem-durable scheduler/memory adapters.
 *
 * The defining property is durability across a process restart: a SECOND adapter
 * instance pointed at the same file sees what the first persisted. Each test uses
 * a throwaway temp file and a fresh instance to simulate the restart.
 */

import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { FileSchedulerAdapter } from '../adapters/scheduler/file-scheduler.adapter';
import { FileMemoryAdapter } from '../adapters/memory/file-memory.adapter';
import type { ScheduledTask } from '../domain/ports/scheduler.port';

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'evolith-art-'));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

const task = (id: string, when: string): ScheduledTask =>
  ({ id, when, request: { intent: 'noop', tool: 'noop', tenant: 't' } } as unknown as ScheduledTask);

describe('FileSchedulerAdapter (durable)', () => {
  it('persists scheduled tasks across a restart and reports those due', async () => {
    const file = path.join(dir, 'scheduler.json');
    await new FileSchedulerAdapter({ filePath: file }).schedule(task('a', '2020-01-01T00:00:00.000Z'));

    // "restart": a brand-new instance on the same file.
    const due = await new FileSchedulerAdapter({ filePath: file }).due('2026-01-01T00:00:00.000Z');

    expect(due.map((t) => t.id)).toEqual(['a']);
  });

  it('does not report future tasks as due, and cancel persists', async () => {
    const file = path.join(dir, 'scheduler.json');
    const a = new FileSchedulerAdapter({ filePath: file });
    await a.schedule(task('future', '2099-01-01T00:00:00.000Z'));
    await a.schedule(task('past', '2000-01-01T00:00:00.000Z'));

    await new FileSchedulerAdapter({ filePath: file }).cancel('past');
    const due = await new FileSchedulerAdapter({ filePath: file }).due('2026-01-01T00:00:00.000Z');

    expect(due).toHaveLength(0); // 'past' cancelled, 'future' not yet due
  });

  it('returns no tasks when the backing file does not exist yet', async () => {
    const due = await new FileSchedulerAdapter({ filePath: path.join(dir, 'absent.json') }).due();
    expect(due).toEqual([]);
  });
});

describe('FileMemoryAdapter (durable)', () => {
  it('recalls key/value state written by a prior instance', async () => {
    const file = path.join(dir, 'memory.json');
    await new FileMemoryAdapter({ filePath: file }).remember('k', { v: 1 }, 'ns');

    const recalled = await new FileMemoryAdapter({ filePath: file }).recall('k', 'ns');

    expect(recalled).toEqual({ v: 1 });
  });

  it('persists and orders appended log entries across instances', async () => {
    const file = path.join(dir, 'memory.json');
    const a = new FileMemoryAdapter({ filePath: file, now: () => '2026-06-30T00:00:00.000Z' });
    await a.append('chat', 'first');
    await a.append('chat', 'second');

    const hist = await new FileMemoryAdapter({ filePath: file }).history('chat');

    expect(hist.map((e) => e.value)).toEqual(['first', 'second']); // most-recent-last
    expect(await new FileMemoryAdapter({ filePath: file }).history('chat', 1)).toHaveLength(1);
  });

  it('returns undefined / empty for unknown keys and namespaces', async () => {
    const m = new FileMemoryAdapter({ filePath: path.join(dir, 'memory.json') });
    expect(await m.recall('missing')).toBeUndefined();
    expect(await m.history('nope')).toEqual([]);
  });
});
