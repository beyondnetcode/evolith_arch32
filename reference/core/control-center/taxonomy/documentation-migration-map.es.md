# Mapa de Migración de Documentación Evolith

> **Navegación bilingüe:** [English version](./documentation-migration-map.md)

**Estado:** Plan de Migración Activo  
**Propietario:** Evolith Architecture Board  
**Alcance:** Solo documentación — no incluye código ni cambios de implementación

---

## 1. Objetivo

Migrar documentación mezclada hacia dominios explícitos sin romper enlaces históricos, navegación bilingüe ni referencias de auditoría.

```text
Evolith Core
  = arquitectura universal + gobernanza SDLC + estándares + reglas + schemas

Evolith Product Suite
  = visión de portafolio + estrategia + mapa de productos + posicionamiento

Product-Specific Design
  = diseño interno de Tracker, Smart CLI, servicios MCP y productos futuros

Platform Guidance
  = vendors, herramientas, adapters, licencias y perfiles de despliegue
```

---

## 2. Estados de Migración

| Estado | Significado |
|---|---|
| **Classified** | El dominio objetivo está aprobado; la fuente sigue en la ruta heredada |
| **Indexed** | El hub canónico enlaza a la fuente heredada |
| **Copied** | Existe el archivo canónico y también la fuente heredada |
| **Redirected** | El archivo heredado contiene un aviso de reubicación |
| **Validated** | Enlaces, anchors, diagramas y paridad bilingüe pasan validadores |
| **Deprecated** | La ruta heredada está en periodo aprobado de retiro |
| **Retired** | La ruta heredada fue eliminada después de validación y deprecación |

---

## 3. Matriz Actual

| Documento Heredado | Clasificación | Destino Canónico | Estado Actual |
|---|---|---|---|
| `reference/core/control-center/evolith-product-vision-master.md` | Product Suite Vision | `product/suite/vision/evolith-product-vision-master.md` | Indexed |
| `.../evolith-product-vision-master.es.md` | Product Suite Vision | `product/suite/vision/evolith-product-vision-master.es.md` | Indexed |
| `.../evolith-strategic-validation-and-composition-framework.md` | Product Suite Strategy | `product/suite/strategy/strategic-validation-and-composition-framework.md` | Indexed |
| `.../evolith-strategic-positioning-comparative-landscape.md` | Product Suite Positioning | `product/suite/positioning/strategic-comparative-landscape.md` | Indexed |
| `.../evolith-ai-assisted-validation-workflow.md` | Product Suite Method | `product/suite/methods/ai-assisted-validation-workflow.md` | Indexed |
| `.../evolith-governed-composition-target-design.md` | Mixto; debe dividirse | Arquitectura de Suite + principio Core + diseño Tracker | Classified |
| `.../evolith-provider-abstraction-plugin-model.md` | Core Architecture Principle | `reference/core/foundations/principles/provider-abstraction-plugin-model.md` | Indexed |
| `.../sdlc-tracker-technical-interfaces.md` | Product-Specific Design | `product/products/evolith-tracker/interfaces/technical-interfaces.md` | Indexed |
| `reference/core/sdlc/traceability-model.md` | SDLC Governance Standard | `reference/core/sdlc/traceability/evidence-graph-model.md` | Classified |
| `reference/core/foundations/common-rules/communication/visuals/v01-executive-one-pager.md` | Product Suite Communication | `product/suite/communication/executive-one-pager.md` | Indexed |

El mismo estado aplica a cada par español salvo que se registre explícitamente lo contrario.

---

## 4. División Obligatoria del Diseño de Composición Gobernada

| Contenido | Destino Canónico |
|---|---|
| Neutralidad, abstracción e invariantes de plugins | Core Architecture Principle |
| Contexto del portafolio y relaciones entre productos | Product Suite Architecture |
| Contenedores, servicios, dominio, REST/MCP y persistencia de Tracker | Evolith Tracker Product Design |
| Autoridad de Phase Gates y semántica del Evidence Graph | SDLC Governance |
| Langfuse, Claude, Superset, Jira y ejemplos nombrados | Platform Guidance o ejemplos informativos |

La división debe eliminar duplicidad y establecer una única fuente autoritativa por concepto.

---

## 5. Orden de Migración

### Ola 1 — Fronteras y Hubs

- [x] Taxonomía documental creada.
- [x] Hub Evolith Core creado.
- [x] Hub Product Suite creado.
- [x] Hub de diseños específicos creado.
- [x] Hub de plataformas y proveedores creado.
- [x] Reference Hub actualizado.

### Ola 2 — Copias Canónicas

- [ ] Copiar Product Vision Master a Product Suite Vision.
- [ ] Copiar estrategia, posicionamiento, métodos y comunicación.
- [ ] Copiar Provider Abstraction a Core Architecture Principles.
- [ ] Copiar el diseño técnico hacia la estructura de Tracker.
- [ ] Copiar Evidence Graph hacia la estructura SDLC.

### Ola 3 — Alineamiento

- [ ] Actualizar enlaces entrantes.
- [ ] Actualizar pares bilingües.
- [ ] Reparar enlaces relativos y anchors.
- [ ] Confirmar que Suite no define reglas universales.
- [ ] Confirmar que productos no redefinen SDLC Governance.
- [ ] Confirmar que vendors nombrados permanecen en Platform Guidance o ejemplos.

### Ola 4 — Compatibilidad

- [ ] Reemplazar rutas heredadas con avisos bilingües de reubicación.
- [ ] Preservar historial y URLs.
- [ ] Añadir metadata de deprecación.

### Ola 5 — Validación

- [ ] Ejecutar validador documental.
- [ ] Ejecutar paridad bilingüe.
- [ ] Validar Mermaid.
- [ ] Validar anchors y enlaces relativos.
- [ ] Revisar metadata de clasificación.
- [ ] Obtener aprobación del Architecture Board.

---

## 6. Reglas Durante la Migración

1. No eliminar un documento autoritativo antes de validar su reemplazo.
2. No mantener dos copias autoritativas editables.
3. Los archivos canónicos son editables; los avisos de reubicación son compatibilidad inmutable.
4. Inglés y español se mueven juntos.
5. Todo movimiento exige revisar enlaces relativos.
6. Los IDs de ADRs y referencias históricas permanecen estables.
7. Esta migración no cambia código, rulesets ni schemas.

---

## 7. Gate de Aprobación

Los movimientos físicos requieren aprobación de:

- taxonomía y fronteras;
- rutas canónicas;
- división de documentos mixtos;
- estrategia de compatibilidad y deprecación;
- secuencia bilingüe.

---

[Volver a la Taxonomía de Documentación](./documentation-taxonomy.es.md)
