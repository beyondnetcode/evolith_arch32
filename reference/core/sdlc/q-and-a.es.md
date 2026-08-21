# Evolith Core — Preguntas y Respuestas

> **Navegación Bilingüe:** [English Version](./q-and-a.md)

**Estado:** Referencia Activa
**Responsable:** Evolith Architecture Board
**Creado:** 2026-07-23
**Última Actualización:** 2026-07-23

Este Q&A responde las preguntas más comunes sobre Evolith Core en lenguaje común, con ejemplos concretos y links a evidencia. Las categorías son expandibles — haz clic para expandir.

---

<details open>
<summary><h2>Categoría 1: Sobre Evolith — ¿Qué es esto?</h2></summary>

<details>
<summary><b>T01-P01: ¿Qué es Evolith en una frase?</b></summary>

**Respuesta:** Evolith es un **framework ejecutable de gobernanza arquitectónica** — se asegura de que las decisiones de arquitectura realmente se cumplan, automáticamente, ya sea que el código lo escriba un humano o un agente AI.

Piensa en él como una "constitución" para tu software: define las reglas y luego verifica automáticamente que cada pieza de código, cada despliegue y cada decisión siga esas reglas.

**Ejemplo:** Tu equipo decide "todos los servicios deben usar schema-per-context." Evolith codifica esa regla y bloquea automáticamente cualquier PR que comparta una tabla entre contextos.

**Evidencia:** [ADR-0079](../architecture/adrs/core/0079-multi-topology-reference-corpus.md), [README.md](../../README.md)
</details>

<details>
<summary><b>T01-P02: ¿Para qué lo usaría yo?</b></summary>

**Respuesta:**
1. **Feedback instantáneo** en decisiones arquitectónicas — ejecuta `evolith validate` y sabe en segundos si tu código cumple.
2. **Sin refactors sorpresa** — el drift se detecta en el gate, no seis meses después.
3. **Gobernanza a prueba de AI** — cuando un agente AI escribe código, Evolith asegura que siga las mismas reglas que un arquitecto senior.

**Evidencia:** [Gap Tracking Board](../control-center/gaps/gap-tracking.md), [ADR-0002](../architecture/adrs/nodejs/0002-clean-architecture-nestjs.md)
</details>

<details>
<summary><b>T01-P03: ¿Qué beneficios me da como desarrollador?</b></summary>

**Respuesta:**
- **Onboarding más rápido.** `evolith validate` te dice qué arreglar.
- **Confianza en PRs.** Si Evolith pasa, tu código sigue la arquitectura.
- **Menos cambio de contexto.** Reglas consolidadas en un solo comando.
- **Integración AI.** Alimenta contexto a Cursor, Claude Desktop o cualquier herramienta MCP.

**Evidencia:** [Evolith CLI hub](../../../product/products/smart-cli/README.md)
</details>

<details>
<summary><b>T01-P04: ¿Qué beneficios me da como arquitecto?</b></summary>

**Respuesta:**
- **Aplicar decisiones automáticamente.** Tus ADRs se convierten en reglas ejecutables.
- **Medir salud arquitectónica.** Score 3.32/5 con evidencia.
- **Rastrear desviaciones.** 568 gaps trackeados, 554 cerrados.
- **Multi-topología.** Monolito, event-driven, serverless — todo gobernado igual.

**Evidencia:** [Maturity Assessment](../control-center/maturity-reports/maturity-assessment.md), [ADR Matrix](../architecture/adrs/adr-matrix.md)
</details>

<details>
<summary><b>T01-P05: ¿Qué beneficios me da como líder o manager?</b></summary>

**Respuesta:**
- **Entrega predecible.** Gates enfocan calidad en cada etapa.
- **Auditoría.** Cada decisión documentada, cada gap trackeado, cada cierre verificable.
- **Riesgo reducido.** Anti-patrones inmunizados.
- **Ahorro de costos.** Drift y retrabajo prevenidos sistemáticamente.

**Evidencia:** [Anti-Pattern Immunization](../control-center/maturity-reports/maturity-assessment.md)
</details>

<details>
<summary><b>T01-P06: ¿Es lo mismo que un linter?</b></summary>

