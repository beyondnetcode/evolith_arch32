package evolith.governance

violations[{"id": "INH-01", "message": "Satellite contains a rulesets/ directory — inheriting from Core only is required"}] {
    input.satellitePath != input.corePath
    
    # Check if "rulesets" is in satellite directories
    dirs := {dir | dir := input.satellite.directories[_]}
    dirs["rulesets"]
}

violations[{"id": "INH-02", "message": "Satellite coreRef.version must be a specific semver — 'latest' or unpinned references are prohibited"}] {
    input.satellitePath != input.corePath
    not input.satellite.contracts.coreVersionPinned
}

violations[{"id": "INH-03", "message": "Satellite governance version cannot be downgraded — downgrade requires Architecture Board exception with --force flag"}] {
    input.satellitePath != input.corePath
    input.satellite.contracts.governanceVersionDowngraded
}

violations[{"id": "INH-04", "message": "Satellite local ADRs must reference Core corpus — DECISIONS.md or local ADR registry with coreRef is required for extension decisions"}] {
    input.satellitePath != input.corePath
    files := {file | file := input.satellite.files[_]}
    not files["DECISIONS.md"]
    not input.satellite.contracts.hasLocalAdrRegistry
}

violations[{"id": "INH-05", "message": "Local ADR promotion to Core requires Architecture Board review artifact — no approval evidence found for this ADR promotion"}] {
    input.satellitePath != input.corePath
    input.satellite.contracts.hasAdrsAwaitingPromotion
    not input.satellite.contracts.hasArchitectureBoardApproval
}

violations[{"id": "INH-06", "message": "Satellite missing DECISIONS.md in root directory"}] {
    input.satellitePath != input.corePath

    files := {file | file := input.satellite.files[_]}
    not files["DECISIONS.md"]
}
