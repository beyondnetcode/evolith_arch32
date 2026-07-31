# GT-584 — the negative half is the point of this file.
#
# A policy that only ever demonstrates its own PASS is the shape of the false green
# this board keeps finding. Every rule below is exercised twice: once on evidence it
# must admit, and once on evidence it must refuse. The refusals are the licence to
# use a model inside a verdict at all.
package evolith.probabilistic_evidence_admissibility_test

import rego.v1

import data.evolith.probabilistic_evidence_admissibility as pea

# The instant every staleness assertion is measured against. Never the wall clock:
# a test whose verdict changes with the calendar is not a test.
now := "2026-07-31T00:00:00Z"

fresh_calibration := {
	"truePositiveRate": 0.97,
	"trueNegativeRate": 0.96,
	"measuredAt": "2026-06-01T00:00:00Z",
	"sampleSize": 400,
	"method": "hand-labelled corpus, two raters",
	"labelledBy": "architecture-panel",
}

llm(calibration) := {
	"source": "llm-auditor",
	"dimension": "code-quality",
	"determinism": "probabilistic",
	"findings": [{"code": "god-class", "severity": "high", "message": "god class"}],
	"calibration": calibration,
}

lighthouse := {
	"source": "lighthouse",
	"dimension": "performance",
	"determinism": "deterministic",
	"findings": [{"code": "lcp", "severity": "high", "message": "slow LCP"}],
}

ctx(evidence) := {"qualityEvidence": evidence, "evaluationDate": now}

ids(violations) := {v.id | some v in violations}

# --- The affirmative half ---------------------------------------------------

test_no_quality_evidence_yields_no_violations if {
	violations := pea.violations with input as {"evaluationDate": now}
	count(violations) == 0
}

test_empty_quality_evidence_yields_no_violations if {
	violations := pea.violations with input as ctx([])
	count(violations) == 0
}

test_deterministic_evidence_needs_no_error_rate if {
	violations := pea.violations with input as ctx([lighthouse])
	count(violations) == 0
}

test_deterministic_evidence_is_admissible if {
	admissible := pea.admissible with input as ctx([lighthouse])
	admissible == {"lighthouse/performance"}
}

test_freshly_calibrated_probabilistic_evidence_is_admitted if {
	violations := pea.violations with input as ctx([llm(fresh_calibration)])
	count(violations) == 0
}

test_freshly_calibrated_probabilistic_evidence_appears_in_admissible if {
	admissible := pea.admissible with input as ctx([llm(fresh_calibration)])
	admissible == {"llm-auditor/code-quality"}
}

# --- PEA-01: probabilistic and never measured (the negative test) -----------

test_uncalibrated_probabilistic_evidence_is_refused if {
	violations := pea.violations with input as ctx([object.remove(llm(fresh_calibration), ["calibration"])])
	ids(violations) == {"PEA-01"}
}

test_uncalibrated_probabilistic_evidence_is_not_admissible if {
	admissible := pea.admissible with input as ctx([object.remove(llm(fresh_calibration), ["calibration"])])
	count(admissible) == 0
}

test_half_filled_calibration_is_not_a_measurement if {
	violations := pea.violations with input as ctx([llm({"truePositiveRate": 0.99, "trueNegativeRate": 0.99})])
	ids(violations) == {"PEA-01"}
}

test_a_rate_that_is_not_a_number_is_not_a_measurement if {
	violations := pea.violations with input as ctx([llm(object.union(fresh_calibration, {"truePositiveRate": "high"}))])
	ids(violations) == {"PEA-01"}
}

# FAIL-CLOSED: evidence that says nothing about its own determinism is a guess.
test_evidence_with_no_determinism_field_is_read_as_a_guess if {
	nameless := object.remove(object.remove(llm(fresh_calibration), ["calibration"]), ["determinism"])
	violations := pea.violations with input as ctx([nameless])
	ids(violations) == {"PEA-01"}
}

test_evidence_with_an_unknown_determinism_word_is_read_as_a_guess if {
	weird := object.union(object.remove(llm(fresh_calibration), ["calibration"]), {"determinism": "maybe"})
	violations := pea.violations with input as ctx([weird])
	ids(violations) == {"PEA-01"}
}

# --- PEA-02: measured, but below the floor ----------------------------------

test_true_positive_rate_below_the_floor_is_refused if {
	violations := pea.violations with input as ctx([llm(object.union(fresh_calibration, {"truePositiveRate": 0.6}))])
	ids(violations) == {"PEA-02"}
}

# The false-BLOCK side of the matrix, which is the side that costs a merge.
test_true_negative_rate_below_the_floor_is_refused if {
	violations := pea.violations with input as ctx([llm(object.union(fresh_calibration, {"trueNegativeRate": 0.5}))])
	ids(violations) == {"PEA-02"}
}

test_below_threshold_evidence_is_not_admissible if {
	admissible := pea.admissible with input as ctx([llm(object.union(fresh_calibration, {"truePositiveRate": 0.6}))])
	count(admissible) == 0
}

