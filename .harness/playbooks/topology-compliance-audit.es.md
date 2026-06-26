# Playbook de Auditoría de Cumplimiento por Topología

**Autor:** Winston (Auditor Principal)
**Disparador:** `node .harness/playbooks/topology-compliance-audit.mjs` o prompt manual
**Alcance:** Evaluar completitud de cada Bounded Context topológico contra el
          ejemplar canónico (Agentic/AI-First) y las reglas de gobernanza.

## Lista de Verificación por Topología

### Artefactos Requeridos (canónicos — del ejemplar Agentic/AI-First)

| # | Artefacto | Tipo | Criticidad |
|---|-----------|------|------------|
| 1 | `README.md` + `.es.md` | Documentación | MUST |
| 2 | `adoption.md` + `.es.md` | Documentación | MUST |
| 3 | `evidence.md` + `.es.md` | Documentación | MUST |
| 4 | `evolution.md` + `.es.md` | Documentación | MUST |
| 5 | `maturity.md` + `.es.md` | Documentación | MUST |
| 6 | `operations.md` + `.es.md` | Documentación | MUST |
| 7 | `patterns.md` + `.es.md` | Documentación | MUST |
| 8 | `resilience.md` + `.es.md` | Documentación | MUST |
| 9 | `runbooks.md` + `.es.md` | Documentación | MUST |
| 10 | `security.md` + `.es.md` | Documentación | MUST |
| 11 | `<topologia>.rego` | Política OPA | MUST |
| 12 | `<topologia>.test.rego` | Test OPA | MUST |
| 13 | `<topologia>.rules.json` | Ruleset | MUST |
| 14 | `<topologia>.wasm` | WASM compilado | MUST |
| 15 | `topology.manifest.json` | Manifiesto | MUST |
| 16 | `topology.config.schema.json` o schema personalizado | Schema de Config | MUST |
| 17 | `fixtures/valid.*.json` | Fixture de validación | MUST |
| 18 | `fixtures/invalid.*.json` | Fixture de validación | MUST |
| 19 | `parity-fixtures/compliant.json` | Fixture de paridad OPA | MUST |
| 20 | `parity-fixtures/violation.json` | Fixture de paridad OPA | MUST |

### Requisitos Transversales (no por topología)

- [ ] Hook de paridad bilingüe activo (CI valida que cada `.md` tenga `.es.md`)
- [ ] Sin datos de negocio (ROI, presupuesto, costo) en artefactos de topología
- [ ] Specs OpenAPI para la superficie REST de cada topología
- [ ] Manifiestos MCP para cada topología
- [ ] Flujos CLI para cada topología
- [ ] Las referencias del ruleset de gobernanza resuelven a archivos reales

## Formato de Salida

1. Árbol de `reference/architecture/topologies/`
2. Tabla de cumplimiento por topología con rutas de evidencia
3. Estado del ruleset transversal
4. Resultados de validación del ejemplar (Agentic/AI-First)
5. Lista priorizada de brechas
6. Registro de violaciones (datos de negocio, paridad, referencias rotas)

## Restricciones

- Los artefactos de Fase 1 NO DEBEN contener datos de negocio (ROI, presupuesto, costo).
  Únicos componentes de capa de negocio autorizados: ACL de Evolith Tracker, Funnel 0.
- Cada artefacto DEBE tener su par EN/ES.
- Cada topología debe ser un Bounded Context completo.
- Tres interfaces operativas obligatorias: CLI, MCP, Service CORE API.
