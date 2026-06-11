# Centro de Estándares Corporativos (EAC)

> **Navegación Bilingüe:** [English Version](./README.md)

Bienvenido al repositorio central de la verdad arquitectónica. Cada documento presente aquí se considera **Normativa Obligatoria** para construir software dentro de la organización, salvo que el propio documento declare explícitamente una clasificación **Opcional** o **Condicional**.

## Meta y Objetivos

> **Meta:** alinear a todos los equipos a un único conjunto de estándares de ingeniería normativos, desde la visión hasta el onboarding.

**Objetivos:**

- Ordenar el corpus de estándares por fase del ciclo de vida (visión → blueprint → decisiones → ingeniería → entrega → onboarding).
- Hacer explícita la clasificación obligatorio/opcional de cada documento.
- Mantener los playbooks tácticos y las auditorías junto a los principios que los justifican.

---

## Mapa de Navegación Corporativa Exhaustivo

### Fase 00: Visión y Auditoría Interna

Principios no negociables de crecimiento, diagnósticos de consistencia y modelos de autoevaluación.

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Directivas Arquitectónicas y Evolución](./vision/architectural-directives.es.md) | Principios no negociables de crecimiento arquitectónico | Fijar la dirección estratégica | Directiva | Sí |
| [Estrategia Evolutiva y Tablero de Control](./vision/evolutionary-strategy-roadmap.es.md) | Visión global, roadmap estratégico y tablero de control | Alinear equipos al roadmap | Visión y estrategia | Sí |
| [Evaluación de Madurez](./vision/maturity-assessment.es.md) | Evaluación de madurez consolidada (TOGAF ACMM, WAF, patrones) | Medir la madurez arquitectónica | Evaluación | Sí |

### Fase 01: Blueprint y Topología (arc42)

El diseño estructural del sistema detallado en vistas C4 y CAP.

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Blueprint Corporativo Multi-Runtime](../../architecture/blueprints/reference-blueprint.es.md) | El blueprint de referencia entre runtimes (lectura obligatoria) | Definir la línea base estructural | Blueprint | Sí |
| [Especificación C4 Topología de Contenedores](../../architecture/blueprints/c4-topology-spec.es.md) | Topología de contenedores especificada en vistas C4 | Visualizar la topología | Blueprint | Sí |
| [Análisis Estratégico del Teorema CAP](../../architecture/blueprints/cap-strategic-analysis.es.md) | Análisis de trade-offs CAP para la plataforma | Fundamentar decisiones de consistencia | Blueprint | Sí |
| [Escenarios de Despliegue Multi-Cloud](../../architecture/blueprints/multi-cloud-deployment-scenarios.es.md) | Escenarios de despliegue entre clouds y on-premise | Planificar despliegues portables | Blueprint | Sí |
| [Stack Tecnológico Autoritativo](../../architecture/blueprints/authoritative-tech-stack.es.md) | Índice de perfiles de runtime aprobados | Acotar elecciones tecnológicas | Blueprint | Sí |
| [Resumen Rápido del Stack](../../architecture/blueprints/tech-stack-summary.es.md) | Vista condensada del stack aprobado | Resumir decisiones de stack | Referencia | Sí |

### Fase 02: Registros de Decisión Arquitectónica (ADRs)

La historia consolidada y clasificada de las decisiones arquitectónicas activas en Core, Node.js, .NET y Android.

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Navegador Central de ADRs](../../architecture/adrs/README.es.md) | Todos los ADRs de Evolith clasificados por alcance | Encontrar la decisión controladora | Hub de área | Sí |
| [Matriz de Decisiones ADR por Necesidad](../../architecture/adrs/adr-matrix.es.md) | Mapea preocupaciones arquitectónicas a sus ADRs controladores | Acelerar el descubrimiento de decisiones | Índice de decisiones | Sí |

### Fase 03: Estándares de Ingeniería y Auditoría de Stack

