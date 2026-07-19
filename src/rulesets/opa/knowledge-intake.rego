package evolith.knowledge_intake

# ADR-0115 — two origins share this policy. Rules that assert on `source` must
# apply ONLY to external candidates: in Rego `not input.source.class` succeeds
# when `source` is absent, so without this guard every emergent record would
# trip the external provenance rules.
is_external {
  startswith(input.knowledge_id, "KI-")
}

is_emergent {
  startswith(input.knowledge_id, "KO-")
}

# Fail-closed on the axis itself. Without this, a record carrying no
# knowledge_id (or an unrecognised prefix) would satisfy neither is_external nor
# is_emergent and would therefore evade BOTH sets of provenance rules. The id is
# what selects the axis, so an absent or unknown prefix is a policy violation,
# not a free pass. Note KI-Rnn ids denote this policy package (knowledge intake),
# not the external axis — this rule applies to both.
violations[{"id": "KI-R08", "message": "Knowledge candidate must carry a knowledge_id with a recognised axis prefix (KI- external or KO- emergent)."}] {
  not is_external
  not is_emergent
}

violations[{"id": "KI-R01", "message": "Knowledge candidate must declare provenance and permitted retention rights."}] {
  is_external
  not input.source.class
}

violations[{"id": "KI-R01", "message": "Knowledge candidate must declare provenance and permitted retention rights."}] {
  is_external
  not input.source.locator
}

violations[{"id": "KI-R01", "message": "Knowledge candidate must declare provenance and permitted retention rights."}] {
  is_external
  not input.source.retrieved_at
}

violations[{"id": "KI-R01", "message": "Knowledge candidate must declare provenance and permitted retention rights."}] {
  is_external
  not input.source.rights_status
}

violations[{"id": "KI-R02", "message": "Knowledge candidate must be reviewed by @winston and have a next review date."}] {
  input.review.owner != "@winston"
}

violations[{"id": "KI-R02", "message": "Knowledge candidate must be reviewed by @winston and have a next review date."}] {
  not input.review.next_review_at
}

violations[{"id": "KI-R02", "message": "Knowledge candidate must have a review_freshness date."}] {
  not input.review.review_freshness
}

violations[{"id": "KI-R03", "message": "Executable knowledge requires ADR, Native rule, OPA policy, and fixtures."}] {
  input.promotion.status == "executable"
  not input.promotion.adr
}

violations[{"id": "KI-R03", "message": "Executable knowledge requires ADR, Native rule, OPA policy, and fixtures."}] {
  input.promotion.status == "executable"
  not input.promotion.native_rule
}

violations[{"id": "KI-R03", "message": "Executable knowledge requires ADR, Native rule, OPA policy, and fixtures."}] {
  input.promotion.status == "executable"
  not input.promotion.opa_policy
}

violations[{"id": "KI-R03", "message": "Executable knowledge requires ADR, Native rule, OPA policy, and fixtures."}] {
  input.promotion.status == "executable"
  count(input.promotion.fixtures) == 0
}

violations[{"id": "KI-R04", "message": "Knowledge candidate must declare maturity."}] {
  not input.assessment.maturity
}

violations[{"id": "KI-R04", "message": "Knowledge candidate must list preconditions."}] {
  not input.assessment.preconditions
}

violations[{"id": "KI-R04", "message": "Knowledge candidate must list anti-patterns."}] {
  not input.assessment.anti_patterns
}

violations[{"id": "KI-R04", "message": "Knowledge candidate must list alternatives."}] {
  not input.assessment.alternatives
}

violations[{"id": "KI-R05", "message": "Knowledge candidate must link to a source registry entry via source_registry_id."}] {
  is_external
  input.source_registry_id == null
}

violations[{"id": "KI-R05", "message": "Knowledge candidate must link to a source registry entry via source_registry_id."}] {
  is_external
  not input.source_registry_id
}

violations[{"id": "KI-R06", "message": "Non-candidate promotion must record promoted_at and promoted_by."}] {
  input.promotion.status != "candidate"
  not input.promotion.promoted_at
}

violations[{"id": "KI-R06", "message": "Non-candidate promotion must record promoted_at and promoted_by."}] {
  input.promotion.status != "candidate"
  not input.promotion.promoted_by
}

violations[{"id": "KI-R07", "message": "Accepted or executable status requires a non-null ADR reference."}] {
  input.promotion.status == "accepted"
  input.promotion.adr == null
}

violations[{"id": "KI-R07", "message": "Accepted or executable status requires a non-null ADR reference."}] {
  input.promotion.status == "executable"
  input.promotion.adr == null
}

violations[{"id": "KI-R07", "message": "Retired status requires a non-null disposition reason."}] {
  input.promotion.status == "retired"
  input.promotion.disposition == null
}

# ---------------------------------------------------------------------------
# ADR-0115 — emergent axis (KO-*). Mirrors KI-R01/KI-R05 for the origin block.
# ---------------------------------------------------------------------------

violations[{"id": "KO-R01", "message": "Emergent candidate must declare where it was observed: origin class, repository, detector and date."}] {
  is_emergent
  not input.origin.class
}

violations[{"id": "KO-R01", "message": "Emergent candidate must declare where it was observed: origin class, repository, detector and date."}] {
  is_emergent
  not input.origin.repository
}

violations[{"id": "KO-R01", "message": "Emergent candidate must declare where it was observed: origin class, repository, detector and date."}] {
  is_emergent
  not input.origin.detected_by
}

violations[{"id": "KO-R01", "message": "Emergent candidate must declare where it was observed: origin class, repository, detector and date."}] {
  is_emergent
  not input.origin.detected_at
}

# Sensitivity governs publication (ADR-0115 Exclusions). It is always required,
# and `restricted` material must never leave `candidate`: shared knowledge that
# cannot be generalised without exposing a client does not belong in the corpus.
violations[{"id": "KO-R02", "message": "Emergent candidate must classify origin.sensitivity (public | internal | restricted)."}] {
  is_emergent
  not input.origin.sensitivity
}

violations[{"id": "KO-R02", "message": "Restricted emergent knowledge must not be promoted beyond candidate."}] {
  is_emergent
  input.origin.sensitivity == "restricted"
  input.promotion.status != "candidate"
}

# An emergent finding is an observation, so promotion past candidate requires the
# evidence that backs it (ADR-0111 Evidence.provenance.artifactHash). External
# candidates satisfy the equivalent duty through their SRC-* registry entry.
violations[{"id": "KO-R03", "message": "Emergent knowledge promoted beyond candidate must reference the evidence that backs it (origin.evidence_ref)."}] {
  is_emergent
  input.promotion.status != "candidate"
  not input.origin.evidence_ref
}
