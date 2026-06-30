/**
 * Canonical gate result value object (W-Contracts).
 *
 * This is the single source of truth for the per-gate check result used by the
 * phase-transition flow. It is the superset of the two interface shapes that
 * previously duplicated it (`{id,passed,description,required}` in the application
 * services barrel and `{id,passed,description,error?}` in domain/interfaces.ts):
 * both `required` and `error?` are present here, so any consumer of either former
 * shape is satisfied structurally.
 *
 * Kept as a dependency-free leaf module so the type/value can be imported by both
 * `domain/interfaces.ts` and `domain/entities/index.ts` without forming an
 * import cycle (entities/index.ts already imports from interfaces.ts).
 */
export class GateResult {
  constructor(
    public readonly id: string,
    public readonly passed: boolean,
    public readonly description: string,
    public readonly required: boolean,
    public readonly error?: string
  ) {}

  static pass(id: string, description: string, required: boolean): GateResult {
    return new GateResult(id, true, description, required);
  }

  static fail(id: string, description: string, required: boolean, error: string): GateResult {
    return new GateResult(id, false, description, required, error);
  }
}
