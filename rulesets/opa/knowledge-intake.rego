package evolith.knowledge_intake

violations[{"id": "KI-R01", "message": "Knowledge candidate must declare provenance and permitted retention rights."}] {
  not input.source.class
}

violations[{"id": "KI-R01", "message": "Knowledge candidate must declare provenance and permitted retention rights."}] {
  not input.source.locator
}

violations[{"id": "KI-R01", "message": "Knowledge candidate must declare provenance and permitted retention rights."}] {
  not input.source.retrieved_at
}

violations[{"id": "KI-R01", "message": "Knowledge candidate must declare provenance and permitted retention rights."}] {
  not input.source.rights_status
}

violations[{"id": "KI-R02", "message": "Knowledge candidate must be reviewed by @wilson and have a next review date."}] {
  input.review.owner != "@wilson"
}

violations[{"id": "KI-R02", "message": "Knowledge candidate must be reviewed by @wilson and have a next review date."}] {
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
  input.source_registry_id == null
}

violations[{"id": "KI-R05", "message": "Knowledge candidate must link to a source registry entry via source_registry_id."}] {
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
