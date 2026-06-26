# Helm Charts

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

This directory contains Helm charts for deploying reference application components to Kubernetes.

## Charts

| Chart | Description |
| :--- | :--- |
| `evolith-bff/` | Helm chart for the BFF API service |
| `evolith-mcp/` | Helm chart for the MCP server service |

## OPA Sidecar Configuration

Both charts include an OPA sidecar container for policy evaluation. The sidecar fetches authorization bundles from a TLS-enabled, S3-compatible in-cluster endpoint and verifies the bundle signature before activation.

### Bundle Endpoint

Default endpoint: `https://ums-minio.ums-system.svc.cluster.local:9000`

Default resource: `opa-bundles/bundle.tar.gz`

Configure via `opa.bundle.url` and `opa.bundle.resource`. Production-like profiles must keep `https://` enabled or use an equivalent private authenticated in-cluster endpoint. The chart also records `opa.bundle.expectedSha256`; update it with the digest emitted by the bundle publishing job for the target release.

### S3 Credentials

When `opa.bundle.credentials.existingSecretName` is set, the OPA sidecar authenticates to S3 using AWS credential environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) sourced from the referenced Kubernetes secret.

```yaml
opa:
  bundle:
    credentials:
      existingSecretName: opa-bundle-credentials
      accessKeyKey: AWS_ACCESS_KEY_ID
      secretKeyKey: AWS_SECRET_ACCESS_KEY
      regionKey: AWS_REGION
```

The secret must be pre-created in the target namespace:

```bash
kubectl create secret generic opa-bundle-credentials \
  --from-literal=AWS_ACCESS_KEY_ID=MINIO_ACCESS_KEY \
  --from-literal=AWS_SECRET_ACCESS_KEY=MINIO_SECRET_KEY \
  --from-literal=AWS_REGION=us-east-1
```

### Bundle Signing Verification

Bundle signing ensures the integrity and provenance of the OPA policy bundle. OPA supports symmetric (HS256) and asymmetric (RS256, ES256) signing algorithms.

1. Generate a signing key:

```bash
# HS256 symmetric key (32+ bytes)
openssl rand -base64 32 > opa-signing-key.bin

# Or RS256 asymmetric key pair
openssl genpkey -algorithm RSA -out opa-signing-private-key.pem
openssl rsa -pubout -in opa-signing-private-key.pem -out opa-signing-public-key.pem
```

2. Create the Kubernetes secret:

```bash
# The sidecar needs the public key to verify the signed bundle.
kubectl create secret generic opa-bundle-signing-key \
  --from-file=public-key.pem=opa-signing-public-key.pem
```

3. Configure the Helm values:

```yaml
opa:
  bundle:
    signing:
      enabled: true
      existingSecretName: opa-bundle-signing-key
      keyId: evolith-opa-bundle-rs256
      keySecretKey: public-key.pem
      algorithm: RS256
      scope: evolith/reference
```

4. Sign and digest the bundle during CI before publishing:

```bash
rm -rf bundle-dir
mkdir bundle-dir
cp -R rulesets/opa/. bundle-dir/
opa sign --bundle bundle-dir \
  --signing-key opa-signing-private-key.pem \
  --signing-alg RS256 \
  --claims-file bundle-claims.json \
  --output-file-path bundle-dir/.signatures.json
tar -czf bundle.tar.gz -C bundle-dir .
shasum -a 256 bundle.tar.gz
```

The OPA sidecar verifies `.signatures.json` on each poll using `bundles.authz.signing.keyid` and the configured public key. If verification fails, the bundle is rejected and the existing bundle remains active. The release job must publish the digest and update `opa.bundle.expectedSha256` for the target chart values.

### TLS for Bundle Endpoint

For internal TLS connections to the bundle server, mount a CA certificate:

```yaml
opa:
  bundle:
    tls:
      caCertSecretName: opa-ca-cert
      caCertKey: ca.crt
```

Create the secret:

```bash
kubectl create secret generic opa-ca-cert \
  --from-file=ca.crt=path/to/ca.pem
```

### Fail-Closed Readiness

When `opa.bundle.readinessFailClosed` is `true` (default), the OPA sidecar container reports `NotReady` via a `/health?bundles` probe until the bundle is successfully fetched and activated. This prevents traffic from reaching pods with stale or missing policies.

Set to `false` for development environments where the bundle endpoint may not be available.

### CI Validation

`node .harness/scripts/ci/29-validate-opa-sidecar-bundles.mjs` renders both charts, validates the values with a native Node.js check, and evaluates the equivalent OPA policy in `rulesets/infrastructure/opa/opa-sidecar-bundle.rego`. The check fails when the bundle endpoint is not HTTPS, credentials are missing, signing or digest verification is disabled, or the sidecar readiness probe does not fail closed.

---

[Back to Infrastructure Root](../README.md)