**Respuesta:** Los linters revisan estilo. Evolith revisa **decisiones arquitectónicas**.

| | Linter (ESLint) | Analyzer (SonarQube) | Evolith |
|---|---|---|---|
| **Alcance** | Estilo, sintaxis | Calidad, bugs | Arquitectura, gobernanza |
| **Reglas** | Config files | Built-in + plugins | Tus propios ADRs |
| **Dual-engine** | No | No | Sí (TypeScript + OPA) |

**Evidencia:** [ADR-0041](../architecture/adrs/core/0041-dual-engine-policy-evaluation.md)
</details>

<details>
<summary><b>T01-P07: ¿Necesito ser experto para usarlo?</b></summary>

**Respuesta:** No. Niveles graduados:
- **Desarrollador:** `evolith validate` y arregla lo que reporta.
- **Tech lead:** `evolith gate` para verificar fases.
- **Arquitecto:** `evolith drift` para análisis profundo.

**Evidencia:** [Using the CLI](../interfaces/using-the-cli.md)
</details>

</details>

---

<details>
<summary><h2>Categoría 2: Productos y Costos</h2></summary>

<details>
<summary><b>T02-P01: ¿Qué productos tiene?</b></summary>

| Producto | Qué es | Costo |
|---|---|---|
| **Evolith Core** | Base: reglas, ADRs, schemas | Gratis (MIT) |
| **Evolith CLI** | Gobernanza CLI | Gratis (MIT, npm) |
| **Core API** | REST remoto | Gratis (open source) |
| **MCP Services** | Integración AI | Gratis (dentro del CLI) |
| **Agent Runtime** | Orquestación hexagonal | Gratis (open source) |
| **Evolith Tracker** | Enterprise multi-tenant | Pago (Enterprise) |

**Evidencia:** [Product hub](../../../product/README.md)
</details>

<details>
<summary><b>T02-P02: ¿Cuánto cuesta?</b></summary>

**Respuesta:** La plataforma core es **completamente gratis** (MIT). CLI, MCP, API, Agent Runtime, 137 ADRs, 163 rulesets, 45 schemas. Solo Tracker es de pago (aún no lanzado).

**Ejemplo:** Startup de 5 personas: $0. Empresa de 500: paga por Tracker.

**Evidencia:** [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)
</details>

<details>
<summary><b>T02-P03: ¿Qué es "Open-Core"?</b></summary>

**Respuesta:** La plataforma fundacional es open source y gratis. Las funcionalidades enterprise (Tracker) se monetizan por separado.

**Evidencia:** [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)
</details>

<details>
<summary><b>T02-P04: ¿Cómo se compara con SonarQube?</b></summary>

**Respuesta:** SonarQube detecta calidad de código. Evolith detecta **decisiones arquitectónicas**. Se complementan.

**Evidencia:** [Maturity Assessment](../control-center/maturity-reports/maturity-assessment.md)
</details>

</details>

---

<details>
<summary><h2>Categoría 3: Cómo Empezar</h2></summary>

<details>
<summary><b>T03-P01: ¿Cómo instalo el CLI?</b></summary>

```bash
npm install -g @beyondnet/evolith-cli
evolith --version
```

Requisitos: Node.js >= 20.0.0.
</details>

<details>
<summary><b>T03-P02: ¿Cómo inicializo un proyecto?</b></summary>

```bash
cd tu-proyecto
evolith init --topology modular-monolith
```

Crea `evolith.yaml` con tu topología y reglas heredadas.
</details>

<details>
<summary><b>T03-P03: ¿Cómo valido mi código?</b></summary>

```bash
evolith validate
evolith validate --topology modular-monolith
evolith validate --phase construction
```

**Evidencia:** [Using the CLI](../interfaces/using-the-cli.md)
</details>

<details>
<summary><b>T03-P04: ¿Cómo conecto a CI/CD?</b></summary>

```yaml
- uses: beyondnetcode/evolith-validate@v1
  with:
    topology: modular-monolith
```

**Evidencia:** [ADR-0018](../architecture/adrs/core/0018-testing-pyramid-quality-gates.md)
</details>

