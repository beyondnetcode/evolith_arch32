package evolith.infrastructure.helm

import rego.v1

# INFRA-001: Helm Charts Over Raw Manifests Enforcement
# Native counterpart: rulesets/infrastructure/helm-enforcement.rules.json
# ADR ref: ADR-0076

violations contains {"id": "INFRA-001", "message": msg} if {
    file := input.infrastructure.kubernetesFiles[_]
    not contains(file, "Chart.yaml")
    not contains(file, "values.yaml")
    not contains(file, "templates/")
    endswith(file, ".yaml")
    msg := sprintf("Raw Kubernetes manifest detected: %v — wrap in a Helm Chart (Chart.yaml required)", [file])
}

violations contains {"id": "INFRA-001", "message": "No Helm Chart.yaml found in Kubernetes infrastructure directory — all Kubernetes configs must use Helm"} if {
    dirs := {d | d := input.infrastructure.directories[_]}
    dirs["kubernetes"]
    not any_chart_yaml
}

any_chart_yaml if {
    file := input.infrastructure.kubernetesFiles[_]
    contains(file, "Chart.yaml")
}

default allow := false

allow if {
    count(violations) == 0
}
