---
title: Auditoría de Documentación de Producto — Ecosistema Evolith
status: CERTIFICADO CON OBSERVACIONES
date: {{DATE}}
scope: reference/products/** + READMEs de paquetes de la base (packages/core, core-domain, infra-providers, sdk-client, mcp-tools, mcp-server)
---

# Auditoría de Documentación de Producto — Ecosistema Evolith

> **Veredicto:** **CERTIFICADO CON OBSERVACIONES**
> **Fecha:** {{DATE}}
> **Alcance de auditoría:** Hub oficial de productos (`reference/products/README.md`) y las superficies de documentación por producto, contrastadas contra el código en producción.

Esta auditoría certifica que el corpus de documentación de producto es apto para uso de gobernanza, **sujeto a las observaciones y al plan de corrección priorizado a continuación**. La certificación es condicional: las correcciones P0 (ya aplicadas) eran requisito para alcanzar este veredicto; los ítems P1/P2 permanecen abiertos.

> **Cómo leer la matriz de cobertura:** un `` marca **presencia** — el tema está documentado en algún lugar de la superficie de ese producto. **No** es garantía de profundidad ni de calidad. Una celda ausente (`__`) significa que la dimensión no se encontró en absoluto.

---

## 1. Inventario Oficial de Productos

Fuente de verdad: `reference/products/README.md`.

| Producto | Etiqueta del hub | Realidad | Nota |
|---|---|---|---|
| **Evolith Tracker** | activo | activo | — |
| **Smart CLI** | activo | activo | Mejor cobertura de documentación |
| **Core API** | activo | activo | — |
| **Evolith MCP Services** | **"planificado"** | **REALMENTE EN PRODUCCIÓN** | `packages/mcp-server` incluye un README de 717 líneas, `mcp-tools`, y está **desplegado**. **Etiqueta DESACTUALIZADA.** |
| **UMS Reference** | modelo de referencia | modelo de referencia | — |

**Base = Evolith Core.** La base comprende `packages/core`, `core-domain`, `infra-providers`, `sdk-client` y `mcp-tools`, documentados vía READMEs de paquete (no como una entrada de producto en el hub).

**Brecha menor:** `apps/agent-sandbox` es una demo de la topología Agentic-AI (GT-131) y está **sin documentar en el hub de productos**.

---

## 2. Matriz de Cobertura de 17 Dimensiones por Producto

Leyenda: `` = tema documentado (presencia, no profundidad) · `__` = ausente.

Dimensiones (en orden): **Desc · Alcance · CasosUso · Arq · Componentes · Instalación · Config · Operación · Integraciones · Interfaces · Seguridad · Observabilidad · HA · Rendimiento · Resiliencia · Roadmap · Madurez**

| Producto | Desc | Alcan | CasosUso | Arq | Comp | Instal | Config | Oper | Integr | Iface | Seg | Obs | HA | Rend | Resil | Roadmap | Madur |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **Core API** | | | | | | | | __ | | | | | __ | __ | | __ | |
| **Smart CLI** | | | | | | | | | | | | | __ | | __ | | |
| **MCP Services** | | | | | | | | | | | | | __ | | __ | __ | __ |
| **Tracker** | | | | | | __ | | | | | | | __ | | __ | | __ |
| **UMS Reference** | | | | | __ | __ | | | __ | | | | __ | | __ | __ | |

**Brechas por producto:**
- **Core API** — faltan: Operación, HA, Rendimiento, Roadmap.
- **Smart CLI** — faltan: HA, Resiliencia. *(mejor cobertura general)*
- **MCP Services** — faltan: HA, Resiliencia explícita, Roadmap, Madurez.
- **Tracker** — faltan: Instalación, HA, Resiliencia, Madurez.
- **UMS Reference** — faltan: Componentes, Instalación, Integraciones, HA, Resiliencia, Roadmap.

**Hallazgos sistémicos:**
- **HA = 0/5** — *ningún producto documenta Alta Disponibilidad.*
- La cobertura de **Resiliencia, Rendimiento y Roadmap** es débil en todo el corpus.
- Los **criterios de Release y la Madurez por producto** aparecen **solo en Smart CLI**.

---

## 3. Diagramas

- **110 archivos `.md`** contienen diagramas Mermaid embebidos — buena densidad de diagramas en el corpus.
- **Sin embargo**, el índice del hub de productos (`reference/products/README.md`) contiene **0 diagramas** — **no existe un diagrama de relación del ecosistema** a nivel de hub.
- **No existen activos de diagrama independientes** (`.mmd` / `.drawio`); todos los diagramas son Mermaid embebidos en Markdown.

---

## 4. Glosario

- El `glossary.md` oficial es **a nivel de corpus**: cubre Evolith, BMAD, ADR, Blueprint, Standard, Guide, UMS y términos similares.
- **NO** cubre el **canon operacional/de producto**: SDLC, Phase, Gate, Artifact, Topology, Ruleset, OPA, Schema, Manifest, Tenant, Tracker, SmartCLI, MCP, Core-API, AI Agents y **Release** están todos ausentes.
- **No existía un único glosario canónico del ecosistema.** Se está creando uno como `glossary-ecosystem.md`.

---

## 5. Consistencia

- **Desconflación de topología — HECHA.** Phase fue removida del contrato de topología; F1–F5 fueron reclasificadas como **niveles de madurez**.
- **Documentación de CLI desactualizada — ENCONTRADA.** `smart-cli/README.md` documentaba `--phase f1..f5`, pero la propia CLI (`validate.command.ts`) **ya usa** `discovery / design / construction / qa / release` y marca `f1..f5` como **deprecado**. La corrección es **solo de documentación** y **ya ha sido aplicada**.
 - *Evidencia:* `reference/products/smart-cli/README.md` líneas 78, 89, 99, 106 contenían las referencias desactualizadas a `--phase f1`.
- **Drift de doc en conteo de herramientas MCP** — la documentación indica **25/7/7**, el código entrega **27/8/9**. Anotado para reconciliación.

---

## 6. Cobertura de Flujos (conteo de documentación)

| Flujo | Docs | Estado |
|---|--:|---|
| Agentes IA | 85 | OK |
| SDLC / gates | 82 | OK |
| Rulesets / OPA | 65 | OK |
| Tenant | 34 | OK |
| Operación / release | 27 | OK |
| ADRs | 24 | OK |
| Idea producto | 23 | OK |
| Clientes externos | 13 | Moderado |
| Blueprints | 7 | Moderado |
| Consulta arquitectónica independiente | 5 | Débil |
| **Selección de topología** | **1** | **Muy débil** |

---

## 7. Riesgos

| ID | Riesgo | Severidad |
|---|---|---|
| **R1** | Glosario canónico incompleto | **Alta** |
| **R2** | F1–F5 reintroduce confusión phase/topología | **Alta** |
| **R3** | Percepción errónea de MCP "planificado" (producto en producción parece no disponible) | **Media** |
| **R4** | Alta Disponibilidad sin documentar en todos los productos | **Alta (operacional)** |
| **R5** | Criterios de release documentados solo en Smart CLI | **Media** |
| **R6** | Flujo de selección de topología casi ausente | **Media** |

---

## 8. Plan de Corrección Priorizado

### P0 — Requerido para la certificación (HECHO)
- Corregir referencias `f1-f5` en docs de Smart CLI (`smart-cli/README.md`).
- Reetiquetar MCP Services de **planificado activo** en el hub de productos.
- Crear el glosario canónico del ecosistema (`glossary-ecosystem.md`).

### P1 — Requerido para cerrar brechas sistémicas
- Documentar **HA / Resiliencia / Rendimiento** para cada producto.
- Agregar **Roadmap / Madurez / criterios de Release** para los 4 productos que carecen de ellos (Core API, MCP Services, Tracker, UMS Reference).
- Agregar un **diagrama de relación del ecosistema** al hub de productos (`reference/products/README.md`).

### P2 — Calidad y completitud
- Redactar el **flujo de selección de topología** (actualmente 1 doc).
- Reconciliar el **conteo de herramientas MCP** en documentación (25/7/7 27/8/9).
- Reconocer **`apps/agent-sandbox`** (demo de topología Agentic-AI, GT-131) en el hub de productos.

---

## 9. Checklist de Completitud

- [x] Inventario oficial de productos enumerado y contrastado contra el código en producción
- [x] Matriz de cobertura de 17 dimensiones construida por producto
- [x] Brechas dimensionales sistémicas identificadas (HA = 0/5)
- [x] Densidad de diagramas y brecha de diagrama a nivel de hub evaluadas
- [x] Alcance del glosario evaluado; glosario canónico del ecosistema iniciado
- [x] Consistencia (desconflación de topología, docs de CLI desactualizadas, drift de MCP) verificada
- [x] Cobertura de flujos contada y calificada
- [x] Riesgos registrados con severidad
- [x] Plan de corrección priorizado (P0/P1/P2) emitido
- [x] Correcciones P0 aplicadas

---

## 10. Veredicto Final

> **CERTIFICADO CON OBSERVACIONES**

El corpus de documentación de producto de Evolith queda **certificado para uso de gobernanza**, condicionado a las correcciones P0 aplicadas y al plan P1/P2 abierto. El corpus demuestra fuerte profundidad por producto (especialmente Smart CLI) y alta densidad de diagramas, pero arrastra **brechas sistémicas** — notablemente **Alta Disponibilidad sin documentar en los cinco productos**, **criterios de Release/Madurez aislados a Smart CLI**, un **flujo de selección de topología casi ausente**, y una **etiqueta "planificado" desactualizada sobre un producto MCP en producción** (ya corregida). La matriz refleja **presencia, no profundidad**: un `` confirma que un tema está documentado, no que esté bien documentado.
