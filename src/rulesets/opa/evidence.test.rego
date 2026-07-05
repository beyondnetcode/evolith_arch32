package evolith.evidence_test

import data.evolith.evidence

test_complete_evidence_has_no_violations {
  violations := evidence.violations with input as {"core": {"evidence": {"gate-evidence.json": {"id": "gate-001", "source": "cli", "generatedAt": "2026-06-20", "producer": "evolith-cli", "evaluatedRules": ["MM-R01"], "relatedGateId": "gate-01", "sourceRef": "main", "status": "passed", "blockingFailures": [], "retentionPeriod": "90d", "owner": "architecture-team"}}}}
  count(violations) == 0
}

test_missing_evidence_directory_is_rejected {
  violations := evidence.violations with input as {"core": {"evidence": {}}}
  violations[_].id == "EVD-01"
}

test_evidence_missing_source_ref_is_rejected {
  violations := evidence.violations with input as {"core": {"evidence": {"gate-evidence.json": {"id": "gate-001", "source": "cli", "generatedAt": "2026-06-20", "producer": "evolith-cli", "evaluatedRules": ["MM-R01"], "relatedGateId": "gate-01", "status": "passed", "blockingFailures": [], "retentionPeriod": "90d", "owner": "architecture-team"}}}}
  violations[_].id == "EVD-02"
}

test_evidence_missing_retention_period_is_rejected {
  violations := evidence.violations with input as {"core": {"evidence": {"gate-evidence.json": {"id": "gate-001", "source": "cli", "generatedAt": "2026-06-20", "producer": "evolith-cli", "evaluatedRules": ["MM-R01"], "relatedGateId": "gate-01", "sourceRef": "main", "status": "passed", "blockingFailures": []}}}}
  violations[_].id == "EVD-04"
}
