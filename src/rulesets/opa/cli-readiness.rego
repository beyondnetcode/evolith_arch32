package evolith.cli_readiness

import rego.v1

violations contains {"id": "CLI-RR-01", "message": "dist/main.js not found — run npm run build in sdk/cli"} if {
	not input.core.cli.hasMainJs
}

violations contains {"id": "CLI-RR-02", "message": "No compiled spec files in dist/ — run npm test to confirm"} if {
	not input.core.cli.hasTests
}

violations contains {"id": "CLI-RR-03", "message": "package-lock.json not found"} if {
	not input.core.hasPackageLock
	not input.core.cli.hasPackageLock
}

violations contains {"id": "CLI-RR-04", "message": "No MCP smoke evidence found in .harness/evidence/"} if {
	smoke_keys := [k | input.core.evidence[k]; contains(k, "mcp")]
	count(smoke_keys) == 0
}

violations contains {"id": "CLI-RR-04", "message": sprintf("MCP smoke evidence status: %v", [status])} if {
	smoke_keys := [k | input.core.evidence[k]; contains(k, "mcp")]
	count(smoke_keys) > 0
	smoke := input.core.evidence[smoke_keys[0]]
	status := smoke.status
	status != "passed"
}

violations contains {"id": "CLI-RR-05", "message": "CLI missing README.md or ARCHITECTURE.md"} if {
	not input.core.cli.hasReadme
	not input.core.cli.hasArchitectureMd
}