<details>
<summary><b>T03-P05: ¿Cómo integro con Cursor o Claude?</b></summary>

```json
{
  "mcpServers": {
    "evolith": {
      "command": "evolith",
      "args": ["mcp"]
    }
  }
}
```

**Evidencia:** [MCP Services](../../../product/products/mcp-services/README.md), [ADR-0069](../architecture/adrs/core/0069-ai-agent-context-protocol-integration.md)
</details>

</details>

---

<details>
<summary><h2>Categoría 4: Arquitectura y Topologías</h2></summary>

<details>
<summary><b>T04-P01: ¿Qué son las 5 dimensiones topológicas?</b></summary>

| Dimensión | Pregunta | Topologías |
|---|---|---|
| **Progressive** | ¿Cómo se decompone? | Modular Monolith, Distributed Modules, Microservices |
| **Execution** | ¿Dónde corre? | Serverless, Edge Computing |
| **Integration** | ¿Cómo se comunican? | Event-Driven |
| **Data** | ¿Propiedad de datos? | Data Mesh |
| **AI** | ¿Agentes AI? | Agentic AI |

**Evidencia:** [Topology Dimensions](../architecture/topologies/topology-dimensions.md)
</details>

<details>
<summary><b>T04-P02: ¿Qué topologías cubre?</b></summary>

8 topologías: Modular Monolith, Distributed Modules, Microservices, Serverless, Edge Computing, Event-Driven, Data Mesh, Agentic AI. Todas con paridad dual-engine y validación CI.

**Evidencia:** [Maturity Assessment Section 8](../control-center/maturity-reports/maturity-assessment.md)
</details>

<details>
<summary><b>T04-P03: ¿Por qué cubre múltiples topologías?</b></summary>

Los productos reales no caben en una caja. Evolith permite composición libre entre dimensiones.

**Evidencia:** [Composition Matrix](../control-center/maturity-reports/maturity-assessment.md)
</details>

<details>
<summary><b>T04-P04: ¿Qué es la composición de topologías?</b></summary>

Puedes combinar topologías de dimensiones distintas. Dos topologías hub componen con todo: **Event-Driven** y **Agentic AI**. Ejemplo: `modular-monolith + event-driven` es válido. `modular-monolith + microservices` NO lo es (misma dimensión).

**Evidencia:** [Schema de Composición](../../../src/rulesets/schema/topology-composition.schema.json)
</details>

<details>
<summary><b>T04-P05: ¿Por qué empezar con monolito modular?</b></summary>

Distribución prematura es el error #1. Empezar simple (F1), extraer cuando justificado (ADR-0045), microservicios solo cuando la madurez operacional lo justifique.

**Evidencia:** [ADR-0045](../architecture/adrs/core/0045-microservice-extraction-readiness-criteria.md)
</details>

</details>

---

<details>
<summary><h2>Categoría 5: Madurez y Medición</h2></summary>

<details>
<summary><b>T05-P01: ¿Qué significa 3.32/5?</b></summary>

Escala 1-5: Evolith está en **3.3** — transición de "procesos documentados" a "automáticamente medidos y controlados."

**Evidencia:** [Maturity Assessment Section 12](../control-center/maturity-reports/maturity-assessment.md)
</details>

<details>
<summary><b>T05-P02: ¿Por qué dos dimensiones?</b></summary>

**Dimensión A** (Calidad: 3.32/5) mide qué tan bien está construido. **Dimensión B** (Alcance: 5/5) mide cuánto gobierna.

**Evidencia:** [Maturity Assessment Section 1](../control-center/maturity-reports/maturity-assessment.md)
</details>

<details>
<summary><b>T05-P03: ¿Qué está en riesgo?</b></summary>

1. **Confiabilidad (Level 3):** Circuit breakers diseñados no testeados. DR multi-región propuesto no implementado.
2. **Gobernanza Federada (Level 3):** Evidencia de gates es "solo-existencia."

**Evidencia:** [Maturity Assessment Pillar 3](../control-center/maturity-reports/maturity-assessment.md)
</details>

</details>

---

<details>
<summary><h2>Categoría 6: Dual-Engine y Reglas</h2></summary>

