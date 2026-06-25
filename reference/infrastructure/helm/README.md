# Helm Charts

> **Bilingual Navigation:** [Versión en Español](./README.es.md)

This directory contains Helm charts for deploying reference application components to Kubernetes.

## Charts

| Chart | Description |
| :--- | :--- |
| `evolith-bff/` | Helm chart for the BFF API service |
| `evolith-mcp/` | Helm chart for the MCP server service |

## OPA Sidecar Configuration

Both charts include an OPA sidecar container for policy evaluation. The sidecar fetches authorization bundles from an S3-compatible endpoint.

### Bundle URL

Default: `http://ums-minio:9000/opa-bundles/bundle.tar.gz`

Configure via `opa.bundle.url`. Use `https://` for TLS-enabled endpoints.

### S3 Credentials

When `opa.bundle.credentials.existingSecretName` is set, the OPA sidecar authenticates to S3 using AWS credential environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) sourced from the referenced Kubernetes secret.

```yaml
opa:
  bundle:
    credentials:
      existingSecretName: opa-bundle-credentials
      accessKeyKey: access-key
      secretKeyKey: secret-key
```

The secret must be pre-created in the target namespace:

```bash
kubectl create secret generic opa-bundle-credentials \
  --from-literal=access-key=MINIO_ACCESS_KEY \
  --from-literal=secret-key=MINIO_SECRET_KEY
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
# Symmetric key
kubectl create secret generic opa-bundle-signing-key \
  --from-file=key-secret=opa-signing-key.bin

# Asymmetric key (OPA sidecar needs the public key to verify)
kubectl create secret generic opa-bundle-signing-key \
  --from-file=key-secret=opa-signing-public-key.pem \
  --from-literal=key-id=rsa-key
```

3. Configure the Helm values:

```yaml
opa:
  bundle:
    signing:
      enabled: true
      existingSecretName: opa-bundle-signing-key
      keySecretKey: key-secret
      algorithm: HS256
```

4. Sign the bundle during CI:

```bash
# Using OPA CLI to sign the bundle before publishing
opa sign --algorithm HS256 \
  --key opa-signing-key.bin \
  --bundle bundle.tar.gz \
  --output bundle.tar.gz
```

The OPA sidecar verifies the signature on each poll. If verification fails, the bundle is rejected.

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

---

[Back to Infrastructure Root](../README.md)
