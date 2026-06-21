package evolith.knowledge_intake_test

import data.evolith.knowledge_intake

valid_candidate := {"source_registry_id": "SRC-TEST-001", "source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20", "rights_status": "citation-and-synthesis-only"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@wilson", "next_review_at": "2026-12-20", "review_freshness": "2026-06-20"}, "promotion": {"status": "candidate", "fixtures": []}}

test_candidate_with_provenance_has_no_violations {
  violations := knowledge_intake.violations with input as valid_candidate
  count(violations) == 0
}

test_missing_rights_is_rejected {
  candidate := {"source_registry_id": "SRC-TEST-001", "source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@wilson", "next_review_at": "2026-12-20", "review_freshness": "2026-06-20"}, "promotion": {"status": "candidate", "fixtures": []}}
  knowledge_intake.violations[_].id == "KI-R01" with input as candidate
}

test_executable_without_fixtures_is_rejected {
  candidate := object.union(valid_candidate, {"promotion": {"status": "executable", "adr": "ADR-0100", "native_rule": "KI-R01", "opa_policy": "knowledge-intake.rego", "fixtures": []}})
  knowledge_intake.violations[_].id == "KI-R03" with input as candidate
}

test_missing_maturity_is_rejected {
  candidate := {"source_registry_id": "SRC-TEST-001", "source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20", "rights_status": "citation-and-synthesis-only"}, "assessment": {"preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@wilson", "next_review_at": "2026-12-20", "review_freshness": "2026-06-20"}, "promotion": {"status": "candidate", "fixtures": []}}
  knowledge_intake.violations[_].id == "KI-R04" with input as candidate
}

test_missing_source_registry_link_is_rejected {
  candidate := {"source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20", "rights_status": "citation-and-synthesis-only"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@wilson", "next_review_at": "2026-12-20", "review_freshness": "2026-06-20"}, "promotion": {"status": "candidate", "fixtures": []}}
  knowledge_intake.violations[_].id == "KI-R05" with input as candidate
}

test_missing_review_freshness_is_rejected {
  candidate := {"source_registry_id": "SRC-TEST-001", "source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20", "rights_status": "citation-and-synthesis-only"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@wilson", "next_review_at": "2026-12-20"}, "promotion": {"status": "candidate", "fixtures": []}}
  knowledge_intake.violations[_].id == "KI-R02" with input as candidate
}

test_accepted_without_adr_is_rejected {
  candidate := {"source_registry_id": "SRC-TEST-001", "source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20", "rights_status": "citation-and-synthesis-only"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@wilson", "next_review_at": "2026-12-20", "review_freshness": "2026-06-20"}, "promotion": {"status": "accepted", "promoted_at": "2026-06-21", "promoted_by": "@wilson", "adr": null, "fixtures": []}}
  knowledge_intake.violations[_].id == "KI-R07" with input as candidate
}

test_retired_without_disposition_is_rejected {
  candidate := {"source_registry_id": "SRC-TEST-001", "source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20", "rights_status": "citation-and-synthesis-only"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@wilson", "next_review_at": "2026-12-20", "review_freshness": "2026-06-20"}, "promotion": {"status": "retired", "promoted_at": "2026-06-21", "promoted_by": "@wilson", "disposition": null, "fixtures": []}}
  knowledge_intake.violations[_].id == "KI-R07" with input as candidate
}

test_evaluated_without_promoted_at_is_rejected {
  candidate := {"source_registry_id": "SRC-TEST-001", "source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20", "rights_status": "citation-and-synthesis-only"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@wilson", "next_review_at": "2026-12-20", "review_freshness": "2026-06-20"}, "promotion": {"status": "evaluated", "promoted_by": "@wilson", "fixtures": []}}
  knowledge_intake.violations[_].id == "KI-R06" with input as candidate
}
