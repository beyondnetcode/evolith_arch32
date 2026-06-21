package evolith.knowledge_intake_test

import data.evolith.knowledge_intake

valid_candidate := {"source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20", "rights_status": "citation-and-synthesis-only"}, "review": {"owner": "@wilson", "next_review_at": "2026-12-20"}, "promotion": {"status": "candidate", "fixtures": []}}

test_candidate_with_provenance_has_no_violations {
  violations := knowledge_intake.violations with input as valid_candidate
  count(violations) == 0
}

test_missing_rights_is_rejected {
  candidate := {"source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20"}, "review": {"owner": "@wilson", "next_review_at": "2026-12-20"}, "promotion": {"status": "candidate", "fixtures": []}}
  knowledge_intake.violations[_].id == "KI-R01" with input as candidate
}

test_executable_without_fixtures_is_rejected {
  candidate := object.union(valid_candidate, {"promotion": {"status": "executable", "adr": "ADR-0100", "native_rule": "KI-R01", "opa_policy": "knowledge-intake.rego", "fixtures": []}})
  knowledge_intake.violations[_].id == "KI-R03" with input as candidate
}
