# Runbook de Soporte para CI Agentico y RAG

> **Navegacion bilingue:** [Version en ingles](./agentic-ci-rag-support.md)

**Clasificacion:** Operaciones e Infraestructura
**Estado:** Activo
**Responsable:** Plataforma y Arquitectura
**Alcance:** Revision agentica Winston y preparacion del indice RAG en GitHub Actions.

## Proposito

Operar de forma segura la revision Winston respaldada por Gemini y el pipeline de particionado RAG. Esta guia cubre procedimientos de soporte; no define las reglas arquitectonicas revisadas por Winston.

## Configuracion Segura de Gemini

Crea una clave de Gemini API en Google AI Studio, restrinjela a Gemini API y guardala solo como secreto Actions del repositorio de GitHub `EVOLITH_LLM_API_KEY`.

El job CI `Winston Agentic Review` suministra el secreto con `EVOLITH_AGENTIC_REVIEW=true`. El job falla cuando falta el secreto, no se puede contactar Gemini o Winston reporta una violacion. Nunca coloques la clave en codigo fuente, variables de repositorio, logs, issues o un archivo `.env` versionado. Rota una clave inmediatamente despues de exponerla.

## Triage de Revision

| Senal | Significado | Accion del operador |
|---|---|---|
| Clave ausente | CI no puede autenticarse ante Gemini | Agrega o rota el secreto del repositorio y vuelve a ejecutar el job. |
| Fallo de Gemini API | Fallo de proveedor, cuota o red | Revisa cuota y restricciones de clave en AI Studio; reintenta solo despues de resolver la causa. |
| `VIOLATION_DETECTED` | Winston encontro un problema de arquitectura gobernada | Tratala como hallazgo bloqueante; corrige codigo o documentacion y vuelve a ejecutar CI. |

## Preparacion del Indice RAG

El job RAG divide documentos de referencia ingleses modificados en limites H2/H3 y luego por un maximo de aproximadamente 512 tokens. Esto mantiene la recuperacion enfocada y evita que catalogos de gaps grandes consuman todo el contexto del agente.

`EVOLITH_RAG_SYNC=true` habilita la rama de sincronizacion real, que embebe y hace upsert de chunks a traves del adaptador durable configurado y emite un recibo. El dry-run usa el adaptador en memoria veraz y no durable.

## Operaciones de Sincronizacion de Vectores RAG (GT-145)

`14-rag-index-sync.mjs` ejecuta una delta-sync neutral al proveedor a traves del puerto de adaptadores `rag-port.mjs`.

- **Seleccion de proveedor:** define `EVOLITH_RAG_PROVIDER` con un adaptador durable registrado; sin definir (o `memory`) es un sustituto de dry-run no durable. Una corrida real (`EVOLITH_RAG_SYNC=true`) sin adaptador durable falla cerrado: nunca declara documentos indexados.
- **Credenciales de minimo privilegio:** pasa las credenciales de vector store y embedding solo como secretos de CI enmascarados al job de sync; nunca las pongas en el diff ni en los logs. El job no necesita permisos de escritura sobre el repositorio.
- **Batch y retry acotados:** los chunks se embeben y upsertan en lotes de tamano fijo; cualquier error de adaptador, embedding o persistencia falla el paso cerrado en vez de reportar exito parcial. Configura retry y backoff dentro del adaptador durable, acotados por un tope de intentos.
- **Telemetria de costo y tokens:** cada corrida emite una linea machine-readable `RECEIPT {…}` (y un archivo `EVOLITH_RAG_RECEIPT_PATH` si se define) con `counts` y `telemetry` agregados y no sensibles (`embedCalls`, `estTokens`). No se registran texto de chunks ni credenciales.

## Lista de Soporte

1. Confirma que el secreto GitHub existe sin intentar imprimir su valor.
2. Revisa el log del job `Winston Agentic Review` para el resultado real de Gemini.
3. Inspecciona conteos de chunks RAG y advertencias de tamano despues de cambios documentales.
4. Rota claves expuestas y vuelve a ejecutar los workflows afectados.
5. Mantén credenciales de proveedor y configuracion de vector store fuera del corpus de referencia.

## Autoridad Relacionada

- [Politica de Lenguaje de Reglas ADR-0090](../../reference/core/sdlc/governance/adr-0090-rule-language-policy.es.md)
- [Asistente de Arquitectura IA](../../reference/core/foundations/common-rules/ai-augmented/08-architecture-ai-assistant/README.es.md)
- [Playbook de Auditoria Winston](../../.harness/playbooks/winston-audit-playbook.es.md)

---
[Volver a Operaciones](./README.es.md)
