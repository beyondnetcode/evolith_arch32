/**
 * GT-585 — gate calibration: measuring how often a gate is WRONG, per ruleset.
 *
 * Pure arithmetic. The label corpus it consumes does not exist yet — it needs humans overriding
 * gate decisions in production (GT-435/GT-448) — and that is exactly why the instrument is built
 * first: a figure that is derivable the moment labels exist beats one retrofitted afterwards by
 * whoever needs the number to look good.
 */
export * from './confusion-matrix';
export * from './calibration-report';
