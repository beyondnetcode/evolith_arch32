package evolith.infrastructure.opa_sidecar

import rego.v1

# INFRA-OPA-001: OPA Sidecar Bundle Integrity
# Native counterpart: rulesets/infrastructure/opa-sidecar-bundle.rules.json

violations contains {"id": "INFRA-OPA-001", "message": msg} if {
    sidecar := input.infrastructure.opaSidecars[_]
    not startswith(sidecar.bundleUrl, "https://")
    msg := sprintf("OPA sidecar '%v' bundle URL must use HTTPS — unauthenticated transport prohibited", [sidecar.name])
}

violations contains {"id": "INFRA-OPA-001", "message": msg} if {
    sidecar := input.infrastructure.opaSidecars[_]
    not sidecar.credentialsFromSecret
    msg := sprintf("OPA sidecar '%v' must source credentials from a Kubernetes Secret, not inline config", [sidecar.name])
}

violations contains {"id": "INFRA-OPA-001", "message": msg} if {
    sidecar := input.infrastructure.opaSidecars[_]
    not sidecar.bundleSignatureVerified
    msg := sprintf("OPA sidecar '%v' does not verify bundle signatures — signed bundle verification is required", [sidecar.name])
}

violations contains {"id": "INFRA-OPA-001", "message": msg} if {
    sidecar := input.infrastructure.opaSidecars[_]
    not sidecar.bundleDigestPinned
    msg := sprintf("OPA sidecar '%v' does not pin expected SHA-256 bundle digest — digest pinning required", [sidecar.name])
}

violations contains {"id": "INFRA-OPA-001", "message": msg} if {
    sidecar := input.infrastructure.opaSidecars[_]
    not sidecar.failClosedOnBundleLoad
    msg := sprintf("OPA sidecar '%v' is not configured to fail-closed if bundle activation fails — readiness probe must block traffic until bundle is active", [sidecar.name])
}

default allow := false

allow if {
    count(violations) == 0
}
