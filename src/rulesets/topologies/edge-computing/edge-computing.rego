package evolith.topologies.edge_computing

import rego.v1

# Inlined from common-execution.rego (self-contained WASM per topology)

violations contains {"id": "EC-SEC-01", "blocking": true, "message": "Edge computing components MUST define a 'networkSecurity' profile."} if {
	not input.config.networkSecurity
}

violations contains {"id": "EC-SEC-02", "blocking": true, "message": "mTLS must be enabled for all edge computing network communications."} if {
	input.config.networkSecurity
	not input.config.networkSecurity.mtlsEnabled
}

# EC-R01: Mandatory Synchronization Strategy
violations contains {"id": "EC-R01", "blocking": true, "message": "Edge computing components MUST define a 'syncStrategy' (e.g. offline-first, eventual, real-time-fallback)."} if {
	not input.config.syncStrategy
}

violations contains {"id": "EC-R01", "blocking": true, "message": sprintf("'syncStrategy' must be 'offline-first', 'eventual', or 'real-time-fallback', found '%v'.", [input.config.syncStrategy])} if {
	input.config.syncStrategy
	not {"offline-first": true, "eventual": true, "real-time-fallback": true}[input.config.syncStrategy]
}

# EC-R02: Edge Node Isolation
violations contains {"id": "EC-R02", "blocking": true, "message": "Edge computing components MUST declare 'edgeIsolation' to ensure autonomous operation during network partitions."} if {
	not input.config.edgeIsolation
}

violations contains {"id": "EC-R02", "blocking": true, "message": "'edgeIsolation' MUST be true."} if {
	input.config.edgeIsolation != true
}

# EC-R03: Conflict Resolution Strategy
violations contains {"id": "EC-R03", "blocking": true, "message": "Edge computing components MUST declare a 'conflictResolution' strategy."} if {
	not input.config.conflictResolution
}

violations contains {"id": "EC-R03", "blocking": true, "message": sprintf("'conflictResolution' must be 'last-write-wins', 'merge', or 'manual', found '%v'.", [input.config.conflictResolution])} if {
	input.config.conflictResolution
	not {"last-write-wins": true, "merge": true, "manual": true}[input.config.conflictResolution]
}