test_the_floor_is_arguable_and_a_lax_policy_admits_the_same_signal if {
	weak := llm(object.union(fresh_calibration, {"truePositiveRate": 0.6, "trueNegativeRate": 0.6}))
	lax := object.union(ctx([weak]), {"qualityAdmissibilityPolicy": {
		"minTruePositiveRate": 0.5,
		"minTrueNegativeRate": 0.5,
	}})
	violations := pea.violations with input as lax
	count(violations) == 0
}

# --- PEA-03: stale or unreadable --------------------------------------------

test_stale_calibration_is_refused if {
	violations := pea.violations with input as ctx([llm(object.union(fresh_calibration, {"measuredAt": "2020-01-01T00:00:00Z"}))])
	ids(violations) == {"PEA-03"}
}

test_unparseable_measured_at_is_refused if {
	violations := pea.violations with input as ctx([llm(object.union(fresh_calibration, {"measuredAt": "last tuesday"}))])
	ids(violations) == {"PEA-03"}
}

# FAIL-CLOSED: no evaluation date means no way to tell how old a measurement is,
# and an age nobody can compute is not an age within the limit.
test_an_evaluation_with_no_date_cannot_call_any_measurement_fresh if {
	violations := pea.violations with input as {"qualityEvidence": [llm(fresh_calibration)]}
	ids(violations) == {"PEA-03"}
}

# The policy must reach a verdict WITHOUT any `time.*` builtin: the wasm runtime
# this repository ships does not implement them, and a policy that calls one throws
# at runtime while passing here.
test_the_policy_calls_no_time_builtin if {
	# A date far in the past decided purely by calendar arithmetic.
	violations := pea.violations with input as ctx([llm(object.union(fresh_calibration, {"measuredAt": "1970-01-01"}))])
	ids(violations) == {"PEA-03"}
}

test_a_plain_date_and_a_full_instant_are_read_the_same if {
	plain := pea.violations with input as ctx([llm(object.union(fresh_calibration, {"measuredAt": "2026-06-01"}))])
	instant := pea.violations with input as ctx([llm(object.union(fresh_calibration, {"measuredAt": "2026-06-01T13:45:00Z"}))])
	count(plain) == 0
	count(instant) == 0
}

test_stale_calibration_is_not_admissible if {
	admissible := pea.admissible with input as ctx([llm(object.union(fresh_calibration, {"measuredAt": "2020-01-01T00:00:00Z"}))])
	count(admissible) == 0
}

test_a_measurement_at_the_age_limit_is_still_fresh if {
	# 2026-02-01 -> 2026-07-31 is 180 days: the boundary belongs to the admitted side.
	violations := pea.violations with input as ctx([llm(object.union(fresh_calibration, {"measuredAt": "2026-02-01T00:00:00Z"}))])
	count(violations) == 0
}

test_one_day_past_the_age_limit_is_stale if {
	violations := pea.violations with input as ctx([llm(object.union(fresh_calibration, {"measuredAt": "2026-01-31T00:00:00Z"}))])
	ids(violations) == {"PEA-03"}
}

# --- PEA-04: an admitted measurement says how it was obtained ---------------

test_admitted_evidence_without_measurement_metadata_is_flagged_but_not_blocked if {
	bare := llm({
		"truePositiveRate": 0.97,
		"trueNegativeRate": 0.96,
		"measuredAt": "2026-06-01T00:00:00Z",
	})
	violations := pea.violations with input as ctx([bare])
	ids(violations) == {"PEA-04"}

	# Still admissible: the missing metadata makes the measurement harder to
	# defend, it does not make the measurement wrong.
	admissible := pea.admissible with input as ctx([bare])
	admissible == {"llm-auditor/code-quality"}
}

test_pea_04_names_every_missing_field if {
	bare := llm({
		"truePositiveRate": 0.97,
		"trueNegativeRate": 0.96,
		"measuredAt": "2026-06-01T00:00:00Z",
		"method": "hand-labelled corpus",
	})
	violations := pea.violations with input as ctx([bare])
	some v in violations
	v.id == "PEA-04"
	contains(v.message, "sampleSize, labelledBy")
}

test_pea_04_does_not_fire_on_evidence_that_was_already_refused if {
	# An uncalibrated signal has no measurement metadata to declare either; only
	# PEA-01 should speak, or the report double-counts one defect.
	violations := pea.violations with input as ctx([object.remove(llm(fresh_calibration), ["calibration"])])
	ids(violations) == {"PEA-01"}
}

# --- A mixed batch: every item is judged on its own -------------------------

test_a_mixed_batch_refuses_only_what_it_must if {
	batch := [
		lighthouse,
		llm(fresh_calibration),
		object.remove(llm(fresh_calibration), ["calibration"]),
		llm(object.union(fresh_calibration, {"truePositiveRate": 0.4})),
		llm(object.union(fresh_calibration, {"measuredAt": "2019-01-01T00:00:00Z"})),
	]
	violations := pea.violations with input as ctx(batch)
	ids(violations) == {"PEA-01", "PEA-02", "PEA-03"}
	count(violations) == 3
}
