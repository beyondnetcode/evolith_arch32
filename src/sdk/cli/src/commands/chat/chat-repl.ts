import { contextWindow, type ChatSession, type ChatTurn } from './chat-session';

/**
 * GT-619 — the conversation loop `chat` never had.
 *
 * Written as a pure driver over three injected effects (read a line, send a
 * turn, print) so the loop itself is unit-testable without a TTY, a Nest
 * context or a live Agent Runtime. `chat.command.ts` supplies the real ones.
 */

export interface ReplTurnResult {
  readonly status: string;
  readonly summary: string;
  readonly findingCount: number;
}

export interface ReplDeps {
  /** Returns the next user line, or `null` when the user ends the session. */
  readLine: (prompt: string) => Promise<string | null>;
  /** Sends one turn WITH the prior conversation as context. */
  send: (intent: string, history: readonly ChatTurn[]) => Promise<ReplTurnResult>;
  print: (line: string) => void;
  /** Persist after every exchange so a crash does not lose the transcript. */
  persist: (session: ChatSession) => void;
}

export const REPL_PROMPT = 'you';

/** Slash commands the loop handles itself, without a round-trip to the runtime. */
export const REPL_COMMANDS = ['/exit', '/quit', '/reset', '/history', '/help'] as const;

export interface ReplOutcome {
  /** Number of user turns actually sent to the runtime. */
  readonly exchanges: number;
  /** How the loop ended. */
  readonly endedBy: 'user' | 'eof';
}

/**
 * Run the conversation until the user leaves.
 *
 * `session.turns` is mutated in place and persisted after every exchange, which
 * is what makes turn N aware of turns 1..N-1 both within the process and across
 * a later `--session <id>` resume.
 */
export async function runChatRepl(session: ChatSession, deps: ReplDeps): Promise<ReplOutcome> {
  let exchanges = 0;

  for (;;) {
    const line = await deps.readLine(REPL_PROMPT);
    if (line === null) return { exchanges, endedBy: 'eof' };

    const trimmed = line.trim();
    if (trimmed === '') continue;

    if (trimmed === '/exit' || trimmed === '/quit') {
      return { exchanges, endedBy: 'user' };
    }
    if (trimmed === '/help') {
      deps.print(`Commands: ${REPL_COMMANDS.join(', ')}`);
      continue;
    }
    if (trimmed === '/reset') {
      session.turns.length = 0;
      deps.persist(session);
      deps.print('Session cleared.');
      continue;
    }
    if (trimmed === '/history') {
      if (session.turns.length === 0) deps.print('(no turns yet)');
      for (const turn of session.turns) deps.print(`${turn.role}: ${turn.content}`);
      continue;
    }

    // The history handed to the runtime is the state BEFORE this turn, which is
    // exactly what "turn 2 knows about turn 1" means.
    const history = contextWindow(session);
    session.turns.push({ role: 'user', content: trimmed, at: new Date().toISOString() });

    let result: ReplTurnResult;
    try {
      result = await deps.send(trimmed, history);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      deps.print(`error: ${message}`);
      // The failed turn stays in the transcript: a session that silently drops
      // the turns that errored is a session you cannot debug.
      session.turns.push({ role: 'agent', content: `error: ${message}`, at: new Date().toISOString(), status: 'error' });
      deps.persist(session);
      continue;
    }

    exchanges += 1;
    session.turns.push({
      role: 'agent',
      content: result.summary,
      at: new Date().toISOString(),
      status: result.status,
    });
    deps.persist(session);

    deps.print(`[${result.status}] ${result.summary}`);
    if (result.findingCount > 0) deps.print(`findings: ${result.findingCount}`);
  }
}
