package evolith.repository_taxonomy

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
