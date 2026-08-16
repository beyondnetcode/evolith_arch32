# GT-584 · ADR-0111 — probabilistic evidence may not reach a blocking verdict unmeasured.
#
# ADR-0111 gave `Evidence` a `determinism` field. Nothing ever read it as a
# CONDITION for blocking, so the day a non-deterministic provider is pointed at
# something that matters its finding is admissible by default and unmeasured.
# This policy is that condition, in the OPA engine. Its native TypeScript twin is
# `ProbabilisticEvidenceRuleHandler`, over
# `application/validators/architecture/signal-admissibility.ts` (R-25).
#
# Reads `input.qualityEvidence` — the inline `Evidence[]` of ADR-0111 §2, projected
# onto the OPA input as a declared fact. Absent evidence yields NO violations: a
# dimension with no evidence is `no-evidence`, never a failure the Core caused
# (ADR-0111 §3).
#
# FAIL-CLOSED, three times over. An item that does not say
# `determinism: "deterministic"` is read as a guess, including one that says nothing
# at all. Absent calibration means CANNOT-BLOCK, never "assume good". And an
# evaluation that does not declare `input.evaluationDate` cannot tell how old a
# measurement is, so it refuses to call any of them fresh.
#
# NO `time.*` BUILTIN APPEARS BELOW, AND THAT IS DELIBERATE. This repository ships
# its policy as a wasm bundle (`compile-opa-wasm.mjs`), and the `opa-wasm` runtime
# `OpaEvaluator` loads does NOT implement the time builtins: a policy calling
# `time.parse_rfc3339_ns` passes `opa test` and then throws
# `not implemented: built-in function 24` at runtime, which `OpaEvaluator` turns into
# "OPA engine error — enforcement blocked" for EVERY rule in the run. Staleness is
# therefore computed from the calendar date with plain arithmetic, at day
# granularity, which is also the granularity the native twin uses.
#
# The thresholds are DECLARED POLICY, not measurement. They match
# `DEFAULT_ADMISSIBILITY_POLICY` so a Core heuristic and an external provider are
# read on one scale, and they stay arguable — overridable per evaluation via
# `input.qualityAdmissibilityPolicy` — until GT-585 produces measured rates.
package evolith.probabilistic_evidence_admissibility

import rego.v1

# --- Declared policy (theta1, theta2, theta3) -------------------------------

default_min_tpr := 0.95

default_min_tnr := 0.95

default_max_age_days := 180

min_tpr := object.get(input, ["qualityAdmissibilityPolicy", "minTruePositiveRate"], default_min_tpr)

min_tnr := object.get(input, ["qualityAdmissibilityPolicy", "minTrueNegativeRate"], default_min_tnr)

max_age_days := object.get(input, ["qualityAdmissibilityPolicy", "maxCalibrationAgeDays"], default_max_age_days)

# --- Calendar arithmetic (days since 1970-01-01, Hinnant's days_from_civil) --
#
# Accepts a leading `YYYY-MM-DD`, so both a plain date and a full RFC-3339 instant
# read the same. Undefined for anything else — and every caller below treats
# "undefined" as "cannot judge", never as "fine".

month_shift(m) := 1 if m <= 2

month_shift(m) := 0 if m > 2

month_index(m) := m - 3 if m >= 3

month_index(m) := m + 9 if m < 3

epoch_day(text) := days if {
	parts := split(substring(text, 0, 10), "-")
	count(parts) == 3
	year := to_number(parts[0])
	month := to_number(parts[1])
	day := to_number(parts[2])
	year >= 1
	month >= 1
	month <= 12
	day >= 1
	day <= 31
	shifted := year - month_shift(month)
	era := floor(shifted / 400)
	yoe := shifted - (era * 400)
	doy := (floor(((153 * month_index(month)) + 2) / 5) + day) - 1
	doe := (((yoe * 365) + floor(yoe / 4)) - floor(yoe / 100)) + doy
	days := ((era * 146097) + doe) - 719468
}

# --- Classification ---------------------------------------------------------

