# Harness Playbooks

Workflows reutilizables para agentes y contribuidores que trabajan bajo la gobernanza BMAD-METHOD.

## Playbooks Disponibles

1. [document-governance-playbook.es.md](./document-governance-playbook.es.md)
   - sincronización bilingüe
   - escritura funcional con enfoque de negocio
   - coherencia de stack
   - trazabilidad de diagramas

2. [api-governance-playbook.es.md](./api-governance-playbook.es.md)
   - coexistencia REST y GraphQL
   - normalización de queries
   - contratos de error
   - alineación de persistencia por runtime

3. [modular-monolith-evolution-playbook.es.md](./modular-monolith-evolution-playbook.es.md)
   - propiedad de bounded contexts
   - preparación para extracción
   - ubicación de lógica compartida
   - outbox y fronteras de integración

4. [agents-governance-playbook.es.md](./agents-governance-playbook.es.md)
   - cómo evolucionar `AGENTS.md`
   - cuándo promover lecciones repetidas a reglas
   - cómo los aprendizajes de satélites se vuelven estándares corporativos

## Regla de Uso

Antes de ejecutar tareas repetidas de auditoría, diseño o revisión, carga el playbook más relevante junto con:

- `AGENTS.md`
- `.harness/rules/global-rules.md`
- el perfil de runtime autoritativo o los ADRs del cambio objetivo
