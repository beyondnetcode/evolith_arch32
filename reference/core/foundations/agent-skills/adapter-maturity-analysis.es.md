# Análisis de Madurez de Adaptadores

> **Propietario:** @winston  
> **Versión:** 1.0.0  
> **Tags:** adaptador, madurez, interaction-adapter, runtime, auditoría

## Propósito

Evalúa la madurez de todos los adaptadores de interacción contra el contrato `InteractionAdapterPort` y el pipeline de gobernanza del Agent Runtime. Produce un reporte estructurado de gaps, declaraciones phantom y estado de readiness.

## Cuándo Usar

- Después de cualquier ola de auditoría que toque agent runtime, MCP, CLI o adaptadores Hermes
- Cuando se añade una nueva implementación de `InteractionAdapterPort`
- Durante el cierre de gaps para verificar claims de madurez de adaptadores

## Entradas

| Entrada | Fuente |
|---------|--------|
| Implementaciones de adaptadores | `src/packages/agent-runtime/src/adapters/interaction/` |
| Contrato de puerto | `src/packages/agent-runtime/src/domain/ports/interaction-adapter.port.ts` |
| Definiciones de agentes | `.bmad-core/agents/*.md` |
| Manifiesto de skills | `.bmad-core/skills/manifest.json` |

## Salidas

| Salida | Formato |
|--------|---------|
| Reporte de madurez de adaptadores | JSON con score de readiness por adaptador |
| Lista de declaraciones phantom | Lista de capacidades declaradas pero no implementadas |
| Recomendaciones de gaps | Candidatos a GT-* para adaptadores no implementados |

## Criterios de Evaluación

Cada adaptador se puntúa en:

| Criterio | Peso | Descripción |
|----------|------|-------------|
| Implementación existe | 30% | Archivo existe en `adapters/interaction/` |
| Tests existen | 20% | Archivo spec con tests pasando |
| Exportado del barrel | 15% | Listado en `adapters/index.ts` |
| Registrado en manifiesto | 15% | Entrada de skill/checklist en `.bmad-core/skills/manifest.json` |
| Definición de agente referencia | 10% | Persona del agente menciona el adaptador |
| Documentación existe | 10% | README o checklist respaldando la declaración |

## Puntuación

| Puntuación | Estado |
|------------|--------|
| 100% | **Operacional** — completamente implementado y testeado |
| 75-99% | **Casi completo** — gaps menores en docs o manifiesto |
| 50-74% | **Parcial** — implementación existe pero faltan tests/docs |
| 25-49% | **Phantom** — declarado pero no materializado |
| 0-24% | **Faltante** — sin rastro de implementación |

## Ejecución

```bash
# Análisis completo
node .bmad-core/skills/adapter-maturity-analysis.mjs

# Solo salida JSON
node .bmad-core/skills/adapter-maturity-analysis.mjs --json

# Verificar adaptador específico
node .bmad-core/skills/adapter-maturity-analysis.mjs --adapter mcp
```
