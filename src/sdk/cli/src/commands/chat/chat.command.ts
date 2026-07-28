import { Command, Option } from 'nest-commander';
import { randomUUID } from 'node:crypto';
import { BaseEvolithCommand } from '../../infrastructure/cli/base-command';
import { PromptService } from '../../infrastructure/prompts/prompt.service';
import { AgentRuntimeFactory } from '../../infrastructure/agent/agent-runtime.factory';
import {
  createSuccessEnvelope,
  createErrorEnvelope,
  OUTPUT_ENVELOPE_SCHEMA_VERSION,
  type OutputMeta,
} from '@beyondnet/evolith-core-domain/domain/gate-evidence';
import { UserCancelledError } from '@beyondnet/evolith-core-domain/domain/errors';
import { CLI_EXIT_CODES, setExitCode } from '../../infrastructure/cli/exit-codes';
import { ChatSessionStore, contextWindow, type ChatSession, type ChatTurn } from './chat-session';
import { runChatRepl, type ReplTurnResult } from './chat-repl';

interface ChatCommandOptions {
  format?: string;
  dryRun?: boolean;
  session?: string;
  /** Force the single-shot path even from a terminal (scripts, demos). */
  once?: boolean;
}

/**
 * GT-619 — `chat` was 91 lines with no loop and no session: it printed, called
 * the runtime once, printed and exited. The command is KEPT rather than removed
 * because the Agent Runtime it fronts is real and the MCP/REST surfaces expose
 * the same operation; what was missing was the conversation, not the backend.
 * So it now has both halves it was named for:
 *
 *   - a REPL, when a human is at the keyboard, and
 *   - a session, persisted under `.evolith/chat-sessions/<id>.json`, so turn N
 *     is sent WITH turns 1..N-1 and `--session <id>` resumes a conversation
 *     across processes.
 *
 * GT-611 constrains the shape: a REPL needs a TTY, so a non-interactive
 * invocation (a pipe, CI, `--format json`) keeps the single-shot behaviour and
 * the ADR-0073 envelope, and never opens a loop nobody can answer.
 */
@Command({
  name: 'chat',
  description: 'Conversational REPL over the Evolith Agent Runtime (session-backed)',
})
export class ChatCommand extends BaseEvolithCommand {
  constructor(promptService: PromptService) {
    super('ChatCommand', promptService);
  }

  async executeCommand(passed: string[], options?: ChatCommandOptions): Promise<void> {
    const json = options?.format === 'json';
    const startedAt = Date.now();
    const meta = (correlationId: string): OutputMeta => ({
      command: 'evolith chat',
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      correlationId,
      schemaVersion: OUTPUT_ENVELOPE_SCHEMA_VERSION,
    });

    const store = new ChatSessionStore();
    const sessionId = options?.session ?? randomUUID();
    const session = options?.session ? store.load(options.session) : store.create(sessionId);

    const message = passed.join(' ').trim();

    // A loop is only legitimate when there is somebody to answer it. `--format
    // json` is a machine read, `--once` is an explicit opt-out, and a message on
    // the command line is a single-shot request by construction.
    const replPossible =
      !json && !options?.once && message === '' && this.promptService.isInteractive();

    if (replPossible) {
      return this.runRepl(session, store, options);
    }

    if (!message) {
      const problem = this.promptService.isInteractive()
        ? 'Message or intent required'
        : 'Message or intent required (a REPL needs a TTY; pass the message as an argument)';
      if (json) {
        setExitCode(CLI_EXIT_CODES.INVALID_INPUT);
        console.log(JSON.stringify(createErrorEnvelope('VALIDATION_FAILED', problem, meta(sessionId)), null, 2));
      } else {
        setExitCode(CLI_EXIT_CODES.INVALID_INPUT);
        this.promptService.showError(problem);
      }
      return;
    }

    // Single-shot, but still session-aware: `--session <id> "next question"`
    // continues an existing conversation from a script.
    const history = contextWindow(session);
    try {
      if (!json) this.promptService.showInfo(`Processing intent via Agent Runtime: "${message}"`);
      const result = await this.send(session, message, history, options);

      // A single-shot turn is still a turn: recording it is what makes a
      // sequence of `--session <id> "…"` invocations a conversation rather than
      // N unrelated requests.
      const at = new Date().toISOString();
      session.turns.push({ role: 'user', content: message, at });
      session.turns.push({ role: 'agent', content: result.summary, at, status: result.status });
      if (options?.session) store.save(session);

      if (json) {
        console.log(JSON.stringify(createSuccessEnvelope({ sessionId: session.id, turns: session.turns.length, result }, meta(session.id)), null, 2));
      } else {
        this.promptService.showSuccess(`Status: ${result.status}`);
        if (result.summary) console.log(`Summary: ${result.summary}`);
        if (result.findingCount > 0) console.log(`Findings: ${result.findingCount}`);
      }
    } catch (err) {
      const failure = err instanceof Error ? err.message : String(err);
      setExitCode(CLI_EXIT_CODES.TOOL_FAILURE);
      if (json) {
        console.log(JSON.stringify(createErrorEnvelope('INTERNAL_ERROR', failure, meta(session.id)), null, 2));
      } else {
        this.promptService.showError(`Agent Runtime error: ${failure}`);
      }
    }
  }

