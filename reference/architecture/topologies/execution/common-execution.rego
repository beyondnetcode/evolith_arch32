package evolith.topologies.execution.common

import rego.v1

# Base Execution Security checks (Network Security)
deny contains msg if {
    not input.config.networkSecurity
    msg := "EX-SEC-01: Execution topologies MUST define a 'networkSecurity' profile."
}

deny contains msg if {
    input.config.networkSecurity
    not input.config.networkSecurity.mtlsEnabled
    msg := "EX-SEC-02: mTLS must be enabled for all execution topology network communications."
}
