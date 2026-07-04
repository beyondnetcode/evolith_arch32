package evolith.evidence

# Helper to get all evidence files
evidence_files := [file | input.core.evidence[file]]

violations[{"id": "EVD-01", "message": ".harness/evidence directory not found or empty"}] {
    count(evidence_files) == 0
}

violations[{"id": "EVD-02", "message": ".harness/evidence directory not found or empty"}] {
    count(evidence_files) == 0
}

violations[{"id": "EVD-03", "message": ".harness/evidence directory not found or empty"}] {
    count(evidence_files) == 0
}

violations[{"id": "EVD-04", "message": ".harness/evidence directory not found or empty"}] {
    count(evidence_files) == 0
}

violations[{"id": "EVD-01", "message": msg}] {
    manifest := input.core.evidence[file]
    required := {"id", "source", "generatedAt", "producer"}
    actual := {k | manifest[k]}
    missing := required - actual
    count(missing) > 0
    msg := sprintf("%v missing fields: %v", [file, concat(", ", missing)])
}

violations[{"id": "EVD-01", "message": msg}] {
    manifest := input.core.evidence[file]
    not manifest.evaluatedRules
    not manifest.relatedRuleIds
    not manifest.relatedGateId
    msg := sprintf("%v missing evaluatedRules or relatedGateId", [file])
}

violations[{"id": "EVD-02", "message": msg}] {
    manifest := input.core.evidence[file]
    not manifest.sourceRef
    msg := sprintf("%v missing sourceRef", [file])
}

violations[{"id": "EVD-03", "message": msg}] {
    manifest := input.core.evidence[file]
    required := {"status", "evaluatedRules", "blockingFailures"}
    actual := {k | manifest[k]}
    missing := required - actual
    count(missing) > 0
    msg := sprintf("%v missing fields: %v", [file, concat(", ", missing)])
}

violations[{"id": "EVD-04", "message": msg}] {
    manifest := input.core.evidence[file]
    not manifest.retentionPeriod
    msg := sprintf("%v missing retentionPeriod or owner", [file])
}

violations[{"id": "EVD-04", "message": msg}] {
    manifest := input.core.evidence[file]
    not manifest.owner
    msg := sprintf("%v missing retentionPeriod or owner", [file])
}
