# Casos de Adopción de Evolith

> **Estado:** Activo | **Owner:** Architecture Board | **Propósito:** Demostrar que la gobernanza de Evolith impulsa decisiones reales de productos

Este documento registra casos concretos donde equipos usaron Evolith como autoridad arquitectónica, contribuyeron lecciones, o promovieron decisiones locales a estándares reutilizables.

---

## Cómo Leer Este Documento

Cada caso sigue el **Ciclo de Promoción**:

```text
Observación de Producto → Propuesta ADR → Revisión del Architecture Board → Aceptado como Estándar → Retro-promovido a Evolith
```

No toda observación se convierte en estándar. Algunas permanecen específicas del producto. La matriz abajo muestra qué camino tomó cada caso.

---

## Casos de Promoción

### Caso 1 — Patrón Transactional Outbox

| Campo | Valor |
|---|---|
| **Origen** | Producto UMS |
| **Problema observado** | Propagación de estado async causó eventos duplicados cuando la respuesta HTTP regresó antes de que el relay de outbox confirmara |
| **Solución local** | UMS implementó consumidor de outbox idempotente con clave de deduplicación |
| **Trigger de promoción** | Múltiples equipos encontraron el mismo problema independientemente |
| **ADR sometido** | ADR-0033 — Patrón Transactional Outbox |
| **Resultado** | Aceptado como estándar core. Patrón canónico `cp-02` creado para implementación .NET |
| **Estado** | `ACCEPTED` |

---

### Caso 2 — Aplicación de Frontera Schema-per-Context

| Campo | Valor |
|---|---|
| **Origen** | Producto UMS |
| **Problema observado** | JOINs SQL cross-schema en consultas de reporting crearon acoplamiento oculto entre bounded contexts |
| **Solución local** | UMS enforcezó aislamiento de schema via gate de CI con detección automatizada de JOINs |
| **Trigger de promoción** | ADR-0031 redactado después de dos incidentes causados por queries cross-context |
| **ADR sometido** | ADR-0031 — Schema-per-Context Domain/Event Catalog |
| **Resultado** | Aceptado. Regla `eslint-plugin-boundaries` añadida al harness de CI |
| **Estado** | `ACCEPTED` |

---

### Caso 3 — Filtrado Multi-Tenant

| Campo | Valor |
|---|---|
| **Origen** | Producto UMS |
| **Problema observado** | Datos de tenant filtrados a través de respuestas API cuando desarrolladores olvidaban añadir filtro de tenant |
| **Solución local** | Capa de repositorio base con inyección obligatoria de filtro tenant_id |
| **Trigger de promoción** | Auditoría de seguridad identificó la misma vulnerabilidad en tres endpoints |
| **ADR sometido** | ADR-0010 — Multi-Tenancy Architecture Strategy |
| **Resultado** | Aceptado. Aplicación de dos capas: filtro en aplicación (primario) + restricción nativa en DB (respaldo) |
| **Estado** | `ACCEPTED` |

---

### Caso 4 — Resiliencia Offline de Frontend

| Campo | Valor |
|---|---|
| **Origen** | Frontend UMS |
| **Problema observado** | Usuarios perdieron datos de formulario cuando la red cayó durante el envío |
| **Solución local** | Fallback en IndexedDB con mecanismo de cola-y-reintento |
| **ADR sometido** | ADR-0004 — Frontend Offline Resilience |
| **Resultado** | Aceptado para perfil runtime Node.js. Guía extractada independiente del framework |
| **Estado** | `ACCEPTED` |

---

### Caso 5 — Adopción de Contract Testing

| Campo | Valor |
|---|---|
| **Origen** | Capa de integración UMS |
| **Problema observado** | Rupturas de contrato driven por provider se detectaban muy tarde en CI, causando rollbacks de emergencia |
| **Solución local** | Integración Pact broker con verificación can-i-deploy en gate de CI |
| **Trigger de promoción** | Dos incidentes de producción rastreados a desajustes de contrato consumer-driven |
| **ADR sometido** | ADR-0040 — Multi-Runtime Selection Contracts |
| **Resultado** | Aceptado. Guía de contract testing creada como estándar de gobernanza |
| **Estado** | `ACCEPTED` |

---

## Matriz de Promoción

| Producto | Decisiones Promovidas | Estándares Consumidos | Contribución Neta |
|---|---|---|---|
| UMS | 5 | 40+ | Fuente de la mayoría de ADRs core |
| (otros productos) | — | — | Contactar al Architecture Board para registrar |

> **Nota:** Si tu producto ha usado estándares de Evolith y contribuido una lección, envía un caso usando la [plantilla ADR](../governance/sdlc/04-artifact-templates/adr-template.es.md).

---

## Cómo Contribuir un Caso

1. Identifica un patrón en tu producto que otros podrían reutilizar
2. Verifica si un ADR ya cubre el tema en la [Matriz de ADRs](../architecture/adrs/adr-matrix.es.md)
3. Si no existe ADR, redacta uno usando la [Plantilla ADR](../governance/sdlc/04-artifact-templates/adr-template.es.md)
4. Envía al Architecture Board para revisión
5. Si es aceptado, tu ADR se vuelve canónico y tu producto aparece en esta matriz

---

## Casos Rechazados o Diferidos

| Caso | Razón de Rechazo/Diferimiento |
|---|---|
| (ninguno actualmente registrado) | — |

---

*Parte de [Frontera de Referencia UMS](../knowledge/demo/demo-vs-reference.es.md)*