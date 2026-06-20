# Runbook de Soporte para CI Agentico y RAG

> **Navegacion bilingue:** [Version en ingles](./agentic-ci-rag-support.md)

**Clasificacion:** Operaciones e Infraestructura
**Estado:** Activo
**Responsable:** Plataforma y Arquitectura
**Alcance:** Revision agentica Wilson y preparacion del indice RAG en GitHub Actions.

## Proposito

Operar de forma segura la revision Wilson respaldada por Gemini y el pipeline de particionado RAG. Esta guia cubre procedimientos de soporte; no define las reglas arquitectonicas revisadas por Wilson.

## Configuracion Segura de Gemini

Crea una clave de Gemini API en Google AI Studio, restrinjela a Gemini API y guardala solo como secreto Actions del repositorio de GitHub `EVOLITH_LLM_API_KEY`.

El job CI `Wilson Agentic Review` suministra el secreto con `EVOLITH_AGENTIC_REVIEW=true`. El job falla cuando falta el secreto, no se puede contactar Gemini o Wilson reporta una violacion. Nunca coloques la clave en codigo fuente, variables de repositorio, logs, issues o un archivo `.env` versionado. Rota una clave inmediatamente despues de exponerla.

## Triage de Revision

| Senal | Significado | Accion del operador |
|---|---|---|
| Clave ausente | CI no puede autenticarse ante Gemini | Agrega o rota el secreto del repositorio y vuelve a ejecutar el job. |
| Fallo de Gemini API | Fallo de proveedor, cuota o red | Revisa cuota y restricciones de clave en AI Studio; reintenta solo despues de resolver la causa. |
| `VIOLATION_DETECTED` | Wilson encontro un problema de arquitectura gobernada | Tratala como hallazgo bloqueante; corrige codigo o documentacion y vuelve a ejecutar CI. |

## Preparacion del Indice RAG

El job RAG divide documentos de referencia ingleses modificados en limites H2/H3 y luego por un maximo de aproximadamente 512 tokens. Esto mantiene la recuperacion enfocada y evita que catalogos de gaps grandes consuman todo el contexto del agente.

`EVOLITH_RAG_SYNC=true` habilita la rama de sincronizacion real. La implementacion actual prepara y reporta chunks; conectar un proveedor de vector store sigue siendo una tarea de adaptador de infraestructura. No declares documentos indexados hasta que ese adaptador confirme upserts exitosos.

## Lista de Soporte

1. Confirma que el secreto GitHub existe sin intentar imprimir su valor.
2. Revisa el log del job `Wilson Agentic Review` para el resultado real de Gemini.
3. Inspecciona conteos de chunks RAG y advertencias de tamano despues de cambios documentales.
4. Rota claves expuestas y vuelve a ejecutar los workflows afectados.
5. Mantén credenciales de proveedor y configuracion de vector store fuera del corpus de referencia.

## Autoridad Relacionada

- [Politica de Lenguaje de Reglas ADR-0090](../governance/adr/adr-0090-rule-language-policy.es.md)
- [Asistente de Arquitectura IA](../governance/standards/ai-augmented/08-architecture-ai-assistant/README.es.md)
- [Playbook de Auditoria Wilson](../../.harness/playbooks/wilson-audit-playbook.es.md)

---
[Volver a Operaciones](./README.es.md)
