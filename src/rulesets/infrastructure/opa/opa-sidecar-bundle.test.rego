package evolith.infrastructure.opa_sidecar_bundle

import future.keywords.if
import future.keywords.in

valid_chart := {
	"name": "evolith-bff",
	"bundle": {
		"url": "https://ums-minio.ums-system.svc.cluster.local:9000",
		"resource": "opa-bundles/bundle.tar.gz",
		"expectedSha256": "sha256:7bffa731a4b3dfde851d0a2ee50a5bd654f8e2413ec4bb7f668a39550f9d42f7",
		"credentials": {
			"existingSecretName": "opa-bundle-credentials",
			"regionKey": "AWS_REGION",
		},
		"signing": {
			"enabled": true,
			"existingSecretName": "opa-bundle-signing-key",
			"keyId": "evolith-opa-bundle-rs256",
			"algorithm": "RS256",
		},
		"readinessFailClosed": true,
	},
	"rendered": {
		"hasConfigFileArg": true,
		"hasSigningKeyFileArg": true,
		"hasCredentialsEnv": true,
		"hasDigestEnv": true,
		"hasFailClosedReadiness": true,
		"config": {
			"credentialsFromEnvironment": true,
			"signingKeyId": "evolith-opa-bundle-rs256",
		},
	},
}

test_valid_chart_allows if {
	allow with input as {"charts": [valid_chart]}
}

test_http_endpoint_denied if {
	invalid := object.union_n([
		valid_chart,
		{"bundle": object.union(valid_chart.bundle, {"url": "http://ums-minio:9000"})},
	])
	some msg in deny with input as {"charts": [invalid]}
	contains(msg, "https://")
}

test_unsigned_bundle_denied if {
	invalid := object.union_n([
		valid_chart,
		{"bundle": object.union(valid_chart.bundle, {"signing": object.union(valid_chart.bundle.signing, {"enabled": false})})},
	])
	some msg in deny with input as {"charts": [invalid]}
	contains(msg, "signature verification")
}

test_missing_readiness_denied if {
	invalid := object.union_n([
		valid_chart,
		{"rendered": object.union(valid_chart.rendered, {"hasFailClosedReadiness": false})},
	])
	some msg in deny with input as {"charts": [invalid]}
	contains(msg, "/health?bundles")
}
