// Neither of these has a body, so neither is fingerprinted: structurally identical
// type shapes are the norm in a well-factored codebase, not a copy-paste incident.
export interface Row {
  readonly value: number;
}

export const LABEL = 'summary';

// A Type-2 clone of applyDiscount: same structure, every identifier and literal
// renamed. The original survives in src/shared/pricing.ts, so this is a COPY.
export function applyRebate(amount: number, factor: number): number {
  const rebated = amount - amount * factor;
  if (rebated < 0) {
    return 0;
  }
  return Math.round(rebated * 100) / 100;
}

// Structurally different from anything in rev-a: this is NOVEL, not a refactor.
export function summarize(rows: readonly number[]): number {
  let total = 0;
  for (const row of rows) {
    total += row;
  }
  return total;
}

// @ts-expect-error deliberate suppression, counted as a masked diagnostic
export const brokenOnPurpose: number = 'not a number';

export const load = (source: { read(): Promise<number> }): Promise<number | void> =>
  source.read().catch(() => {});
