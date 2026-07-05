# Promoción de Templates

> **Navegación Bilingüe:** [English Version](./template-promotion.md)

## Propósito

Asistir la promoción gobernada de un **template de diseño tenant-scope** al corpus canónico de Core (ADR-0104 §9). Prepara la Upstream Proposal (UP-NNN), la enruta al Architecture Board y — con aprobación — la aterriza como template `scope: core` en tier `community → certified → official`.

## Contrato

| Campo | Valor |
|-------|-------|
| ID | `template-promotion` |
| Dueño | `@winston` (el Architecture Board decide) |
| Versión | `1.0.0` |
| Entradas | Un `design-template` de scope `tenant`, su evidencia de uso, tier objetivo |
| Salidas | Una Upstream Proposal (`reference/core/control-center/opportunities/UP-NNN`) + una recomendación de promoción |

## Algoritmo

1. Validar el template contra `design-template.schema.json` y el block-type registry (cada `blockKind` está registrado).
2. Ejecutar el gate de certificación en CI (schema + paridad Native/OPA donde aplique + paridad bilingüe + fixtures) — la barra no baja por venir de un tenant.
3. Redactar una Upstream Proposal (UP-NNN) capturando el template, la evidencia de reutilización y el tier solicitado; fijar `provenance.promotionRequest.status: requested`.
4. Enrutar al Architecture Board. Con aprobación: fijar `scope: core`, `governance.tier` correspondiente y registrar en el catálogo canónico; con rechazo: mantenerlo tenant-scope con justificación.
5. **Statelessness:** el Core evalúa y recibe la propuesta; el template del tenant lo persiste el Tracker hasta ser promovido.

## Uso

Invocada por `@winston` cuando un tenant solicita promover un template reutilizable, o cuando un template `tenant` muestra valor amplio y repetido. Así **crece** el catálogo de Core desde el uso real del producto (aprendizaje upstream, Visión §4.1).

## Referencias

- [Design Template Schema](../../../../src/rulesets/schema/design-template.schema.json)
- [Upstream Proposals (UP-NNN, p. ej. UP-001)](../../control-center/opportunities/UP-001-canonical-gap-tracking-standard.es.md)
- [ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.es.md)
