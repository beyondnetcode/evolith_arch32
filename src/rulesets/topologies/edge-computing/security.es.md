# Guía de Seguridad de Computación en el Borde

> **Navegación Bilingüe:** [English](./security.md) | [Español](./security.es.md)

**Propietario:** Ingeniería de Plataforma
**Topología:** Computación en el Borde

## Autenticación en el Borde

Los nodos del borde utilizan un enfoque de autenticación por capas: identidad del nodo, identidad del workload y tokens del cliente.

### Identidad del Nodo

Cada nodo del borde posee un certificado de identidad respaldado por hardware emitido durante el aprovisionamiento.

```bash
# Verificar identidad del nodo
edge-cli auth node-identity verify \
  --node-id edge-node-01 \
  --check-cert-expiry

# Salida:
# NODE: edge-node-01
# CERT_EXPIRY: 2027-06-23
# TRUST_CHAIN: root-ca → intermediate-ca → node-cert
# STATUS: valid
```

### Identidad del Workload

Los workloads que se ejecutan en nodos del borde utilizan identidades basadas en SPIFFE para la autenticación entre servicios.

```yaml
spiffe:
  trust_domain: "edge.example.com"
  workload:
    path: "/compute/worker"
    selector:
      - "k8s:ns=edge-workloads"
      - "k8s:sa=edge-worker"
```

## Residencia de Datos

Los despliegues del borde deben respetar los requisitos de residencia de datos según la ubicación geográfica de los nodos.

### Motor de Políticas de Residencia

```yaml
residency:
  rules:
    - region: "eu-west-*"
      restrictions:
        - data_type: "pii"
          allowed_destinations: ["eu-west-1", "eu-central-1"]
        - data_type: "telemetry"
          allowed_destinations: ["eu-west-*"]
    - region: "us-*"
      restrictions:
        - data_type: "pii"
          allowed_destinations: ["us-*"]
    - region: "ap-*"
      restrictions:
        - data_type: "pii"
          allowed_destinations: ["ap-*"]
```

### Cumplimiento

```bash
# Auditar cumplimiento de residencia de datos
edge-cli residency audit --fleet-wide --output report.json

# Las violaciones activan remediación automática:
# - PII transfronterizo: bloquear y alertar
# - Fuga de telemetría: redirigir a región permitida
```

## Cifrado en Reposo

Todos los datos persistentes en nodos del borde están cifrados usando AES-256-GCM.

### Arquitectura de Cifrado

| Categoría de Datos | Fuente de Clave | Rotación | Ámbito |
|--------------------|-----------------|----------|--------|
| Contenido en caché | KMS local del nodo | 24 horas | Por nodo |
| Configuración | KMS central | 7 días | Toda la flota |
| Registros | KMS local del nodo | 24 horas | Por nodo |
| Secretos | Vault externo | Bajo demanda | Por workload |

### Gestión de Claves

```bash
# Rotar claves de cifrado del borde
edge-cli crypto rotate \
  --scope node-local \
  --algorithm aes-256-gcm \
  --grace-period 1h
```

## Seguridad de Red (EC-SEC-01)

Los nodos del borde aplican políticas de seguridad de red a nivel de nodo.

### Segmentación de Red

```
┌─────────────────────────────────────────────┐
│  Red del Nodo del Borde                     │
│  ┌───────────┐  ┌───────────┐  ┌─────────┐ │
│  │ Segmento  │  │ Segmento  │  │Segmento │ │
│  │ Cómputo   │  │Almacenam. │  │Control  │ │
│  │ (VLAN 10) │  │ (VLAN 20) │  │(VLAN 30)│ │
│  └───────────┘  └───────────┘  └─────────┘ │
│         │              │             │       │
│         └──────────────┼─────────────┘       │
│                        │                     │
│                   ┌────┴────┐                │
│                   │Firewall │                │
│                   └────┬────┘                │
│                        │                     │
└────────────────────────┼─────────────────────┘
                         │
                    ┌────┴────┐
                    │ Origen  │
                    └─────────┘
```

### Reglas de Firewall

```yaml
firewall:
  ingress:
    - port: 443
      source: "client-cidrs"
      action: allow
    - port: 8443
      source: "peer-nodes"
      action: allow
    - port: 9090
      source: "monitoring-subnet"
      action: allow
  egress:
    - port: 443
      destination: "origin-servers"
      action: allow
    - port: 443
      destination: "kms-endpoints"
      action: allow
    - all: deny
```

## TLS Mutuo (EC-SEC-02)

Toda la comunicación entre nodos del borde y entre el borde y el origen utiliza mTLS.

### Configuración de Certificados

```yaml
mtls:
  enabled: true
  min_version: "1.3"
  cipher_suites:
    - "TLS_AES_256_GCM_SHA384"
    - "TLS_CHACHA20_POLY1305_SHA256"
  client_auth:
    required: true
    ca_bundle: "/etc/edge/ca-bundle.pem"
  cert_rotation:
    interval: 24h
    overlap: 1h
```

### Verificación de mTLS

```bash
# Probar conectividad mTLS entre nodos
edge-cli mtls test \
  --source edge-node-01 \
  --target edge-node-02 \
  --verify-peer-cert

# Salida:
# SOURCE: edge-node-01
# TARGET: edge-node-02
# TLS_VERSION: 1.3
# CIPHER: TLS_AES_256_GCM_SHA384
# PEER_CERT_VALID: true
# STATUS: passed
```

## Rotación de Secretos

Los secretos en nodos del borde se rotan automáticamente para limitar la ventana de exposición.

### Programación de Rotación

| Tipo de Secreto | Intervalo de Rotación | Período de Gracia | Acción en Fallo |
|-----------------|----------------------|-------------------|-----------------|
| Certificado de identidad del nodo | 90 días | 24 horas | Alertar + degradar |
| Tokens de API | 1 hora | 5 minutos | Actualizar en segundo plano |
| Claves de cifrado | 24 horas | 1 hora | Encolar nueva clave |
| Credenciales de base de datos | 7 días | 2 horas | Mantener conexión |

### Orquestación de Rotación

```bash
# Activar rotación de secretos en toda la flota
edge-cli secrets rotate \
  --scope fleet \
  --type all \
  --strategy rolling \
  --batch 10%
```

---
[Volver al Perfil de Computación en el Borde](./README.es.md)
