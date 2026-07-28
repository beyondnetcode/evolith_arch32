import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CHAT_CONTEXT_WINDOW,
  CHAT_SESSION_DIR,
  ChatSessionStore,
  contextWindow,
  type ChatSession,
  type ChatTurn,
} from './chat-session';
import { runChatRepl, REPL_COMMANDS } from './chat-repl';

function turn(content: string, role: ChatTurn['role'] = 'user'): ChatTurn {
  return { role, content, at: '2026-07-27T00:00:00.000Z' };
}

describe('GT-619 · chat session store', () => {
  let workdir: string;

  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), 'evolith-chat-store-'));
  });

  afterEach(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  it('round-trips a transcript through disk', () => {
    const store = new ChatSessionStore(workdir);
    const session = store.create('s1');
    session.turns.push(turn('hello'), turn('hi', 'agent'));
    store.save(session);

    expect(new ChatSessionStore(workdir).load('s1').turns.map((t) => t.content)).toEqual(['hello', 'hi']);
  });

  it('starts a fresh session for an id that was never saved', () => {
    expect(new ChatSessionStore(workdir).load('never-seen').turns).toEqual([]);
  });

  it('survives a corrupt transcript instead of taking the command down', () => {
    mkdirSync(join(workdir, CHAT_SESSION_DIR), { recursive: true });
    writeFileSync(join(workdir, CHAT_SESSION_DIR, 'broken.json'), '{ not json', 'utf8');

    expect(new ChatSessionStore(workdir).load('broken').turns).toEqual([]);
  });

  it('refuses a session id that would escape the session directory', () => {
    // The id becomes a filename; `../../etc/passwd` must not be writable.
    expect(() => new ChatSessionStore(workdir).load('../escape')).toThrow(/Invalid chat session id/);
  });

  it('lists saved sessions', () => {
    const store = new ChatSessionStore(workdir);
    store.save(store.create('b'));
    store.save(store.create('a'));

    expect(store.list()).toEqual(['a', 'b']);
  });

  it('bounds the context handed to the runtime', () => {
    const session: ChatSession = { id: 'x', startedAt: '', turns: [] };
    for (let i = 0; i < CHAT_CONTEXT_WINDOW + 5; i += 1) session.turns.push(turn(`t${i}`));

    const window = contextWindow(session);
    expect(window).toHaveLength(CHAT_CONTEXT_WINDOW);
    expect(window[window.length - 1].content).toBe(`t${CHAT_CONTEXT_WINDOW + 4}`);
  });
});

describe('GT-619 · chat REPL loop', () => {
  function harness(lines: Array<string | null>, send = jest.fn().mockResolvedValue({ status: 'passed', summary: 'ok', findingCount: 0 })) {
    const printed: string[] = [];
    const session: ChatSession = { id: 's', startedAt: '', turns: [] };
    const queue = [...lines];
    return {
      session,
      printed,
      send,
      persist: jest.fn(),
      run: () =>
        runChatRepl(session, {
          readLine: async () => (queue.length === 0 ? null : queue.shift()!),
          send,
          print: (l) => printed.push(l),
          persist: jest.fn(),
        }),
    };
  }

  it('loops until /exit and counts the exchanges', async () => {
    const h = harness(['a', 'b', '/exit', 'never reached']);
    await expect(h.run()).resolves.toEqual({ exchanges: 2, endedBy: 'user' });
  });

  it('ends on EOF (a closed stdin) without an error', async () => {
    const h = harness(['a', null]);
    await expect(h.run()).resolves.toEqual({ exchanges: 1, endedBy: 'eof' });
  });

  it('ignores blank lines instead of sending empty intents', async () => {
    const h = harness(['', '   ', '/exit']);
    await h.run();
    expect(h.send).not.toHaveBeenCalled();
  });

  it('/help lists the slash commands without a round-trip', async () => {
    const h = harness(['/help', '/exit']);
    await h.run();
    expect(h.printed.join('\n')).toContain(REPL_COMMANDS.join(', '));
    expect(h.send).not.toHaveBeenCalled();
  });

  it('/history replays the transcript', async () => {
    const h = harness(['question', '/history', '/exit']);
    await h.run();
    expect(h.printed).toContain('user: question');
    expect(h.printed).toContain('agent: ok');
  });

  it('keeps a failed turn in the transcript and keeps the conversation alive', async () => {
    const send = jest
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce({ status: 'passed', summary: 'recovered', findingCount: 0 });
    const h = harness(['boom', 'again', '/exit'], send);

    const outcome = await h.run();

    // A session that silently drops the turns that errored is a session you
    // cannot debug — and the loop must not die on one bad round-trip.
    expect(outcome.exchanges).toBe(1);
    expect(h.session.turns.map((t) => t.content)).toEqual([
      'boom',
      'error: ECONNREFUSED',
      'again',
      'recovered',
    ]);
  });
});
