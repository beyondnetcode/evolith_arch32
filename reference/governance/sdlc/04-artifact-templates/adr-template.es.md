# Plantilla: Registro de Decisión Arquitectónica (ADR)

> **Navegación bilingüe:** [English](./adr-template.md)
> **Fase:** 2 — Diseño y Arquitectura (y durante la construcción)
> **Puerta de salida:** Baseline de Diseño Aprobada (ADRs iniciales); Build Exitoso (ADRs de runtime)
> **Padre:** [Plantillas de Artefactos](./README.es.md)

---

## Propósito

Un ADR registra una decisión arquitectónica significativa con su contexto, opciones, trade-offs, consecuencias y trazabilidad. Los ADRs hacen que las decisiones sean revisables antes de implementación y auditables después del delivery.

---

## Elige tu Vista

| Vista | Link | Úsalo cuando |
|---|---|---|
| **Fuente Markdown** | [Abrir fuente Markdown reutilizable](./source/adr-template-source.es.md) | Necesites copiar la estructura canónica ADR en un repositorio de producto o delivery. |
| **Ejemplo Renderizado** | [Abrir ejemplo renderizado UMS](./examples/adr-example-ums.es.md) | Quieras ver cómo debe verse un ADR aceptado en la práctica. |

---

## Reglas de Autoría

- Un ADR debe representar una sola decisión.
- Documenta opciones rechazadas, no solo la decisión seleccionada.
- Enlaza el ADR con PRDs, Historias Funcionales, Historias Técnicas, bounded contexts y ADRs Evolith relacionados.
- No implementes una decisión arquitectónica significativa antes de que el ADR sea aceptado o tenga waiver explícito.

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Mapeo SDLC–Artefactos](../sdlc-evolith-artifact-mapping.es.md) | Define cuándo los ADRs son requeridos o condicionales. |
| [Modelo de Trazabilidad](../traceability-model.es.md) | Explica la posición del ADR en la cadena de evidencia. |
| [Gates de Calidad](../quality-gates.es.md) | Define restricciones bloqueantes de release que pueden derivarse de ADRs. |
