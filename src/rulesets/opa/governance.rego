package evolith.governance

import rego.v1

violations contains {"id": "INH-01", "message": "Satellite contains a rulesets/ directory — inheriting from Core only is required"} if {
	input.satellitePath != input.corePath

	# Check if "rulesets" is in satellite directories
	dirs := {dir | dir := input.satellite.directories[_]}
	dirs.rulesets
}

violations contains {"id": "INH-02", "message": "Satellite coreRef.version must be a specific semver — 'latest' or unpinned references are prohibited"} if {
	input.satellitePath != input.corePath
	not input.satellite.contracts.coreVersionPinned
}

violations contains {"id": "INH-03", "message": "Satellite governance version cannot be downgraded — downgrade requires Architecture Board exception with --force flag"} if {
	input.satellitePath != input.corePath
	input.satellite.contracts.governanceVersionDowngraded
}

violations contains {"id": "INH-04", "message": "Satellite local ADRs must reference Core corpus — DECISIONS.md or local ADR registry with coreRef is required for extension decisions"} if {
	input.satellitePath != input.corePath
	files := {file | file := input.satellite.files[_]}
	not files["DECISIONS.md"]
	not input.satellite.contracts.hasLocalAdrRegistry
}

violations contains {"id": "INH-05", "message": "Local ADR promotion to Core requires Architecture Board review artifact — no approval evidence found for this ADR promotion"} if {
	input.satellitePath != input.corePath
	input.satellite.contracts.hasAdrsAwaitingPromotion
	not input.satellite.contracts.hasArchitectureBoardApproval
}

violations contains {"id": "INH-06", "message": "Satellite missing DECISIONS.md in root directory"} if {
	input.satellitePath != input.corePath

	files := {file | file := input.satellite.files[_]}
	not files["DECISIONS.md"]
}
