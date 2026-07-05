package evolith.topologies.edge_computing

# Inlined from common-execution.rego (self-contained WASM per topology)

violations[{"id":"EC-SEC-01","blocking":true,"message":"Edge computing components MUST define a 'networkSecurity' profile."}] {
    not input.config.networkSecurity
}

violations[{"id":"EC-SEC-02","blocking":true,"message":"mTLS must be enabled for all edge computing network communications."}] {
    input.config.networkSecurity
    not input.config.networkSecurity.mtlsEnabled
}

# EC-R01: Mandatory Synchronization Strategy
violations[{"id":"EC-R01","blocking":true,"message":"Edge computing components MUST define a 'syncStrategy' (e.g. offline-first, eventual, real-time-fallback)."}] {
    not input.config.syncStrategy
}

violations[{"id":"EC-R01","blocking":true,"message":sprintf("'syncStrategy' must be 'offline-first', 'eventual', or 'real-time-fallback', found '%v'.", [input.config.syncStrategy])}] {
    input.config.syncStrategy
    not {"offline-first": true, "eventual": true, "real-time-fallback": true}[input.config.syncStrategy]
}

# EC-R02: Edge Node Isolation
violations[{"id":"EC-R02","blocking":true,"message":"Edge computing components MUST declare 'edgeIsolation' to ensure autonomous operation during network partitions."}] {
    not input.config.edgeIsolation
}

violations[{"id":"EC-R02","blocking":true,"message":"'edgeIsolation' MUST be true."}] {
    input.config.edgeIsolation != true
}

# EC-R03: Conflict Resolution Strategy
violations[{"id":"EC-R03","blocking":true,"message":"Edge computing components MUST declare a 'conflictResolution' strategy."}] {
    not input.config.conflictResolution
}

violations[{"id":"EC-R03","blocking":true,"message":sprintf("'conflictResolution' must be 'last-write-wins', 'merge', or 'manual', found '%v'.", [input.config.conflictResolution])}] {
    input.config.conflictResolution
    not {"last-write-wins": true, "merge": true, "manual": true}[input.config.conflictResolution]
}
