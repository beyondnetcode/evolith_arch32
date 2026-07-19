# Checklist de Madurez de Adaptadores

> **Propietario:** @winston  
> **Versión:** 1.0.0  
> **Propósito:** Checklist estándar para evaluar la preparación de adaptadores de interacción antes de marcarlos como operacionales.

## Items del Checklist

### Implementación (30%)

- [ ] Archivo del adaptador existe en `src/packages/agent-runtime/src/adapters/interaction/`
- [ ] Implementa la interfaz `InteractionAdapterPort<TInput>`
- [ ] Declara la constante `sourceInterface` correcta
- [ ] `toRuntimeRequest()` mapea todos los campos de entrada a `AgentRuntimeRequest`
- [ ] Maneja casos edge (intent vacío, campos de contexto faltantes)
- [ ] Establece valores por defecto apropiados (ej. `dry_run`)

### Tests (20%)

- [ ] Archivo spec existe junto a la implementación
- [ ] Tests cubren happy path (entrada válida → request correcto)
- [ ] Tests cubren casos edge (entrada vacía, campos faltantes)
- [ ] Tests verifican que `sourceInterface` se establece correctamente
- [ ] Todos los tests pasan

### Integración (15%)

- [ ] Exportado desde `src/packages/agent-runtime/src/adapters/index.ts`
- [ ] Registrado en el barrel con export de tipo correcto
- [ ] Puede ser instanciado y usado en un harness de test

### Manifiesto (15%)

- [ ] Listado en `.bmad-core/skills/manifest.json` (si el adaptador tiene significancia de gobernanza)
- [ ] Referenciado por al menos una definición de agente en `.bmad-core/agents/`
- [ ] Tiene un checklist respaldante (este documento o equivalente)

### Referencia de Agente (10%)

- [ ] La definición de agente de Winston menciona el `sourceInterface` del adaptador
- [ ] La definición de agente de Architect hace cross-reference si aplica
- [ ] El adaptador aparece en playbooks de auditoría relevantes

### Documentación (10%)

- [ ] README o docstring explica el propósito del adaptador
- [ ] La interfaz de entrada (`TInput`) está documentada
- [ ] Ejemplos de uso proporcionados
- [ ] Contraparte ES existe si es facing al usuario

## Puntuación

| Items Aprobados | Estado |
|----------------|--------|
| Todas las 6 categorías | **Operacional** |
| 5 categorías | **Casi completo** |
| 3-4 categorías | **Parcial** |
| 1-2 categorías | **Phantom** |
| 0 categorías | **Faltante** |

## Uso

Al evaluar un adaptador:

1. Ejecutar `node .bmad-core/skills/adapter-maturity-analysis.mjs` para scoring automatizado
2. Revisar este checklist manualmente para matices
3. Actualizar el estado del adaptador en gap tracking si la madurez cambia
4. Si es phantom: crear entrada GT-* para materializar la declaración
