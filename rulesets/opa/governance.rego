package evolith.governance

violations[{"id": "INH-01", "message": "Satellite contains a rulesets/ directory — inheriting from Core only is required"}] {
    input.satellitePath != input.corePath
    
    # Check if "rulesets" is in satellite directories
    dirs := {dir | dir := input.satellite.directories[_]}
    dirs["rulesets"]
}

violations[{"id": "INH-06", "message": "Satellite missing DECISIONS.md in root directory"}] {
    input.satellitePath != input.corePath
    
    files := {file | file := input.satellite.files[_]}
    not files["DECISIONS.md"]
}
