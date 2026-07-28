package evolith.cli_core_parity

import rego.v1

violations contains {"id": "CLI-PAR-01", "message": "Executable Core rule missing parity record (CLI status, MCP status, test status, evidence status)"} if {
	input.satellite.coreParity.ruleWithoutParityRecord
}

violations contains {"id": "CLI-PAR-02", "message": "CLI and MCP implement divergent business logic for same capability"} if {
	input.satellite.coreParity.divergentValidationLogic
}

violations contains {"id": "CLI-PAR-03", "message": "CLI and MCP return inconsistent results for same validation request"} if {
	input.satellite.coreParity.inconsistentResults
}

violations contains {"id": "CLI-PAR-04", "message": "Parity gap not documented with owner, priority, and planned closure date"} if {
	input.satellite.coreParity.undocumentedParityGap
}
