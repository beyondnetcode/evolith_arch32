package evolith.compliance_baseline

# GT-347: `if` is used below (e.g. any_workflow_has_lint) and must be imported
# under OPA 0.65, otherwise the file fails to load ("var cannot be used for rule name").
import future.keywords.if

# GT-380 / L1c: read the compliance spec from the canonical EvaluationContext
# (`input.context.spec`). The legacy `input.spec` root was dead (OpaInputBuilder never
# builds it) and is removed. `satellite` facts (workflows/directories) remain filesystem
# sourced, so they keep the `input.satellite` fallback.
#
# GT-382: "no facts → no opinion". Every rule is guarded by `spec_declared`, so when the
# consumer does NOT declare a compliance spec (`input.context.spec` absent) the policy
# emits ZERO violations and never blocks a gate it is not the subject of.
spec_declared {
    input.context.spec
}

spec := object.get(object.get(input, "context", {}), "spec", {})

satellite := object.get(object.get(input, "context", {}), "satellite", object.get(input, "satellite", {}))

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
    spec_declared
    missing := required_pillars - {p | p := object.keys(spec.compliance)[_]}
    count(missing) > 0
    msg := sprintf("Missing compliance pillars: %v", [concat(", ", missing)])
}

violations[{"id": "CB-VAL-02", "message": msg}] {
    spec_declared
    pillar := required_pillars[_]
    val := spec.compliance[pillar]
    not is_string(val)
    msg := sprintf("Pillar '%s' reference must be a non-empty string", [pillar])
}

violations[{"id": "CB-VAL-02", "message": msg}] {
    spec_declared
    pillar := required_pillars[_]
    val := spec.compliance[pillar]
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
    spec_declared
    not spec.compliance.agnosticBaseline
}

# ---------------------------------------------------------------------------
# CB-02: Reference Blueprint — architecture traceable to Blueprint
# ---------------------------------------------------------------------------

violations[{"id": "CB-02", "message": "Product architecture must be traceable to the Reference Blueprint. Declare spec.compliance.referenceBlueprint in evolith.yaml."}] {
    spec_declared
    not spec.compliance.referenceBlueprint
}

# ---------------------------------------------------------------------------
# CB-03: Engineering Manifesto — principles enforced via linting
# Also checks that the satellite has at least one linting workflow configured.
# ---------------------------------------------------------------------------

violations[{"id": "CB-03", "message": "Engineering Manifesto principles must be enforced. Declare spec.compliance.engineeringManifesto in evolith.yaml."}] {
    spec_declared
    not spec.compliance.engineeringManifesto
}

violations[{"id": "CB-03", "message": "Engineering Manifesto requires linting enforcement. No CI workflow containing 'lint' detected in satellite .github/workflows/."}] {
    spec_declared
    spec.compliance.engineeringManifesto
    not any_workflow_has_lint
}

any_workflow_has_lint if {
    wf := satellite.workflows[_]
    contains(wf, "lint")
}

# ---------------------------------------------------------------------------
# CB-04: Definition of Done — satisfied before work-item closure
# ---------------------------------------------------------------------------

violations[{"id": "CB-04", "message": "Definition of Done must be satisfied before work-item closure. Declare spec.compliance.definitionOfDone in evolith.yaml."}] {
    spec_declared
    not spec.compliance.definitionOfDone
}

# ---------------------------------------------------------------------------
# CB-05: Repository Taxonomy — structure follows Taxonomy rules
# Checks that satellite has the minimum required top-level directories.
# ---------------------------------------------------------------------------

violations[{"id": "CB-05", "message": "Repository structure must follow Taxonomy rules. Declare spec.compliance.repositoryTaxonomy in evolith.yaml."}] {
    spec_declared
    not spec.compliance.repositoryTaxonomy
}

violations[{"id": "CB-05", "message": "Repository Taxonomy requires 'src' directory. Satellite is missing expected top-level directory."}] {
    spec_declared
    spec.compliance.repositoryTaxonomy
    satellite_dirs := {d | d := satellite.directories[_]}
    not satellite_dirs["src"]
}
