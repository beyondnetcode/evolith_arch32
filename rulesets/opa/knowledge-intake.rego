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
