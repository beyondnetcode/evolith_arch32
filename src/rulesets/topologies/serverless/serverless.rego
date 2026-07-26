package evolith.topologies.serverless

import rego.v1

# Inlined from common-execution.rego (self-contained WASM per topology)

violations contains {"id": "SV-SEC-01", "blocking": true, "message": "Serverless components MUST define a 'networkSecurity' profile."} if {
	not input.config.networkSecurity
}

violations contains {"id": "SV-SEC-02", "blocking": true, "message": "mTLS must be enabled for all serverless network communications."} if {
	input.config.networkSecurity
	not input.config.networkSecurity.mtlsEnabled
}

# SV-R01: Declared Serverless Contract
violations contains {"id": "SV-R01", "blocking": true, "message": "serverless.config.json is required (SV-R01)."} if {
	not input.config.hasContract
}

# SV-R02: Stateless Execution
violations contains {"id": "SV-R02", "blocking": true, "message": "Serverless execution must be stateless (SV-R02)."} if {
	not input.config.isStateless
}

# SV-R03: Bounded Deployment Package
violations contains {"id": "SV-R03", "blocking": true, "message": "Package size must be positive and no greater than 50 MB (SV-R03)."} if {
	not input.config.hasBoundedPackage
}

# SV-R04: Cold-Start Readiness
violations contains {"id": "SV-R04", "blocking": true, "message": "Cold-start limits and lazy initialization are required (SV-R04)."} if {
	not input.config.hasColdStartReadiness
}
