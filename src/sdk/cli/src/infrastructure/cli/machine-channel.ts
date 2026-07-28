/**
 * GT-580 — stdout is the machine channel; everything else is a diagnostic.
 *
 * The gap counted 341 `console.log` against 115 `console.error` in this CLI. Most
 * of those are human-mode prose and belong on stdout, but the moment a caller
 * asks for `--format json` (or `--format ndjson`) stdout stops being a display
 * and becomes a pipe into `jq`, an agent harness or a CI step. One stray prose
 * line in front of the ADR-0073 envelope makes the whole document unparseable,
 * and the failure is silent: the command still exits 0.
 *
 * That was not hypothetical. Measured on 2026-07-28, `evolith scaffold --runtime
 * dotnet --format json` emitted eleven `@clack/prompts` progress lines to stdout
 * before its envelope, so `| jq` failed on the first byte.
 *
 * WHY A CHANNEL GUARD RATHER THAN AN AUDIT. Auditing the ~176 non-envelope
 * `console.log` sites fixes today and nothing else: the next command reintroduces
 * the leak, and so does any dependency that prints (`@clack/prompts` writes
 * straight to `process.stdout`, and no amount of discipline in our own sources
 * reaches it). Enforcing the contract at the stream makes it structural — the
 * rule is stated once, in one place, and a new command cannot opt out of it.
 *
 * THE RULE. While a machine format is active, a write to stdout is DATA if it
 * parses as JSON in that format, and a DIAGNOSTIC otherwise. Diagnostics are
 * rerouted to stderr, not dropped: nothing becomes invisible, it just stops
 * corrupting the channel it was never meant to be on. The classification is the
 * contract restated — "stdout carries data only" — so a diagnostic can only slip
 * through by already being valid JSON, in which case the consumer still parses.
 */

/** Output formats whose stdout is a machine channel rather than a display. */
export type MachineFormat = 'json' | 'ndjson';

/**
 * The formats the guard actually arms for.
 *
 * `ndjson` is a member of {@link MachineFormat} because `isMachineData` already
 * knows how to classify a line-delimited stream, but no command emits one yet —
 * the versioned NDJSON event stream is the open half of GT-580. Arming for a
 * format nothing produces would turn `--format ndjson` from "prose on stdout"
 * (wrong, but visible) into "empty stdout, no error" (wrong and silent), so it
 * stays out of this list until a command can fill it.
 */
export const MACHINE_FORMATS = ['json'] as const satisfies readonly MachineFormat[];

export function isMachineFormat(value: unknown): value is MachineFormat {
  return typeof value === 'string' && (MACHINE_FORMATS as readonly string[]).includes(value);
}

/**
 * Read the requested output format out of raw argv.
 *
 * Done on argv rather than on parsed options because the guard has to be armed
 * BEFORE the command graph boots: `@clack/prompts` and Nest both print during
 * startup, and a guard installed after them protects nothing. Accepts every
 * spelling commander does: `--format json`, `--format=json`, `-f json`, `-f=json`.
 *
 * `-f` is kept even though four commands bind it to something else (`--force` on
 * `docs`/`upgrade`, `--from` on `sdlc handoff`/`generate-domain`), because arming
 * needs the VALUE to be exactly `json` and none of those takes `json` as a
 * meaningful value. The residual case (`evolith docs -f json`, a malformed
 * invocation) puts human prose on stderr instead of stdout; the alternative —
 * dropping `-f` — would leave the defect this module exists for in place for a
 * spelling users actually type.
 */
export function detectMachineFormat(argv: readonly string[]): MachineFormat | undefined {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const inline = /^(?:--format|-f)=(.*)$/.exec(arg);
    if (inline) return isMachineFormat(inline[1]) ? inline[1] : undefined;
    if (arg === '--format' || arg === '-f') {
      const next = argv[i + 1];
      if (isMachineFormat(next)) return next;
    }
  }
  return undefined;
}

/**
 * Is this chunk the DATA the machine channel exists for?
 *
 * `json`   — the whole chunk is one JSON object or array.
 * `ndjson` — every non-empty line is one JSON object or array.
 *
 * Requiring an object/array start is deliberate: `JSON.parse` accepts `3` and
 * `"advertencia"`, so a bare scalar would let prose through on a technicality.
 */
export function isMachineData(chunk: string, format: MachineFormat): boolean {
  const parsesAsDocument = (text: string): boolean => {
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  };

  if (format === 'json') return parsesAsDocument(chunk);

  const lines = chunk.split('\n').filter((line) => line.trim().length > 0);
  return lines.length > 0 && lines.every(parsesAsDocument);
}

/** Undo an installed guard. Returned by {@link installMachineChannelGuard}. */
export type RestoreMachineChannel = () => void;

/**
 * Route every non-data stdout write to stderr for the duration of the process.
 *
 * Returns a restore function (the tests use it; the CLI never does — the guard is
 * meant to outlive every command in the run). Returns `undefined` when the
 * invocation asked for no machine format, so a human run keeps its stdout intact.
 */
export function installMachineChannelGuard(
  argv: readonly string[] = process.argv,
  streams: { stdout: NodeJS.WriteStream; stderr: NodeJS.WriteStream } = {
    stdout: process.stdout,
    stderr: process.stderr,
  },
): RestoreMachineChannel | undefined {
  const format = detectMachineFormat(argv);
  if (!format) return undefined;

  const { stdout, stderr } = streams;
  // Captured as a descriptor so `restore()` puts the stream back EXACTLY as it
  // was — most streams inherit `write` from the prototype, and assigning a bound
  // copy back would leave an own property behind that nothing else expects.
  const previous = Object.getOwnPropertyDescriptor(stdout, 'write');
  const originalWrite = stdout.write.bind(stdout) as NodeJS.WriteStream['write'];

  const guarded: NodeJS.WriteStream['write'] = function guardedWrite(
    this: unknown,
    chunk: unknown,
    encoding?: unknown,
    callback?: unknown,
  ): boolean {
    const text = typeof chunk === 'string'
      ? chunk
      : Buffer.isBuffer(chunk)
        ? chunk.toString('utf8')
        : undefined;

    // Anything we cannot read as text is left alone rather than guessed at.
    if (text === undefined || isMachineData(text, format)) {
      return (originalWrite as (...args: unknown[]) => boolean)(chunk, encoding, callback);
    }
    return (stderr.write as unknown as (...args: unknown[]) => boolean)(chunk, encoding, callback);
  } as NodeJS.WriteStream['write'];

  stdout.write = guarded;
  return () => {
    if (previous) Object.defineProperty(stdout, 'write', previous);
    else delete (stdout as unknown as { write?: unknown }).write;
  };
}
