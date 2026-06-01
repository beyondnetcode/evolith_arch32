# Plantilla: Historia Técnica

> **Navegación bilingüe:** [English](./technical-story-template.md)
> **Fase:** 3 — Construcción
> **Puerta de salida:** Build Exitoso
> **Padre:** [Plantillas de Artefactos](./README.es.md)

---

## Propósito

Una Historia Técnica traduce una Historia Funcional en un elemento concreto de trabajo de ingeniería. Define alcance de implementación, criterios de aceptación técnica, evidencia de Definición de Terminado y trazabilidad hacia implementación y pruebas.

---

## Elige tu Vista

| Vista | Link | Úsalo cuando |
|---|---|---|
| **Fuente Markdown** | [Abrir fuente Markdown reutilizable](./source/technical-story-template-source.es.md) | Necesites copiar la estructura canónica de Historia Técnica en un repositorio de producto o delivery. |
| **Ejemplo Renderizado** | [Abrir ejemplo renderizado UMS](./examples/technical-story-example-ums.es.md) | Quieras ver cómo una Historia Técnica conecta implementación, pruebas, documentación y trazabilidad. |

---

## Reglas de Autoría

- Crea una Historia Técnica por unidad clara de implementación.
- Enlaza toda Historia Técnica con su Historia Funcional padre.
- Incluye alcance de implementación en dominio, aplicación, infraestructura, API/UI, pruebas y documentación cuando aplique.
- El Build Exitoso no puede pasar sin evidencia DoD y trazabilidad CI.

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Framework SDLC Orientado a Construcción](../02-engineering/construction-focused-sdlc-framework.es.md) | Define gobernanza de construcción y DoD. |
| [Plantilla de Historia Funcional](./functional-story-template.es.md) | Artefacto padre de comportamiento de negocio. |
| [Gates de Calidad](../quality-gates.es.md) | Define umbrales obligatorios de build y validación. |
