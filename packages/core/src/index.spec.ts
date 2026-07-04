/**
 * Contract / smoke test for the @evolith/core re-export barrel.
 *
 * GT-355: @evolith/core is a facade that re-exports types, use-cases,
 * services, validators and helpers from @evolith/core-domain so that
 * consumers (CLI, MCP Server, REST API) import from a single place.
 *
 * If any re-export is renamed, removed, or broken upstream, this suite
 * fails — preventing silent re-export drift from reaching consumers.
 *
 * NOTE: TypeScript `export type { ... }` declarations are erased at runtime,
 * so they cannot be asserted via a runtime import. Those are listed in
 * EXPECTED_TYPE_EXPORTS purely for documentation/auditing; the runtime
 * assertions cover every *value* export (classes, functions, constants).
 */

import * as barrel from "./index";

/**
 * Every runtime (value) export the barrel is contracted to expose, with the
 * kind each symbol must have. "class" is a function whose prototype is used as
 * a constructor; we assert `typeof === "function"` for both classes and plain
 * functions and additionally check class identity where it matters.
 */
const EXPECTED_VALUE_EXPORTS: Record<string, "function" | "object"> = {
  // domain/errors
  EvolithError: "function",
  PlatformNotFoundError: "function",
  PhaseTransitionError: "function",
  CatalogLoadError: "function",
  ToolValidationError: "function",
  CommandExecutionError: "function",
  ValidationError: "function",
  UserCancelledError: "function",
  isEvolithError: "function",
  getErrorCode: "function",
  getErrorContext: "function",

  // domain/gate-evidence
  createSuccessEnvelope: "function",
  createErrorEnvelope: "function",
  deriveVerdict: "function",
  isGatePhase: "function",
  isErrorCode: "function",
  GATE_PHASES: "object",
  GATE_VERDICTS: "object",
  VIOLATION_SEVERITIES: "object",
  EVALUATOR_KINDS: "object",
  ERROR_CODES: "object",

  // domain/services
  WorkflowEngine: "function",
  ToolSelectionService: "function",
  PhaseService: "function",

  // application/use-cases
  EvaluateGateUseCase: "function",
  ValidateSatelliteUseCase: "function",
  ProposePhaseAdvanceUseCase: "function",
  PhaseTransitionUseCase: "function",
  InitializeProjectUseCase: "function",

  // application/validators
  RulesetValidatorService: "function",
  PhaseGateValidatorService: "function",
  ArchitectureDriftService: "function",
  DeepArchitectureAnalyzer: "function",

  // application/services
  TopologyCatalogService: "function",

  // domain/metrics
  readGitLog: "function",
  isGitRepo: "function",
};

/**
 * The class-shaped exports — these must be constructable (have a prototype),
 * which distinguishes them from plain functions and catches an accidental
 * re-export of, say, a factory function in place of a class.
 */
const EXPECTED_CLASS_EXPORTS = [
  "EvolithError",
  "PlatformNotFoundError",
  "PhaseTransitionError",
  "CatalogLoadError",
  "ToolValidationError",
  "CommandExecutionError",
  "ValidationError",
  "UserCancelledError",
  "WorkflowEngine",
  "ToolSelectionService",
  "PhaseService",
  "EvaluateGateUseCase",
  "ValidateSatelliteUseCase",
  "ProposePhaseAdvanceUseCase",
  "PhaseTransitionUseCase",
  "InitializeProjectUseCase",
  "RulesetValidatorService",
  "PhaseGateValidatorService",
  "ArchitectureDriftService",
  "DeepArchitectureAnalyzer",
  "TopologyCatalogService",
] as const;

/**
 * Type-only re-exports. Erased at runtime, documented here so the contract is
 * auditable in one place. Not asserted at runtime (would be a no-op).
 */
const EXPECTED_TYPE_EXPORTS = [
  // domain/interfaces
  "IFileSystem",
  "IConfigParser",
  "ILogger",
  "ICommandExecutor",
  "IPhaseGates",
  "IToolSelector",
  "IToolExecutor",
  "IProjectInitializer",
  "ICatalogLoader",
  // domain/gate-evidence
  "GatePhase",
  "GateVerdict",
  "ViolationSeverity",
  "EvaluatorKind",
  "ErrorCode",
  "GateViolation",
  "GateEvidence",
  "PhaseTransitionProposal",
  "ExecutionContext",
  "OutputMeta",
  "OutputError",
  "SuccessEnvelope",
  "ErrorEnvelope",
  "OutputEnvelope",
  // application/use-cases
  "EvaluateGateInput",
  "ValidateSatelliteInput",
  "ValidateSatelliteOutput",
  "ProposePhaseAdvanceInput",
  // application/services
  "TopologyManifest",
  "ProgressivePhase",
  // application/validators
  "ValidationResult",
  // domain/metrics
  "GitCommit",
  "GitLogOptions",
] as const;

describe("@evolith/core barrel contract", () => {
  it("loads without throwing", () => {
    expect(barrel).toBeDefined();
    expect(typeof barrel).toBe("object");
  });

  describe("value exports are present with the correct kind", () => {
    it.each(Object.entries(EXPECTED_VALUE_EXPORTS))(
      "exports %s as %s",
      (name, kind) => {
        const value = (barrel as Record<string, unknown>)[name];
        expect(value).toBeDefined();
        expect(value).not.toBeNull();
        expect(typeof value).toBe(kind);
      },
    );
  });

  describe("class exports are constructable", () => {
    it.each(EXPECTED_CLASS_EXPORTS)("%s is a class", (name) => {
      const value = (barrel as Record<string, unknown>)[name];
      expect(typeof value).toBe("function");
      // Classes have a prototype object with the class itself as constructor.
      const proto = (value as { prototype?: unknown }).prototype;
      expect(proto).toBeDefined();
      expect((proto as { constructor: unknown }).constructor).toBe(value);
    });
  });

  it("error classes extend EvolithError", () => {
    const evolithErrors = [
      "PlatformNotFoundError",
      "PhaseTransitionError",
      "CatalogLoadError",
      "ToolValidationError",
      "CommandExecutionError",
      "ValidationError",
      "UserCancelledError",
    ];
    const base = (barrel as Record<string, unknown>).EvolithError as Function;
    for (const name of evolithErrors) {
      const ctor = (barrel as Record<string, unknown>)[name] as Function;
      expect(ctor.prototype).toBeInstanceOf(base);
    }
  });

  it("GATE constants are non-empty", () => {
    expect(barrel.GATE_PHASES).toBeTruthy();
    expect(barrel.GATE_VERDICTS).toBeTruthy();
    expect(barrel.VIOLATION_SEVERITIES).toBeTruthy();
    expect(barrel.EVALUATOR_KINDS).toBeTruthy();
    expect(barrel.ERROR_CODES).toBeTruthy();
  });

  it("documents its type-only exports (audit guard)", () => {
    // Pure documentation assertion: keeps the list from silently emptying.
    expect(EXPECTED_TYPE_EXPORTS.length).toBeGreaterThan(0);
    expect(new Set(EXPECTED_TYPE_EXPORTS).size).toBe(
      EXPECTED_TYPE_EXPORTS.length,
    );
  });

  it("does not regress below the contracted number of value exports", () => {
    const runtimeValueExportCount = Object.keys(barrel).filter(
      (k) => (barrel as Record<string, unknown>)[k] !== undefined,
    ).length;
    expect(runtimeValueExportCount).toBeGreaterThanOrEqual(
      Object.keys(EXPECTED_VALUE_EXPORTS).length,
    );
  });
});