<details>
<summary><b>T06-P01: ¿Qué es Dual-Engine Parity?</b></summary>

Cada regla existe en TypeScript Nativo y OPA Rego. Ambos deben estar de acuerdo. Si discrepan, CI falla.

**Evidencia:** [ADR-0041](../architecture/adrs/core/0041-dual-engine-policy-evaluation.md)
</details>

<details>
<summary><b>T06-P02: ¿Qué son los 45 schemas?</b></summary>

Validan todos los artefactos estructurados: ADRs, PRDs, historias, topologías, configuraciones, evaluaciones, reportes de seguridad.

**Evidencia:** [Schema directory](../../../src/rulesets/schema/)
</details>

<details>
<summary><b>T06-P03: ¿Puedo crear mis propias reglas?</b></summary>

Sí. Agrega reglas a `evolith.yaml`, crea `.rules.json`, escribe `.rego`, o usa MCP para evaluación runtime.

**Evidencia:** [Ruleset Standard Schema](../../../src/rulesets/schema/ruleset-standard.schema.json)
</details>

</details>

---

<details>
<summary><h2>Categoría 7: Anti-Patrones</h2></summary>

<details>
<summary><b>T07-P01: ¿Qué problemas previene?</b></summary>

6 anti-patrones: Monolito Distribuido (EXTREMO), BD Compartida (MUY ALTO), Fat Controller (ALTO), Log Shards (ALTO), God Module (ALTO), Leaky Shared Library (ALTO).

**Evidencia:** [Anti-Pattern Immunization](../control-center/maturity-reports/maturity-assessment.md)
</details>

<details>
<summary><b>T07-P02: ¿Qué es un "monolito distribuido"?</b></summary>

Servicios tan acoplados que no puedes desplegar independientemente. Evolith previene con bus async (ADR-0015) y aislamiento hexagonal (ADR-0002).

**Evidencia:** [ADR-0015](../architecture/adrs/core/0015-event-driven-architecture-intra-domain.md)
</details>

<details>
<summary><b>T07-P03: ¿Qué es el "Strangler Fig"?</b></summary>

Patrón de migración incremental: reemplazar partes del legacy con componentes nuevos sin una reescritura big-bang. En Evolith los módulos están aislados desde el día uno, así que la extracción es incremental.

**Evidencia:** [Matriz de Madurez de Patrones](../control-center/maturity-reports/maturity-assessment.es.md)
</details>

</details>

---

<details>
<summary><h2>Categoría 8: AI y Agentes</h2></summary>

<details>
<summary><b>T08-P01: ¿Cómo funciona con herramientas AI?</b></summary>

Vía MCP. Servidor con 51 tools, 12 resources, 8 prompts. Los agentes AI consultan reglas, validan código y evalúan gates — todo gobernado.

**Evidencia:** [MCP Services](../../../product/products/mcp-services/README.md)
</details>

<details>
<summary><b>T08-P02: ¿Qué nivel de madurez AI tiene?</b></summary>

Nivel 2.2. Herramientas ya en Nivel 3 (ciclo agentic, RAG, OTel). Verificación, Modelos y Seguridad en Nivel 2.

**Evidencia:** [AI-Augmented Maturity](../control-center/maturity-reports/maturity-assessment.md)
</details>

<details>
<summary><b>T08-P03: ¿Puede un AI saltarse la gobernanza?</b></summary>

No. Tools gobernadas (50), políticas ABAC, HITL, audit logging, y `binding: false`.

**Evidencia:** [ADR-0081](../architecture/adrs/core/0081-agentic-ai-sandbox-isolation.md), [ADR-0083](../architecture/adrs/core/0083-agentic-ai-action-authorization-audit.md)
</details>

</details>

---

<details>
<summary><h2>Categoría 9: Gobernanza Federada</h2></summary>

<details>
<summary><b>T09-P01: ¿Qué es un "satellite"?</b></summary>

Cualquier proyecto que adopta reglas de Core. Relación unidireccional: Core gobierna, satellites consumen.

**Evidencia:** [Satellite Definitions](../foundations/satellite-definitions/), [Inheritance Model](../foundations/inheritance-model/)
</details>

