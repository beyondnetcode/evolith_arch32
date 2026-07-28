package evolith.taxonomy

import rego.v1

violations contains {"id": "TAX-05", "message": msg} if {
	# Layout post-refactor: `sdk/` y `rulesets/` se movieron bajo `src/`, y
	# `product/` es un dominio de primer nivel (ADR-0048). La expectativa
	# anterior --{reference, rulesets, sdk, .harness}-- describia un repo que ya
	# no existe, y era la unica razon por la que el `rulesets/` accidental de la
	# raiz no se podia borrar: hacerlo rompia esta regla.
	expected := {"reference", "product", "src", ".harness"}
	actual := {dir | dir := input.core.directories[_]}
	missing := expected - actual
	count(missing) > 0
	msg := sprintf("Missing top-level directories: %v", [concat(", ", missing)])
}

violations contains {"id": "TAX-06", "message": msg} if {
	input.satellitePath != input.corePath
	input.satellite.packageJson != null
	expected := {"src", "tests", "docs"}
	actual := {dir | dir := input.satellite.directories[_]}
	missing := expected - actual
	count(missing) > 0
	msg := sprintf("Satellite missing directories: %v", [concat(", ", missing)])
}

violations contains {"id": "TAX-11", "message": "Root-level topologies/ is prohibited; topology content must stay inside approved corpus and ruleset locations unless a superseding ADR changes root taxonomy"} if {
	dir := input.core.directories[_]
	dir == "topologies"
}

is_valid_adr_name(name) if {
	regex.match(`^[0-9]{4}-[a-z0-9-]+\.md$`, name)
}

violations contains {"id": "TAX-07", "message": msg} if {
	adr := input.core.adrs[_]
	name := split(adr, "/")[count(split(adr, "/")) - 1]
	regex.match(`^[0-9]`, name)
	not endswith(name, ".es.md")
	not is_valid_adr_name(name)
	msg := sprintf("ADR filenames not matching kebab-case pattern: %v", [name])
}

violations contains {"id": "TAX-08", "message": msg} if {
	adr := input.core.adrs[_]
	name := split(adr, "/")[count(split(adr, "/")) - 1]
	endswith(name, ".md")
	not endswith(name, ".es.md")
	es_name := replace(name, ".md", ".es.md")

	# Check if es_name exists in the list of adrs
	adrs_set := {split(a, "/")[count(split(a, "/")) - 1] | a := input.core.adrs[_]}
	not adrs_set[es_name]

	msg := sprintf("ADRs missing bilingual pair: %v", [name])
}
