package evolith.repository_taxonomy

# ---------------------------------------------------------------------------
# TAX-01..04: Naming conventions (checked via source file analysis)
# TAX-05..08, TAX-11: Structural checks (already implemented below)
# TAX-09..10: Artifact placement checks
# ---------------------------------------------------------------------------

violations[{"id": "TAX-01", "message": msg}] {
    file := input.repository.files[_]
    name := split(file, "/")[count(split(file, "/")) - 1]
    not endswith(name, ".md")
    not endswith(name, ".json")
    not endswith(name, ".yaml")
    not endswith(name, ".yml")
    not endswith(name, ".rego")
    not endswith(name, ".ts")
    not endswith(name, ".mjs")
    not endswith(name, ".js")
    regex.match(`[A-Z_\s]`, name)
    msg := sprintf("File name does not use kebab-case: %v", [name])
}

violations[{"id": "TAX-02", "message": msg}] {
    input.repository.naming.pascalCaseViolations > 0
    msg := sprintf("Class/type names violate PascalCase convention (%d violations)", [input.repository.naming.pascalCaseViolations])
}

violations[{"id": "TAX-03", "message": msg}] {
    input.repository.naming.camelCaseViolations > 0
    msg := sprintf("Variable/function names violate camelCase convention (%d violations)", [input.repository.naming.camelCaseViolations])
}

violations[{"id": "TAX-04", "message": msg}] {
    input.repository.naming.constantCaseViolations > 0
    msg := sprintf("Constant names violate UPPER_SNAKE_CASE convention (%d violations)", [input.repository.naming.constantCaseViolations])
}

violations[{"id": "TAX-09", "message": msg}] {
    input.repository.type == "core"
    file := input.repository.files[_]
    contains(file, "product-specific")
    not startswith(file, "reference/knowledge/demo")
    msg := sprintf("Product-specific artifact found in Core reference/: %v", [file])
}

violations[{"id": "TAX-10", "message": msg}] {
    file := input.repository.files[_]
    startswith(file, "reference/")
    input.repository.productArtifacts[file]
    msg := sprintf("Product-specific artifact must not be in reference/: %v (use docs/ or satellite repo)", [file])
}

violations[{"id": "TAX-05", "message": msg}] {
    input.repository.type == "core"
    expected := {"reference", "sdk", "rulesets"}
    actual := {dir | dir := input.repository.directories[_]}
    missing := expected - actual
    count(missing) > 0
    msg := sprintf("Core repository missing directories: %v", [concat(", ", missing)])
}

violations[{"id": "TAX-06", "message": msg}] {
    input.repository.type == "satellite"
    expected := {"src", "tests", "docs"}
    actual := {dir | dir := input.repository.directories[_]}
    missing := expected - actual
    count(missing) > 0
    msg := sprintf("Satellite repository missing directories: %v", [concat(", ", missing)])
}

is_valid_adr_name(name) {
    regex.match(`^[0-9]{4}-[a-z0-9-]+\.md$`, name)
}

violations[{"id": "TAX-07", "message": msg}] {
    adr := input.repository.adrs[_]
    name := split(adr, "/")[count(split(adr, "/")) - 1]
    not endswith(name, ".es.md")
    not is_valid_adr_name(name)
    msg := sprintf("ADR filename does not match pattern ^[0-9]{4}-[a-z-]+\\.md$: %v", [name])
}

violations[{"id": "TAX-08", "message": msg}] {
    adr := input.repository.adrs[_]
    name := split(adr, "/")[count(split(adr, "/")) - 1]
    endswith(name, ".md")
    not endswith(name, ".es.md")
    es_name := replace(name, ".md", ".es.md")
    adrs_set := {split(a, "/")[count(split(a, "/")) - 1] | a := input.repository.adrs[_]}
    not adrs_set[es_name]
    msg := sprintf("ADR missing bilingual pair: %v", [name])
}

violations[{"id": "TAX-11", "message": "Root-level topologies/ directory is prohibited"}] {
    dir := input.repository.directories[_]
    dir == "topologies"
}
