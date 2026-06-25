# Charts Helm

> **Navegación bilingüe:** [English version](./README.md)

Este directorio contiene charts Helm para desplegar componentes de la aplicación de referencia en Kubernetes.

## Charts

| Chart | Descripción |
| :--- | :--- |
| `evolith-bff/` | Chart Helm para el servicio BFF API |
| `evolith-mcp/` | Chart Helm para el servidor MCP |

## Configuración del Sidecar OPA

Ambos charts incluyen un sidecar OPA para evaluación de políticas. El sidecar obtiene bundles de autorización desde un endpoint compatible con S3.

### URL del Bundle

Valor por defecto: `http://ums-minio:9000/opa-bundles/bundle.tar.gz`

Configurar mediante `opa.bundle.url`. Usar `https://` para endpoints con TLS.

### Credenciales S3

Cuando se define `opa.bundle.credentials.existingSecretName`, el sidecar OPA se autentica contra S3 usando variables de entorno (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) obtenidas del secreto de Kubernetes referenciado.

```yaml
opa:
  bundle:
    credentials:
      existingSecretName: opa-bundle-credentials
      accessKeyKey: access-key
      secretKeyKey: secret-key
```

El secreto debe crearse previamente en el namespace destino:

```bash
kubectl create secret generic opa-bundle-credentials \
  --from-literal=access-key=MINIO_ACCESS_KEY \
  --from-literal=secret-key=MINIO_SECRET_KEY
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
# Clave simétrica
kubectl create secret generic opa-bundle-signing-key \
  --from-file=key-secret=opa-signing-key.bin

# Clave asimétrica (el sidecar OPA necesita la clave pública para verificar)
kubectl create secret generic opa-bundle-signing-key \
  --from-file=key-secret=opa-signing-public-key.pem \
  --from-literal=key-id=rsa-key
```

3. Configurar los valores Helm:

```yaml
opa:
  bundle:
    signing:
      enabled: true
      existingSecretName: opa-bundle-signing-key
      keySecretKey: key-secret
      algorithm: HS256
```

4. Firmar el bundle durante CI:

```bash
# Usando CLI de OPA para firmar el bundle antes de publicarlo
opa sign --algorithm HS256 \
  --key opa-signing-key.bin \
  --bundle bundle.tar.gz \
  --output bundle.tar.gz
```

El sidecar OPA verifica la firma en cada consulta. Si la verificación falla, el bundle es rechazado.

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

---

[Volver a la Raíz de Infraestructura](../README.es.md)
