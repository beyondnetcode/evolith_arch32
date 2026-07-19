> **Navegacion Bilingue:** [English Version](./0003-model-selection-governance.md)

# ADR-0003: Gobernanza de Seleccion de Modelos para Flujos de Trabajo Augmentados por IA

## Status
Accepted

## Date
2026-06-23

## Contexto y Problema
El harness CI y los flujos de trabajo de agentes de Evolith invocan multiples modelos de IA para diferentes propositos: revision de codigo (revision agentic), embeddings (indice RAG), y potencialmente clasificacion o resumen. Sin gobernanza, la seleccion de modelos se vuelve implicita e inconsistente: diferentes scripts pueden codificar diferentes endpoints de modelo, los perfiles de costo no se rastrean, y las deprecaciones de modelos se propagan como fallos silenciosos.

El `13-agentic-code-review.mjs` actual historicamente codificaba el endpoint de Gemini. Aunque el refactoring movio la logica de proveedor a `review-provider.mjs`, los criterios de seleccion para que modelo usar en que contexto permanecen ad hoc. No existe un registro centralizado de que modelos estan en uso, sus perfiles de costo, o sus cronogramas de deprecacion.

## Decision
Establecemos la **Gobernanza de Seleccion de Modelos** con tres reglas vinculantes:

### 1. Registro de Modelos
Todos los modelos de IA usados en flujos de trabajo de Evolith DEBEN registrarse en un artefacto `model-registry.json` con:
- Identificador del modelo y proveedor (ej., `gemini-2.0-flash`, `text-embedding-3-small`)
- Clasificacion de capacidad (`revision-de-codigo`, `embedding`, `clasificacion`, `generacion`)
- Nivel de costo (`presupuesto`, `estandar`, `premium`)
- Fecha de deprecacion si aplica
- Variable de entorno requerida para credenciales
- Presupuesto maximo de tokens por invocacion

El registro es la unica fuente de verdad. Los scripts que referencian modelos no registrados se consideran no conformes.

### 2. Politica de Seleccion
La seleccion de modelos para cada flujo de trabajo DEBE seguir una politica declarada:
- **Politica por defecto**: Usar el modelo de menor costo que cumpla con el requisito de capacidad
- **Politica de override**: Override explicito por flujo de trabajo cuando el predeterminado es insuficiente
- **Politica de emergencia**: Modelo de respaldo cuando el primario no esta disponible (debe declararse)

Las politicas se evaluan al inicio del script. Si el modelo declarado no esta disponible y no existe politica de emergencia, el script DEBE terminar con codigo 1 en vez de volver silenciosamente a un modelo no registrado.

### 3. Telemetria de Costos
Cada invocacion de modelo DEBE emitir un registro de telemetria estructurado conteniendo:
- ID del modelo utilizado
- Conteo de tokens de entrada/salida
- Latencia en milisegundos
- Flujo de trabajo y paso que触发ó la invocacion
- Si la invocacion estaba dentro del presupuesto

Los agregados de telemetria de costos se revisan semanalmente. Los flujos de trabajo que exceden su presupuesto declarado activan una alerta y requieren renovacion explicita antes de la proxima ventana de ejecucion.

## Consecuencias

### Positivas
- **Predecibilidad de costos**: Las revisiones semanales de telemetria previenen gastos descontrolados en IA.
- **Resiliencia**: Los modelos de respaldo declarados permiten degradacion graciosa cuando un proveedor esta caido.
- **Auditabilidad**: El registro de modelos proporciona una unica fuente de verdad para que modelos estan en uso.
- **Seguridad de deprecacion**: Las fechas de deprecacion conocidas previenen roturas repentinas.

### Negativas
- **Mantenimiento del registro**: El registro de modelos debe actualizarse cada vez que se introduce un nuevo modelo o se deprec uno existente.
- **Rigidez de politica**: La politica de optimizacion de costos por defecto puede no ser adecuada para todos los casos de uso, requiriendo overrides explicitos.

### Neutrales
- **Registro como artefacto**: El archivo `model-registry.json` es validado por CI junto con otros artefactos de gobernanza, asegurando que se mantenga actualizado.

## Referencias
- [ADR-0001: Ingenieria de Harness](./0001-harness-engineering.es.md)
- [review-provider.mjs](../../../../../.harness/scripts/ci/agentic/review-provider.mjs)
- [rag-port.mjs](../../../../../.harness/scripts/ci/rag-port.mjs)
- [ADR-0090: Gobernanza de Conocimiento RAG](../core/0090-rag-knowledge-governance.es.md)
- [ADR-0089: Flujos de Trabajo Agentic Event-Driven](../core/0089-event-driven-agentic-workflows.es.md)

---
[Volver al Indice de ADRs](../README.es.md)

> **Firma del Agente:** Agente Arquitecto
