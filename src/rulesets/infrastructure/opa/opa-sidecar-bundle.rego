package evolith.infrastructure.opa_sidecar_bundle

import future.keywords.contains
import future.keywords.if
import future.keywords.in

default allow := false

valid_algorithms := {"RS256", "ES256", "HS256"}

deny contains msg if {
	some chart in input.charts
	not startswith(chart.bundle.url, "https://")
	msg := sprintf("%s OPA bundle endpoint must use https://", [chart.name])
}

deny contains msg if {
	some chart in input.charts
	chart.bundle.resource == ""
	msg := sprintf("%s OPA bundle resource must be explicit", [chart.name])
}

deny contains msg if {
	some chart in input.charts
	not regex.match("^sha256:[a-f0-9]{64}$", chart.bundle.expectedSha256)
	msg := sprintf("%s OPA bundle expectedSha256 must be a sha256:<64 hex> digest", [chart.name])
}

deny contains msg if {
	some chart in input.charts
	chart.bundle.credentials.existingSecretName == ""
	msg := sprintf("%s OPA bundle credentials must come from a Kubernetes secret", [chart.name])
}

deny contains msg if {
	some chart in input.charts
	chart.bundle.credentials.regionKey == ""
	msg := sprintf("%s OPA bundle credentials must include AWS_REGION for S3 signing", [chart.name])
}

deny contains msg if {
	some chart in input.charts
	not chart.bundle.signing.enabled
	msg := sprintf("%s OPA bundle signature verification must be enabled", [chart.name])
}

deny contains msg if {
	some chart in input.charts
	chart.bundle.signing.existingSecretName == ""
	msg := sprintf("%s OPA bundle signing public key must come from a Kubernetes secret", [chart.name])
}

deny contains msg if {
	some chart in input.charts
	not chart.bundle.signing.algorithm in valid_algorithms
	msg := sprintf("%s OPA bundle signing algorithm is unsupported", [chart.name])
}

deny contains msg if {
	some chart in input.charts
	chart.bundle.signing.keyId == ""
	msg := sprintf("%s OPA bundle signing keyId must be explicit", [chart.name])
}

deny contains msg if {
	some chart in input.charts
	not chart.bundle.readinessFailClosed
	msg := sprintf("%s OPA sidecar readiness must fail closed on bundle activation", [chart.name])
}

deny contains msg if {
	some chart in input.charts
	not chart.rendered.hasConfigFileArg
	msg := sprintf("%s OPA sidecar must load config.yaml through --config-file", [chart.name])
}

deny contains msg if {
	some chart in input.charts
	not chart.rendered.hasSigningKeyFileArg
	msg := sprintf("%s OPA sidecar must load the signing public key with --set-file", [chart.name])
}

deny contains msg if {
	some chart in input.charts
	not chart.rendered.hasCredentialsEnv
	msg := sprintf("%s OPA sidecar must expose S3 credentials from secret-backed environment variables", [chart.name])
}

deny contains msg if {
	some chart in input.charts
	not chart.rendered.hasDigestEnv
	msg := sprintf("%s OPA sidecar must expose the expected bundle digest", [chart.name])
}

deny contains msg if {
	some chart in input.charts
	not chart.rendered.hasFailClosedReadiness
	msg := sprintf("%s OPA sidecar must render /health?bundles readiness", [chart.name])
}

deny contains msg if {
	some chart in input.charts
	not chart.rendered.config.credentialsFromEnvironment
	msg := sprintf("%s OPA config must enable s3_signing.environment_credentials", [chart.name])
}

deny contains msg if {
	some chart in input.charts
	chart.rendered.config.signingKeyId != chart.bundle.signing.keyId
	msg := sprintf("%s OPA config signing keyid must match values", [chart.name])
}

allow if {
	count(deny) == 0
}
