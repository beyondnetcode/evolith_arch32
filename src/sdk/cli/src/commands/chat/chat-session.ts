import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * GT-619 — session state for `evolith chat`.
 *
 * The command was 91 lines that printed, called the runtime once and exited:
 * every invocation started from nothing, so "chat" meant "one-shot request with
 * a conversational name". A session is the minimum that makes the name true —
 * turn N has to be able to see turns 1..N-1, and it has to survive the process
 * so a conversation can be resumed.
 *
 * Deliberately file-backed and dependency-free, mirroring `FileWaiverStore`:
 * a conversation about governance is an audit artifact, and an in-memory one
 * would be gone by the time anybody asked what was decided.
 */

export interface ChatTurn {
  readonly role: 'user' | 'agent';
  readonly content: string;
  readonly at: string;
  /** Runtime status for an agent turn, so a replayed session keeps its verdicts. */
  readonly status?: string;
}

export interface ChatSession {
  readonly id: string;
  readonly startedAt: string;
  turns: ChatTurn[];
}

export const CHAT_SESSION_DIR = join('.evolith', 'chat-sessions');

/** Max turns handed to the runtime as context. Keeps a long session bounded. */
export const CHAT_CONTEXT_WINDOW = 20;

export class ChatSessionStore {
  private readonly dir: string;

  constructor(rootDir: string = process.cwd()) {
    this.dir = resolve(rootDir, CHAT_SESSION_DIR);
  }

  private pathFor(id: string): string {
    // The id is used as a filename; refuse anything that could escape the dir.
    if (!/^[A-Za-z0-9._-]+$/.test(id)) {
      throw new Error(`Invalid chat session id "${id}": use letters, digits, '.', '_' or '-'.`);
    }
    return join(this.dir, `${id}.json`);
  }

  create(id: string = randomUUID()): ChatSession {
    return { id, startedAt: new Date().toISOString(), turns: [] };
  }

  /** Load a session, or start a fresh one under that id when none is stored yet. */
  load(id: string): ChatSession {
    const file = this.pathFor(id);
    if (!existsSync(file)) return this.create(id);
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<ChatSession>;
      return {
        id: parsed.id ?? id,
        startedAt: parsed.startedAt ?? new Date().toISOString(),
        turns: Array.isArray(parsed.turns) ? (parsed.turns as ChatTurn[]) : [],
      };
    } catch {
      // A corrupt transcript must not take the command down: fail forward with
      // an empty session, the same way FileWaiverStore fails closed on garbage.
      return this.create(id);
    }
  }

  save(session: ChatSession): void {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.pathFor(session.id), JSON.stringify(session, null, 2), 'utf8');
  }

  list(): string[] {
    if (!existsSync(this.dir)) return [];
    return readdirSync(this.dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -'.json'.length))
      .sort();
  }
}

/** The trailing slice of a conversation that is sent to the runtime as context. */
export function contextWindow(session: ChatSession, size: number = CHAT_CONTEXT_WINDOW): ChatTurn[] {
  return session.turns.slice(-size);
}