# Only an explicit "deterministic" is not a guess. Anything else — "probabilistic",
# a typo, or a missing field — is treated as one.
is_guess(ev) if {
	ev.determinism != "deterministic"
}

is_guess(ev) if {
	not ev.determinism
}

# A calibration exists only when all three fields the rule reads are present and
# of the right kind. A half-filled block is not a measurement.
has_calibration(ev) if {
	is_number(ev.calibration.truePositiveRate)
	is_number(ev.calibration.trueNegativeRate)
	is_string(ev.calibration.measuredAt)
}

meets_thresholds(ev) if {
	ev.calibration.truePositiveRate >= min_tpr
	ev.calibration.trueNegativeRate >= min_tnr
}

# Undefined when either date is unreadable, or when the caller declared no
# evaluation date at all — which is the fail-closed case: an age nobody can compute
# is not an age within the limit.
age_days(ev) := age if {
	measured := epoch_day(ev.calibration.measuredAt)
	evaluated := epoch_day(input.evaluationDate)
	age := evaluated - measured
}

is_fresh(ev) if {
	age_days(ev) <= max_age_days
}

label(ev) := sprintf("%v/%v", [object.get(ev, "source", "unknown"), object.get(ev, "dimension", "unknown")])

# `admissible` is the affirmative half — the set of evidence that MAY block. It is
# exported so a consumer asks "may this block?" rather than remembering to check
# `determinism` for itself.
admissible contains label(ev) if {
	ev := input.qualityEvidence[_]
	not is_guess(ev)
}

admissible contains label(ev) if {
	ev := input.qualityEvidence[_]
	is_guess(ev)
	has_calibration(ev)
	meets_thresholds(ev)
	is_fresh(ev)
}

# --- PEA-01: probabilistic and never measured -------------------------------

violations contains {"id": "PEA-01", "message": msg} if {
	ev := input.qualityEvidence[_]
	is_guess(ev)
	not has_calibration(ev)
	msg := sprintf(
		"Probabilistic signal (%v) declares no measured error rate. It is reported as advisory: a governance verdict must not block on an unmeasured guess (GT-584).",
		[label(ev)],
	)
}

# --- PEA-02: measured, but below theta1/theta2 ------------------------------

violations contains {"id": "PEA-02", "message": msg} if {
	ev := input.qualityEvidence[_]
	is_guess(ev)
	has_calibration(ev)
	not meets_thresholds(ev)
	msg := sprintf(
		"Probabilistic signal (%v) measured at TPR %v, TNR %v — below the declared admissibility floor (TPR >= %v, TNR >= %v).",
		[label(ev), ev.calibration.truePositiveRate, ev.calibration.trueNegativeRate, min_tpr, min_tnr],
	)
}

# --- PEA-03: measured too long ago, or at a date nobody can read ------------

violations contains {"id": "PEA-03", "message": msg} if {
	ev := input.qualityEvidence[_]
	is_guess(ev)
	has_calibration(ev)
	meets_thresholds(ev)
	not is_fresh(ev)
	msg := sprintf(
		"Probabilistic signal (%v) whose calibration (%v) is beyond the %v-day limit, or cannot be dated against the evaluation date. A measurement of an older provider is not a measurement of this one.",
		[label(ev), ev.calibration.measuredAt, max_age_days],
	)
}

# --- PEA-04: an admitted measurement says how it was obtained ---------------

violations contains {"id": "PEA-04", "message": msg} if {
	ev := input.qualityEvidence[_]
	is_guess(ev)
	has_calibration(ev)
	meets_thresholds(ev)
	is_fresh(ev)
	missing := [f |
		some f in ["sampleSize", "method", "labelledBy"]
		not ev.calibration[f]
	]
	count(missing) > 0
	msg := sprintf(
		"Probabilistic signal (%v) is admitted for blocking but does not say how it was measured (missing: %v). A rate nobody can judge is the number that will be disputed after the first wrong block.",
		[label(ev), concat(", ", missing)],
	)
}
