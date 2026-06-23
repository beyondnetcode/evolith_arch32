package evolith.compliance_baseline

required_pillars := {"agnosticBaseline", "referenceBlueprint", "engineeringManifesto", "definitionOfDone", "repositoryTaxonomy"}

violations[{"id": "CB-VAL-01", "message": msg}] {
    missing := required_pillars - {p | p := object.keys(input.spec.compliance)[_]}
    count(missing) > 0
    msg := sprintf("Missing compliance pillars: %v", [concat(", ", missing)])
}

violations[{"id": "CB-VAL-02", "message": msg}] {
    pillar := required_pillars[_]
    val := input.spec.compliance[pillar]
    not is_string(val)
    msg := sprintf("Pillar '%s' reference must be a non-empty string", [pillar])
}

violations[{"id": "CB-VAL-02", "message": msg}] {
    pillar := required_pillars[_]
    val := input.spec.compliance[pillar]
    is_string(val)
    count(val) == 0
    msg := sprintf("Pillar '%s' reference must be a non-empty string", [pillar])
}
