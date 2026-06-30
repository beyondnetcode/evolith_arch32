# Charts Helm

> **Navegación bilingüe:** [English version](./README.md)

Este directorio contiene charts Helm para desplegar componentes de la aplicación de referencia en Kubernetes.

## Charts

| Chart | Descripción |
| :--- | :--- |
| `evolith-core-api/` | Chart Helm para CORE-API (ADR-0074); `evolith.beyondnet.cloud`, secret de API key, OPA in-process (sin sidecar) |
| `evolith-mcp/` | Chart Helm para el servidor MCP; `mcpevolith.beyondnet.cloud`, sidecar OPA |
| `evolith-agent-runtime/` | Chart Helm para el servicio Agent Runtime; `evolithruntime.beyondnet.cloud`, secret de API key, OPA de la imagen |

> **Nota:** la antigua plantilla genérica `evolith-bff` se renombró a
> `evolith-core-api` (apuntando a la imagen real de `apps/core-api`). Todos los
> charts están alineados al dominio `beyondnet.cloud` y al registry
> `ghcr.io/beyondnetcode/*`. Ver [Topología de despliegue](../deployment-topology.es.md)
> para el mapa canónico de servicios.

## Configuración del Sidecar OPA

Ambos charts incluyen un sidecar OPA para evaluación de políticas. El sidecar obtiene bundles de autorización desde un endpoint interno compatible con S3 y con TLS, y verifica la firma del bundle antes de activarlo.

### Endpoint del Bundle

Endpoint por defecto: `https://ums-minio.ums-system.svc.cluster.local:9000`

Recurso por defecto: `opa-bundles/bundle.tar.gz`

Configurar mediante `opa.bundle.url` y `opa.bundle.resource`. Los perfiles tipo producción deben conservar `https://` o usar un endpoint privado autenticado dentro del clúster. El chart también registra `opa.bundle.expectedSha256`; actualícelo con el digest emitido por el job de publicación del bundle para la release objetivo.

### Credenciales S3

Cuando se define `opa.bundle.credentials.existingSecretName`, el sidecar OPA se autentica contra S3 usando variables de entorno (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) obtenidas del secreto de Kubernetes referenciado.

```yaml
opa:
  bundle:
    credentials:
      existingSecretName: opa-bundle-credentials
      accessKeyKey: AWS_ACCESS_KEY_ID
      secretKeyKey: AWS_SECRET_ACCESS_KEY
      regionKey: AWS_REGION
```

El secreto debe crearse previamente en el namespace destino:

```bash
kubectl create secret generic opa-bundle-credentials \
  --from-literal=AWS_ACCESS_KEY_ID=MINIO_ACCESS_KEY \
  --from-literal=AWS_SECRET_ACCESS_KEY=MINIO_SECRET_KEY \
  --from-literal=AWS_REGION=us-east-1
```

### Verificación de Firma del Bundle

La firma de bundles asegura la integridad y procedencia del paquete de políticas OPA. OPA soporta algoritmos simétricos (HS256) y asimétricos (RS256, ES256).

1. Generar una clave de firma:

```bash
# Clave simétrica HS256 (32+ bytes)
openssl rand -base64 32 > opa-signing-key.bin

# O par de claves asimétricas RS256
openssl genpkey -algorithm RSA -out opa-signing-private-key.pem
openssl rsa -pubout -in opa-signing-private-key.pem -out opa-signing-public-key.pem
```

2. Crear el secreto en Kubernetes:

```bash
# El sidecar necesita la clave pública para verificar el bundle firmado.
kubectl create secret generic opa-bundle-signing-key \
  --from-file=public-key.pem=opa-signing-public-key.pem
```

3. Configurar los valores Helm:

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

4. Firmar y calcular el digest del bundle durante CI antes de publicarlo:

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

El sidecar OPA verifica `.signatures.json` en cada consulta usando `bundles.authz.signing.keyid` y la clave pública configurada. Si la verificación falla, el bundle es rechazado y el bundle existente permanece activo. El job de release debe publicar el digest y actualizar `opa.bundle.expectedSha256` para los values del chart objetivo.

### TLS para el Endpoint del Bundle

Para conexiones TLS internas al servidor de bundles, montar un certificado CA:

```yaml
opa:
  bundle:
    tls:
      caCertSecretName: opa-ca-cert
      caCertKey: ca.crt
```

Crear el secreto:

```bash
kubectl create secret generic opa-ca-cert \
  --from-file=ca.crt=ruta/al/ca.pem
```

### Readiness Fail-Closed

Cuando `opa.bundle.readinessFailClosed` es `true` (valor por defecto), el sidecar OPA reporta `NotReady` mediante un probe `/health?bundles` hasta que el bundle se descargue y active correctamente. Esto evita que el tráfico llegue a pods con políticas obsoletas o ausentes.

Establecer a `false` para entornos de desarrollo donde el endpoint del bundle pueda no estar disponible.

### Validación CI

`node .harness/scripts/ci/29-validate-opa-sidecar-bundles.mjs` renderiza ambos charts, valida los values con un check nativo Node.js y evalúa la política OPA equivalente en `rulesets/infrastructure/opa/opa-sidecar-bundle.rego`. El check falla cuando el endpoint del bundle no usa HTTPS, faltan credenciales, la firma o el digest no están habilitados, o el probe de readiness del sidecar no falla cerrado.

---

[Volver a la Raíz de Infraestructura](../README.es.md)
