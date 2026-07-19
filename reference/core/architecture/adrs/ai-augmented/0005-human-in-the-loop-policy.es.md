> **Navegacion Bilingue:** [English Version](./0005-human-in-the-loop-policy.md)

# ADR-0005: Politica de Humano-en-el-Loop para Operaciones Autonomas de Agentes

## Status
Accepted

## Date
2026-06-23

## Contexto y Problema
A medida que los agentes de IA de Evolith ganan autonomia a traves de cadenas de herramientas MCP, revision de codigo automatizada y remediacion activada por CI, el riesgo de consecuencias no deseadas crece. Los agentes que operan sin supervision humana pueden: fusionar codigo con regresiones sutiles, escalar costos de API mas alla del presupuesto, modificar artefactos de gobernanza sin aprobacion, o propagar cambios en cascada a traves de repositorios satelite.

El principio de humano-en-el-loop (HITL) no es nuevo, pero debe codificarse como una regla arquitectonica en vez de dejarse a la discrecion de cada flujo de trabajo. Sin limites explicitos, la linea entre "automatizacion util" y "autonomia peligrosa" se vuelve borrosa.

Vectores de riesgo actuales incluyen: (1) `13-agentic-code-review.mjs` puede proponer cambios de codigo via LLM sin revision humana del diff; (2) la sincronizacion del indice RAG puede hacer upsert de embeddings basados en contenido obsoleto; (3) el cierre de gaps activado por CI puede modificar artefactos de gobernanza sin aprobacion explicita.

## Decision
Establecemos una **Politica de Humano-en-el-Loop** con tres niveles de supervision humana:

### Nivel 1: Notificacion (Autonomo, Humano Informado)
Los agentes PUEDEN operar autonomamente para estas acciones:
- Ejecutar scripts de validacion y reportar resultados
- Generar borradores de documentacion (no commitear)
- Clasificar cambios en categorias de impacto
- Emitir telemetria de costos y alertas de presupuesto

El agente DEBE registrar la accion en OpenTelemetry con un atributo `hitl.tier: 1`.

### Nivel 2: Gate de Aprobacion (Humano Debe Confirmar)
Estas acciones requieren aprobacion humana explicita antes de la ejecucion:
- Commitear cambios de codigo en cualquier rama
- Fusionar pull requests
- Modificar artefactos de gobernanza `.rules.json` o `.rego`
- Invocar despliegues de servicios externos
- Cambiar configuracion del pipeline CI

El agente DEBE presentar un resumen de cambios estructurado y esperar una confirmacion booleana.

### Nivel 3: Escalacion (Humano Debe Intervenir)
Estas condiciones activan escalacion inmediata y detienen todas las operaciones autonomas:
- Agotamiento de presupuesto de tokens (restante < 10% del presupuesto declarado)
- Activacion de circuit breaker (`AGENT_LOOP_BREAKER`)
- Fallo de gate de validacion en pipeline CI
- Deteccion de deriva en artefactos de gobernanza entre motores Native y OPA
- Cualquier accion que afecte infraestructura de produccion

El agente NO DEBE proceder hasta que un humano resuelva explicitamente la escalacion.

### Enrutamiento de Escalacion
Las notificaciones de escalacion se enrutan via:
- Span de OpenTelemetry con `severity: critical`
- Creacion de GitHub Issue (para fallos de CI)
- Notificacion Slack/webhook (para eventos de presupuesto y circuit breaker)

## Consecuencias

### Positivas
- **Seguridad**: La escalacion de Nivel 3 previene que los agentes hagan cambios irreversibles sin conocimiento humano.
- **Control de costos**: La telemetria de Nivel 1 combinada con los gates de aprobacion de Nivel 2 previene excesos de presupuesto.
- **Integridad de gobernanza**: La aprobacion de Nivel 2 para artefactos de gobernanza asegura la autoría humana de decisiones arquitectonicas.
- **Auditabilidad**: Cada accion del agente se clasifica por nivel, permitiendo revision de cumplimiento posterior.

### Negativas
- **Reduccion de rendimiento**: Los gates de aprobacion de Nivel 2 agregan latencia a los flujos de trabajo de desarrollo.
- **Fatiga de alertas**: Si las escalaciones de Nivel 3 son demasiado frecuentes, los humanos pueden volverse insensibles a alertas criticas.
- **Ambigüedad de clasificacion**: Algunos casos borde pueden ser dificiles de clasificar en un solo nivel.

### Neutrales
- **Disputas de asignacion de nivel**: Cuando una accion abarca multiples niveles, el nivel mas alto aplicable gobierna. Las disputas se resuelven por el agente Architect.

## Referencias
- [ADR-0001: Ingenieria de Harness](./0001-harness-engineering.es.md)
- [ADR-0002: Protocolo de Integracion MCP](./0002-mcp-integration-protocol.es.md)
- [ADR-0092: Prevencion de Bucles Infinitos de Agentes](../core/0092-agent-infinite-loop-prevention.es.md)
- [ADR-0083: Auditoria de Autorizacion de Acciones Agentic de IA](../core/0083-agentic-ai-action-authorization-audit.es.md)
- [ADR-0091: Rotacion de Tokens de Identidad de Workload](../core/0091-workload-identity-token-rotation.es.md)

---
[Volver al Indice de ADRs](../README.es.md)

> **Firma del Agente:** Agente Arquitecto