  /** Wire one turn to the runtime, carrying the conversation so far as context. */
  private async send(
    session: ChatSession,
    intent: string,
    history: readonly ChatTurn[],
    options?: ChatCommandOptions,
  ): Promise<ReplTurnResult> {
    const result = await AgentRuntimeFactory.executeChat({
      intent,
      dry_run: options?.dryRun,
      // The session id IS the correlation id, so every turn of one conversation
      // joins to the same thread on the Tracker side.
      correlation_id: session.id,
      parameters: { history: history.map((t) => ({ role: t.role, content: t.content })) },
    });
    return { status: result.status, summary: result.summary, findingCount: result.findings.length };
  }

  private async runRepl(
    session: ChatSession,
    store: ChatSessionStore,
    options?: ChatCommandOptions,
  ): Promise<void> {
    this.promptService.showIntro(`Evolith chat — session ${session.id}`);
    if (session.turns.length > 0) {
      this.promptService.showInfo(`Resuming with ${session.turns.length} prior turn(s). /help for commands.`);
    } else {
      this.promptService.showInfo('Type /help for commands, /exit to leave.');
    }

    const outcome = await runChatRepl(session, {
      readLine: async () => {
        try {
          return await this.promptService.text({ message: 'you' });
        } catch (err) {
          // Ctrl-C / Ctrl-D end the conversation; they are not command failures.
          if (err instanceof UserCancelledError) return null;
          throw err;
        }
      },
      send: (intent, history) => this.send(session, intent, history, options),
      print: (line) => console.log(line),
      persist: (s) => store.save(s),
    });

    store.save(session);
    this.promptService.showOutro(
      `Session ${session.id} saved — ${outcome.exchanges} exchange(s), ${session.turns.length} turn(s).`,
    );
  }

  @Option({ flags: '--dry-run [boolean]', description: 'Override default dry run behavior' })
  parseDryRun(val: string): boolean {
    return val !== 'false';
  }

  @Option({
    flags: '-f, --format <string>',
    description: 'Output format: json (ADR-0073 envelope) or human (default)',
  })
  parseFormat(val: string): string {
    return val;
  }

  @Option({
    flags: '--session [id]',
    description: 'Resume (or name) a persisted conversation under .evolith/chat-sessions',
  })
  parseSession(val: string): string {
    return val;
  }

  @Option({ flags: '--once', description: 'Single-shot mode: never open the REPL' })
  parseOnce(): boolean {
    return true;
  }
}
