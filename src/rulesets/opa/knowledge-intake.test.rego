package evolith.knowledge_intake_test

import data.evolith.knowledge_intake

valid_candidate := {"knowledge_id": "KI-TEST-001", "source_registry_id": "SRC-TEST-001", "source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20", "rights_status": "citation-and-synthesis-only"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@winston", "next_review_at": "2026-12-20", "review_freshness": "2026-06-20"}, "promotion": {"status": "candidate", "fixtures": []}}

test_candidate_with_provenance_has_no_violations {
  violations := knowledge_intake.violations with input as valid_candidate
  count(violations) == 0
}

test_missing_rights_is_rejected {
  candidate := {"knowledge_id": "KI-TEST-001", "source_registry_id": "SRC-TEST-001", "source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@winston", "next_review_at": "2026-12-20", "review_freshness": "2026-06-20"}, "promotion": {"status": "candidate", "fixtures": []}}
  knowledge_intake.violations[_].id == "KI-R01" with input as candidate
}

test_executable_without_fixtures_is_rejected {
  candidate := object.union(valid_candidate, {"promotion": {"status": "executable", "adr": "ADR-0100", "native_rule": "KI-R01", "opa_policy": "knowledge-intake.rego", "fixtures": []}})
  knowledge_intake.violations[_].id == "KI-R03" with input as candidate
}

test_missing_maturity_is_rejected {
  candidate := {"knowledge_id": "KI-TEST-001", "source_registry_id": "SRC-TEST-001", "source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20", "rights_status": "citation-and-synthesis-only"}, "assessment": {"preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@winston", "next_review_at": "2026-12-20", "review_freshness": "2026-06-20"}, "promotion": {"status": "candidate", "fixtures": []}}
  knowledge_intake.violations[_].id == "KI-R04" with input as candidate
}

test_missing_source_registry_link_is_rejected {
  candidate := {"knowledge_id": "KI-TEST-001", "source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20", "rights_status": "citation-and-synthesis-only"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@winston", "next_review_at": "2026-12-20", "review_freshness": "2026-06-20"}, "promotion": {"status": "candidate", "fixtures": []}}
  knowledge_intake.violations[_].id == "KI-R05" with input as candidate
}

test_missing_review_freshness_is_rejected {
  candidate := {"knowledge_id": "KI-TEST-001", "source_registry_id": "SRC-TEST-001", "source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20", "rights_status": "citation-and-synthesis-only"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@winston", "next_review_at": "2026-12-20"}, "promotion": {"status": "candidate", "fixtures": []}}
  knowledge_intake.violations[_].id == "KI-R02" with input as candidate
}

test_accepted_without_adr_is_rejected {
  candidate := {"knowledge_id": "KI-TEST-001", "source_registry_id": "SRC-TEST-001", "source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20", "rights_status": "citation-and-synthesis-only"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@winston", "next_review_at": "2026-12-20", "review_freshness": "2026-06-20"}, "promotion": {"status": "accepted", "promoted_at": "2026-06-21", "promoted_by": "@winston", "adr": null, "fixtures": []}}
  knowledge_intake.violations[_].id == "KI-R07" with input as candidate
}

test_retired_without_disposition_is_rejected {
  candidate := {"knowledge_id": "KI-TEST-001", "source_registry_id": "SRC-TEST-001", "source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20", "rights_status": "citation-and-synthesis-only"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@winston", "next_review_at": "2026-12-20", "review_freshness": "2026-06-20"}, "promotion": {"status": "retired", "promoted_at": "2026-06-21", "promoted_by": "@winston", "disposition": null, "fixtures": []}}
  knowledge_intake.violations[_].id == "KI-R07" with input as candidate
}

test_evaluated_without_promoted_at_is_rejected {
  candidate := {"knowledge_id": "KI-TEST-001", "source_registry_id": "SRC-TEST-001", "source": {"class": "book", "locator": "chapter", "retrieved_at": "2026-06-20", "rights_status": "citation-and-synthesis-only"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@winston", "next_review_at": "2026-12-20", "review_freshness": "2026-06-20"}, "promotion": {"status": "evaluated", "promoted_by": "@winston", "fixtures": []}}
  knowledge_intake.violations[_].id == "KI-R06" with input as candidate
}

# ---------------------------------------------------------------------------
# ADR-0115 — emergent axis (KO-*)
# ---------------------------------------------------------------------------

valid_emergent := {"knowledge_id": "KO-TEST-001", "origin": {"class": "violation", "repository": "satellite-ums", "detected_by": "@winston-architect", "detected_at": "2026-07-18", "sensitivity": "internal"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@winston", "next_review_at": "2026-12-20", "review_freshness": "2026-07-18"}, "promotion": {"status": "candidate", "fixtures": []}}

test_emergent_candidate_has_no_violations {
  violations := knowledge_intake.violations with input as valid_emergent
  count(violations) == 0
}

test_emergent_without_repository_is_rejected {
  candidate := {"knowledge_id": "KO-TEST-001", "origin": {"class": "violation", "detected_by": "@winston-architect", "detected_at": "2026-07-18", "sensitivity": "internal"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@winston", "next_review_at": "2026-12-20", "review_freshness": "2026-07-18"}, "promotion": {"status": "candidate", "fixtures": []}}
  knowledge_intake.violations[_].id == "KO-R01" with input as candidate
}

test_emergent_without_sensitivity_is_rejected {
  candidate := {"knowledge_id": "KO-TEST-001", "origin": {"class": "violation", "repository": "satellite-ums", "detected_by": "@winston-architect", "detected_at": "2026-07-18"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@winston", "next_review_at": "2026-12-20", "review_freshness": "2026-07-18"}, "promotion": {"status": "candidate", "fixtures": []}}
  knowledge_intake.violations[_].id == "KO-R02" with input as candidate
}

test_restricted_emergent_cannot_leave_candidate {
  candidate := {"knowledge_id": "KO-TEST-001", "origin": {"class": "violation", "repository": "satellite-ums", "detected_by": "@winston-architect", "detected_at": "2026-07-18", "sensitivity": "restricted", "evidence_ref": "sha256:abc"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@winston", "next_review_at": "2026-12-20", "review_freshness": "2026-07-18"}, "promotion": {"status": "evaluated", "promoted_at": "2026-07-18", "promoted_by": "@winston", "fixtures": []}}
  knowledge_intake.violations[_].id == "KO-R02" with input as candidate
}

test_promoted_emergent_requires_evidence_ref {
  candidate := {"knowledge_id": "KO-TEST-001", "origin": {"class": "violation", "repository": "satellite-ums", "detected_by": "@winston-architect", "detected_at": "2026-07-18", "sensitivity": "internal"}, "assessment": {"maturity": "proven", "preconditions": ["domain-modeling"], "anti_patterns": ["anemic"], "alternatives": ["event-sourcing"]}, "review": {"owner": "@winston", "next_review_at": "2026-12-20", "review_freshness": "2026-07-18"}, "promotion": {"status": "evaluated", "promoted_at": "2026-07-18", "promoted_by": "@winston", "fixtures": []}}
  knowledge_intake.violations[_].id == "KO-R03" with input as candidate
}

test_record_without_axis_prefix_is_rejected {
  candidate := {"assessment": {"maturity": "proven", "preconditions": ["x"], "anti_patterns": ["y"], "alternatives": ["z"]}, "review": {"owner": "@winston", "next_review_at": "2026-12-20", "review_freshness": "2026-07-18"}, "promotion": {"status": "candidate", "fixtures": []}}
  knowledge_intake.violations[_].id == "KI-R08" with input as candidate
}
