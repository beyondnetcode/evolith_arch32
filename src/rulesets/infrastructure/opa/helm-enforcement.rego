package evolith.infrastructure

import future.keywords.contains
import future.keywords.if
import future.keywords.in

# Default deny
default allow := false

# OPA rule to reject raw Kubernetes manifests that aren't part of a Helm chart.
# In a real setup, input would be the file paths or Kubernetes objects.
deny contains msg if {
    some path in input.files
    endswith(path, ".yaml")
    contains(path, "reference/infrastructure/kubernetes/")
    not endswith(path, "Chart.yaml")
    not endswith(path, "values.yaml")
    not contains(path, "templates/")
    
    msg := sprintf("File %s is a raw Kubernetes manifest. Helm charts must be used (Chart.yaml and templates/).", [path])
}

allow if {
    count(deny) == 0
}