<details>
<summary><b>T09-P02: ¿Qué pasa cuando un gate falla?</b></summary>

Tres opciones: arreglar, solicitar waiver, o diferir como GT-xx. Gates mandatorios no se sobreescriten informalmente.

**Evidencia:** [Glossary (Gate)](./glossary/glossary-ecosystem.md#terms)
</details>

<details>
<summary><b>T09-P03: ¿Puedo personalizar reglas?</b></summary>

Sí: sobreescribir parámetros, diferir gaps, solicitar waivers. No puedes eliminar reglas de Core.

**Evidencia:** [Waiver Schema](../../../src/rulesets/schema/waiver.schema.json)
</details>

</details>

---

<details>
<summary><h2>Categoría 10: Adaptadores e Integración</h2></summary>

<details>
<summary><b>T10-P01: ¿Con qué se integra?</b></summary>

GitHub (CI), Cursor/Claude (MCP), herramientas MCP, CI/CD (CLI), Kubernetes (OPA), orquestadores (REST), agentes AI (Runtime).

**Evidencia:** [MCP Services](../../../product/products/mcp-services/README.md)
</details>

<details>
<summary><b>T10-P02: ¿Por qué M4 y no M5?</b></summary>

M4 = producción funcional. M5 = gobernado (OPA guard, tracing, aprobación, tests completos). Solo McpInteractionAdapter tiene tests.

**Evidencia:** [Adapter Maturity](../control-center/maturity-reports/maturity-assessment.md)
</details>

</details>

---

<details>
<summary><h2>Categoría 11: Gaps y Mejora Continua</h2></summary>

<details>
<summary><b>T11-P01: ¿Qué son los gaps (GT-xx)?</b></summary>

Desviaciones trackeadas. 568 totales, 554 DONE (97.5%).

**Evidencia:** [Gap Tracking Board](../control-center/gaps/gap-tracking.md)
</details>

<details>
<summary><b>T11-P02: ¿Cómo se cierra un gap?</b></summary>

Fix mergeado (commit real), evidencia existente, validación pasando, registro en `gap-closure-evidence.json`. CI verifica todo.

**Evidencia:** [Gap Closure Evidence Standard](../control-center/evidence/gap-closure-evidence-standard.md)
</details>

</details>

---

<details>
<summary><h2>Categoría 12: Visión y Futuro</h2></summary>

<details>
<summary><b>T12-P01: ¿Hacia dónde va Evolith?</b></summary>

F1 → F2 → F3. Tracker en diseño. AI a Nivel 3. Confiabilidad a Nivel 4.

**Evidencia:** [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)
</details>

<details>
<summary><b>T12-P02: ¿Qué significa "democratizar ingeniería elite"?</b></summary>

Hacer accesible la gobernanza de nivel FAANG para todos — open source, AI-powered, automatizado, basado en evidencia.

**Evidencia:** [Product Vision Master](../../../product/suite/vision/evolith-product-vision-master.md)
</details>

<details>
<summary><b>T12-P03: ¿Qué es el BMAD Intelligence Feedback Loop?</b></summary>

Insights de assessments retroalimentan agentes, reglas y skills. El sistema aprende de sus propios datos de gobernanza.

**Evidencia:** [BMAD Intelligence Update](../control-center/maturity-reports/maturity-assessment.md)
</details>

</details>

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Glossary Ecosystem](./glossary/glossary-ecosystem.md) | Definiciones canónicas |
| [Maturity Assessment](../control-center/maturity-reports/maturity-assessment.md) | Evaluación bidimensional |
| [ADR Matrix](../architecture/adrs/adr-matrix.md) | Buscar decisiones |
| [Gap Tracking Board](../control-center/gaps/gap-tracking.md) | Rastrear desviaciones |
| [Using the CLI](../interfaces/using-the-cli.md) | Guía práctica |
| [MCP Services](../../../product/products/mcp-services/README.md) | Integración AI |

---

*Este Q&A es un documento vivo. Actualízalo cuando surjan nuevas preguntas.*

---
[Volver al Hub SDLC](./README.md)
