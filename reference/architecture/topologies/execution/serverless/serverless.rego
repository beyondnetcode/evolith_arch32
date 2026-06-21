package evolith.topologies.serverless

# Inlined from common-execution.rego (self-contained WASM per topology)

violations[{"id":"SV-SEC-01","blocking":true,"message":"Serverless components MUST define a 'networkSecurity' profile."}] {
    not input.config.networkSecurity
}

violations[{"id":"SV-SEC-02","blocking":true,"message":"mTLS must be enabled for all serverless network communications."}] {
    input.config.networkSecurity
    not input.config.networkSecurity.mtlsEnabled
}

# SV-R01: Declared Serverless Contract
violations[{"id":"SV-R01","blocking":true,"message":"serverless.config.json is required (SV-R01)."}] {
    not input.config.hasContract
}

# SV-R02: Stateless Execution
violations[{"id":"SV-R02","blocking":true,"message":"Serverless execution must be stateless (SV-R02)."}] {
    not input.config.isStateless
}

# SV-R03: Bounded Deployment Package
violations[{"id":"SV-R03","blocking":true,"message":"Package size must be positive and no greater than 50 MB (SV-R03)."}] {
    not input.config.hasBoundedPackage
}

# SV-R04: Cold-Start Readiness
violations[{"id":"SV-R04","blocking":true,"message":"Cold-start limits and lazy initialization are required (SV-R04)."}] {
    not input.config.hasColdStartReadiness
}
