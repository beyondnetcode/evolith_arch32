> **Navegacion Bilingue:** [English Version](./0001-harness-engineering.md)

# ADR-0001: Ingenieria de Harness para Desarrollo Augmentado por IA

## Status
Aceptado

## Date
2026-06-23

## Contexto y Problema
A medida que Evolith integra agentes de IA en su pipeline CI/CD y flujos de desarrollo, la capa de harness que orquesta estos agentes se convierte en una preocupacion arquitectonica de primera clase. El harness es el limite entre la intencion humana y la ejecucion de maquina. Sin una disciplina de ingenieria explicita, los scripts de harness acumulan deriva: filtrado de secretos en prompts de LLM, presupuestos de tokens sin limites, fallos silenciosos en invocaciones de agentes, y contratos de salida inconsistentes entre scripts.

El harness actual bajo `.harness/scripts/ci/` contiene mas de 22 scripts numerados que forman el pipeline de gates CI. Varios de estos scripts invocan proveedores LLM externos (Gemini, OpenAI) o evaluan bundles OPA WASM, pero carecen de un contrato unificado para sanitizacion de entradas, telemetria de costos, clasificacion de errores y validacion de resultados.

Incidentes historicos que motivaron este ADR incluyen: (1) `13-agentic-code-review.mjs` enviando el diff git completo sin redaccion a Gemini, exponiendo posibles secretos; (2) `14-rag-index-sync.mjs` declarando estado live mientras sus llamadas al almacén vectorial estaban como TODOs comentados; (3) codigos de salida inconsistentes entre scripts haciendo imposible para `ci-runner.mjs` distinguir un fallo de validacion de un error de infraestructura.

## Decision
Establecemos la **Ingenieria de Harness** como una disciplina de ingenieria distinta dentro de Evolith con cuatro pilares:

### 1. Contrato de Sanitizacion de Entradas
Todo script que envie datos a un proveedor LLM o de embeddings externo DEBE enrutar a traves de `review-input.mjs` o `rag-sync.mjs`, que aplican:
- Redaccion de secretos via patrones regex (claves API, tokens, cadenas de conexion)
- Aplicacion de limites de bytes y tokens con topes duros
- Seleccion de archivos relevantes por politica para minimizar ruido de contexto
- Chunking determinista en boundaries H2 para ingestion RAG

### 2. Patron Puerto de Proveedor
Las dependencias de servicios externos (LLMs, APIs de embeddings, almacenes vectoriales) DEBEN accederse a traves de un puerto de proveedor (`review-provider.mjs`, `rag-port.mjs`). Las importaciones directas de SDK de proveedores dentro de scripts CI numerados estan prohibidas. Los puertos exponen un mecanismo `registerAdapter` para que el cambio de proveedor requiera cero cambios en la logica de orquestacion. El patron de puerto incluye:
- Un adaptador `memory` por defecto para modo local
- Comportamiento de fallo cerrado cuando un adaptador solicitado no esta registrado
- Cheques de salud del adaptador antes de operaciones por lotes

### 3. Gate de Validacion de Resultados
Todas las salidas estructuradas de proveedores de IA DEBEN validarse contra un esquema versionado antes de actuar sobre ellas. El patron establecido por `review-result.mjs` (version de esquema `1.0`, fallo cerrado ante resultados malformados o indeterminados) es el enfoque canonico. La validacion debe ocurrir antes de cualquier efecto secundario (commit, upsert, notificacion).

### 4. Contrato de Codigo de Salida
Todos los scripts de harness DEBEN seguir:
- Salida `0` en exito
- Salida `1` en fallo de validacion o error de proveedor
- Salida `2` en argumentos invalidos
- Recibos JSON estructurados a stdout para consumo de maquina
- No se permiten codigos de salida distintos de 0, 1 o 2

## Consecuencias

### Positivas
- **Reproducibilidad**: Cada gate asistido por IA puede re-ejecutarse con entradas deterministas.
- **Control de costos**: Los presupuestos de tokens se aplican a nivel de harness, no por proveedor.
- **Independencia del proveedor**: Cambiar de Gemini a otro LLM requiere solo un nuevo adaptador, no una reescritura de la logica de orquestacion.
- **Auditabilidad**: Los recibos estructurados permiten deteccion de deriva y analisis posterior.
- **Seguridad de fallo cerrado**: La salida malformada de IA nunca se propaga como un exito silencioso.

### Negativas
- **Sobrecarga de boilerplate**: Los nuevos scripts deben conectarse a puertos y esquemas antes de poder invocar servicios externos.
- **Mantenimiento de esquemas**: Los esquemas de resultados versionados requieren gobernanza continua a medida que los proveedores de IA cambian sus formatos de salida.
- **Disciplina de registro de puertos**: Cada nuevo proveedor requiere una implementacion de adaptador de puerto y registro, agregando un paso de desarrollo.

### Neutrales
- **Esfuerzo de migracion**: Los scripts existentes que eluden puertos (ej., llamadas directas a Gemini) deben refactorizarse para usar el patron de puerto. Este es un costo unico rastreado por Gap GT-235.

## Referencias
- [ADR-0002: Protocolo de Integracion MCP](./0002-mcp-integration-protocol.es.md)
- [ADR-0003: Gobernanza de Seleccion de Modelo](./0003-model-selection-governance.es.md)
- [Gap GT-147: Auditoria de Deriva Operacional](../../../sdlc/standards/vision/gap-reference-catalog.es.md)
- [review-provider.mjs](../../../../.harness/scripts/ci/agentic/review-provider.mjs)
- [review-input.mjs](../../../../.harness/scripts/ci/agentic/review-input.mjs)
- [review-result.mjs](../../../../.harness/scripts/ci/agentic/review-result.mjs)
- [rag-port.mjs](../../../../.harness/scripts/ci/rag-port.mjs)

---
[Volver al Indice de ADRs](../README.es.md)

> **Firma del Agente:** Agente Arquitecto
