package evolith.compliance_baseline

# ---------------------------------------------------------------------------
# Native counterpart: rulesets/compliance-baseline/compliance-baseline.rules.json
# CB-VAL-*: format validation (evolith.yaml structure)
# CB-01..05: semantic validation (implementation evidence per pillar)
# Dual-Engine Parity: R-25
# ---------------------------------------------------------------------------

required_pillars := {"agnosticBaseline", "referenceBlueprint", "engineeringManifesto", "definitionOfDone", "repositoryTaxonomy"}

# ---------------------------------------------------------------------------
# CB-VAL: Format validation — evolith.yaml compliance section structure
# ---------------------------------------------------------------------------

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

# ---------------------------------------------------------------------------
# CB-01: Agnostic Baseline — technology selection validated
# Checks that agnosticBaseline pillar is declared in evolith.yaml compliance.
# Deep content validation (approved package list) is performed by the CLI.
# ---------------------------------------------------------------------------

violations[{"id": "CB-01", "message": "Technology selection must be validated against Agnostic Baseline. Declare spec.compliance.agnosticBaseline in evolith.yaml pointing to the authoritative tech stack document."}] {
    not input.spec.compliance.agnosticBaseline
}

# ---------------------------------------------------------------------------
# CB-02: Reference Blueprint — architecture traceable to Blueprint
# ---------------------------------------------------------------------------

violations[{"id": "CB-02", "message": "Product architecture must be traceable to the Reference Blueprint. Declare spec.compliance.referenceBlueprint in evolith.yaml."}] {
    not input.spec.compliance.referenceBlueprint
}

# ---------------------------------------------------------------------------
# CB-03: Engineering Manifesto — principles enforced via linting
# Also checks that the satellite has at least one linting workflow configured.
# ---------------------------------------------------------------------------

violations[{"id": "CB-03", "message": "Engineering Manifesto principles must be enforced. Declare spec.compliance.engineeringManifesto in evolith.yaml."}] {
    not input.spec.compliance.engineeringManifesto
}

violations[{"id": "CB-03", "message": "Engineering Manifesto requires linting enforcement. No CI workflow containing 'lint' detected in satellite .github/workflows/."}] {
    input.spec.compliance.engineeringManifesto
    not any_workflow_has_lint
}

any_workflow_has_lint if {
    wf := input.satellite.workflows[_]
    contains(wf, "lint")
}

# ---------------------------------------------------------------------------
# CB-04: Definition of Done — satisfied before story closure
# ---------------------------------------------------------------------------

violations[{"id": "CB-04", "message": "Definition of Done must be satisfied before story closure. Declare spec.compliance.definitionOfDone in evolith.yaml."}] {
    not input.spec.compliance.definitionOfDone
}

# ---------------------------------------------------------------------------
# CB-05: Repository Taxonomy — structure follows Taxonomy rules
# Checks that satellite has the minimum required top-level directories.
# ---------------------------------------------------------------------------

violations[{"id": "CB-05", "message": "Repository structure must follow Taxonomy rules. Declare spec.compliance.repositoryTaxonomy in evolith.yaml."}] {
    not input.spec.compliance.repositoryTaxonomy
}

violations[{"id": "CB-05", "message": "Repository Taxonomy requires 'src' directory. Satellite is missing expected top-level directory."}] {
    input.spec.compliance.repositoryTaxonomy
    satellite_dirs := {d | d := input.satellite.directories[_]}
    not satellite_dirs["src"]
}