Playbooks de implementación táctica, seguridad defensiva y validación de mercado.

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Convención sobre Configuración](./engineering/convention-over-configuration.es.md) | Estándar de diseño para sistemas configurables y productos hijos | Estandarizar la parametrización | Estándar | Sí |
| [Licensing & Open Source Governance](./engineering/licensing-and-open-source-governance.es.md) | Selección responsable de tecnologías de cero costo | Gobernar la selección tecnológica | Estándar | Sí |
| [Opinión de Auditoría de Stack 2026](./engineering/detailed-stack-audit-2026.es.md) | Evaluación de licencias y auditoría del stack | Validar el stack legalmente | Evaluación | Sí |
| [Análisis Técnico Senior y Roadmap](./engineering/senior-architectural-assessment.es.md) | Evaluación técnica senior y roadmap de mejoras | Priorizar mejoras | Evaluación | Sí |
| [Manifiesto de Ingeniería Global (SOLID/OWASP)](./engineering/engineering-manifesto.es.md) | Principios globales de ingeniería y línea base de seguridad | Alinear la práctica de ingeniería | Estándar | Sí |
| [Content Management Abstraction](./engineering/content-management-abstraction.es.md) | Headless CMS como acelerador de time-to-market | Acelerar la entrega de contenido | Estándar | No |
| [Guía Táctica de Pruebas de Contrato (Pact)](./engineering/contract-testing-guideline.es.md) | Guía de implementación de pruebas de contrato | Verificar contratos de servicios | Playbook | Sí |
| [Playbook de Estrategia de Observabilidad](./engineering/observability-playbook.es.md) | Estrategia y prácticas de observabilidad | Estandarizar la instrumentación | Playbook | Sí |
| [Manual de Plugins del API Gateway (Kong/Traefik)](./engineering/gateway-guidelines.es.md) | Guía de plugins del gateway | Estandarizar el perímetro | Playbook | Sí |
| [Evaluación de Riesgos de Proveedores y Cadena de Suministro](./engineering/vendor-risk-assessment.es.md) | Evaluación de riesgo de vendors y cadena de suministro | Controlar el riesgo de terceros | Evaluación | Sí |

### Fase 04: Gobernanza y Entrega

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Estrategia de Lanzamiento y Auditoría (Nx)](./governance-docs/release-audit-strategy.es.md) | Estrategia de releases y auditoría del monorepo | Gobernar los releases | Estándar | Sí |

### Fase 05: Onboarding (Incorporación)

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Guía de Inicio Rápido para Nuevos Productos](./onboarding/product-quick-start.es.md) | Ruta rápida para arrancar un producto nuevo | Acelerar el onboarding de productos | Guía | Sí |
| [Guía de Herencia de Repositorios Hijos](./onboarding/child-repository-inheritance-guide.es.md) | Cómo los repositorios satélite heredan de Evolith | Estandarizar la herencia | Guía | Sí |
| [Glosario Arquitectónico](../glossary.es.md) | Terminología canónica para todo el corpus | Mantener el lenguaje consistente | Glosario | Sí |

---

*Esta documentación es agnóstica al dominio del negocio y regula estrictamente la estructura tecnológica del holding.*

---

## Arquitectura Aumentada por IA (Opcional)

Extensión opcional para equipos y productos que buscan incorporar agentes de IA, harness engineering y MCP en su arquitectura. No modifica ni reemplaza ningún estándar corporativo existente.

| Documento | Descripción | Objetivo / Meta | Tipo | Obligatorio |
|---|---|---|---|---|
| [Visión General AI-Augmented](./ai-augmented/README.es.md) | Introducción, modelo de madurez, MCP, patrones agénticos y ADRs de IA | Adoptar IA con seguridad | Hub de área | No |
| [Frameworks AI-DD — Referencia de Adopción](./ai-augmented/frameworks/README.es.md) | Cómo este repositorio adoptó BMAD-METHOD: agentes, reglas de harness y guía de replicación | Replicar la configuración AI-DD | Referencia | No |

---

[Volver al Hub de Gobernanza](../README.es.md)
