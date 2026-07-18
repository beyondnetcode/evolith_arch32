/**
 * IWorkspaceContextPort — the runtime's seam for ASSEMBLING the real workspace
 * context that the stateless Core evaluates INLINE (GT-438 / ADR-0101).
 *
 * The Core keeps no filesystem: it evaluates exactly the satellite content it is
 * handed in `evaluationInput.files` ("Tracker builds context, Core evaluates" —
 * the same in-memory `OverlayFileSystem` ingestion the Core uses). Without a real
 * assembly the runtime sends an EMPTY context and the Core — correctly — reports
 * GOV-000-style "nothing to evaluate" findings. This port lets the runtime gather
 * the relevant workspace files (evolith.yaml + governance artifacts) and pass them
 * inline, so the governed `evaluate()` runs against actual content.
 *
 * It is an OPTIONAL dependency of the runtime: when no assembler is wired the
 * runtime preserves the prior behaviour (workspaceRef/passthrough only). The
 * concrete adapter may read a mounted corpus from disk, pull from the Tracker, or
 * serve a deterministic fixture in tests — the runtime does not care.
 */

/** What the runtime knows about the workspace to assemble for this evaluation. */
export interface WorkspaceContextRequest {
  /** Opaque workspace reference the caller supplied (ADR-0074 — never a raw path). */
  readonly workspaceRef?: string;
  /** SDLC phase anchoring the evaluation (lets an assembler scope what it collects). */
  readonly phase?: string;
  /** Correlation id echoed for tracing. */
  readonly correlationId?: string;
  /** Arbitrary caller-supplied context, echoed — never interpreted by the port. */
  readonly passthrough?: Readonly<Record<string, unknown>>;
}

/** The assembled inline satellite content, ready to travel as `evaluationInput.files`. */
export interface AssembledWorkspaceContext {
  /**
   * Map of RELATIVE posix path -> file content (the exact shape the Core's
   * `evaluationInput.files` / `OverlayFileSystem` expects). Empty when the
   * assembler found nothing relevant — the runtime then falls back to the
   * workspaceRef path rather than sending an empty inline map.
   */
  readonly files: Readonly<Record<string, string>>;
  /** Opaque ref the content was assembled from (audit/repro). */
  readonly sourceRef?: string;
  /** True when the assembler hit a file/byte budget and stopped early. */
  readonly truncated?: boolean;
}

export interface IWorkspaceContextPort {
  /** Gather the workspace files to evaluate inline. Best-effort content, never disk state on the Core. */
  assemble(request: WorkspaceContextRequest): Promise<AssembledWorkspaceContext>;
}
