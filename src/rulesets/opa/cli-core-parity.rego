package evolith.cli_core_parity

violations[{"id": "CLI-PAR-01", "message": "Executable Core rule missing parity record (CLI status, MCP status, test status, evidence status)"}] {
    input.satellite.coreParity.ruleWithoutParityRecord
}

violations[{"id": "CLI-PAR-02", "message": "CLI and MCP implement divergent business logic for same capability"}] {
    input.satellite.coreParity.divergentValidationLogic
}

violations[{"id": "CLI-PAR-03", "message": "CLI and MCP return inconsistent results for same validation request"}] {
    input.satellite.coreParity.inconsistentResults
}

violations[{"id": "CLI-PAR-04", "message": "Parity gap not documented with owner, priority, and planned closure date"}] {
    input.satellite.coreParity.undocumentedParityGap
}
