# Fase 1.1 — Gate de Knowledge-First Discovery / KDD Readiness

> **Navegación Bilingüe:** [English Version](./phase-1.1-knowledge-first-discovery.md)

**Fase:** 01 — Concepción y Descubrimiento
**Subfase:** 01.1 — Knowledge-First Discovery / KDD Readiness
**Tipo de Gate:** Opcional, progresivo
**Rol Responsable:** Business Discovery Agent / Product Owner
**Autoridad de Waiver:** Sponsor Ejecutivo

---

## Propósito

Este playbook operacionaliza el gate de Knowledge-First Discovery dentro de la Fase 01. Valida que se ha capturado el conocimiento mínimo suficiente antes de crear cualquier épica, historia o ítem de backlog. El gate es opcional y escala desde ligero (Nivel 1) hasta enterprise-regulado (Nivel 4).

---

## Cuándo Aplicar

| Escenario | Nivel Recomendado |
|-----------|------------------|
| Corrección pequeña o cambio trivial | Nivel 0 (omitir) |
| Dominio bien entendido, equipo experimentado | Nivel 1 (Ligero) |
| Producto nuevo o feature significativa | Nivel 2 (Estándar) |
| Modernización de legacy o integración compleja | Nivel 3 (Gobernado) |
| Industria regulada (finanzas, salud, gobierno) | Nivel 4 (Enterprise) |
| Onboarding de repositorio satélite | Nivel 2-3 |

---

## Procedimiento del Gate

### Paso 1: Determinar Nivel de Adopción

Evaluar la iniciativa contra estos criterios:

| Factor | Nivel 0-1 | Nivel 2 | Nivel 3 | Nivel 4 |
|--------|-----------|---------|---------|---------|
| Familiaridad con el dominio | Conocido | Parcialmente conocido | Nuevo | Regulado |
| Tamaño del equipo | 1-3 | 4-8 | 8+ | Cualquier + cumplimiento |
| Riesgo del cambio | Bajo | Medio | Alto | Crítico |
| Requisitos regulatorios | Ninguno | Ninguno | Algunos | Obligatorios |
| Involucramiento de agentes IA | Ninguno | Posible | Probable | Requerido |

### Paso 2: Producir Artefactos Requeridos

**Nivel 1 — Ligero:**
1. Discovery Knowledge Brief (problema, valor, actores, contexto)
2. Log de Supuestos y Preguntas (ítems abiertos)
3. Discovery Context Pack (exportable para agentes)

**Nivel 2 — Estándar (agrega):**
4. Mapa de Capacidades (capacidades del dominio)
5. Matriz de Candidatos a Épica (trazabilidad capacidad → épica)
6. Banco de Semillas de Historia (semillas mínimas de historia)

**Nivel 3 — Gobernado (agrega):**
7. Gate de Preparación de Discovery (validación formal)

**Nivel 4 — Enterprise (agrega):**
8. Validación de ruleset OPA
9. Generación de evidencia CLI/MCP
10. Registro de auditoría

### Paso 3: Validar Contra Checklist de Calidad

- [ ] La declaración del problema es explícita y verificable
- [ ] La propuesta de valor está articulada
- [ ] Los stakeholders / actores están identificados
- [ ] Las capacidades están descritas a nivel de dominio
- [ ] Cada candidato a épica deriva de una capacidad
- [ ] Cada semilla de historia deriva de un candidato a épica
- [ ] Los supuestos son visibles y etiquetados (validados / no validados)
- [ ] Las preguntas abiertas tienen owners y fechas objetivo
- [ ] Las restricciones técnicas están identificadas
- [ ] Los riesgos tienen owners o estrategia de mitigación
- [ ] Los candidatos a ADR, spikes o enablers están marcados
- [ ] Existe Discovery Context Pack (Nivel 1+)
- [ ] El nivel de adopción es apropiado para el tipo de iniciativa
- [ ] La cadena de trazabilidad está completa (trigger → brief → capability → epic → story)

### Paso 4: Decisión del Gate

| Resultado | Acción |
|-----------|--------|
| **PASS** | Proceder a Mapa de Capacidades / Matriz de Candidatos a Épica / Estimación Ballpark |
| **CONDITIONAL** | Proceder con waivers documentados para gaps específicos |
| **FAIL** | Regresar a captura de conocimiento; re-ejecutar gate después de cerrar gaps |

---

## Handoff

Después de gate PASS:

```
Discovery Knowledge Brief ──→ Mapa de Capacidades ──→ Matriz de Candidatos a Épica
                                                              │
Log de Supuestos y Preguntas ────────────────────────────────┤
                                                              │
Banco de Semillas de Historia ──→ Estimación Ballpark ──→ Agile Backlog
                                                              │
Discovery Context Pack ──→ Diseño / Arquitectura ──→ Construcción
```

---

## Checklist de Calidad

- [ ] Todos los artefactos requeridos para el nivel elegido existen
- [ ] Los IDs de trazabilidad están asignados y vinculados
- [ ] Ningún supuesto bloqueante queda sin validar (Nivel 3+)
- [ ] El conocimiento es suficiente para la siguiente fase (Ballpark o Backlog)
- [ ] El Discovery Context Pack está actualizado y es exportable

---

## Referencias

- [Plantilla Discovery Knowledge Brief](../04-artifact-templates/discovery-knowledge-brief-template.es.md)
- [Plantilla Mapa de Capacidades](../04-artifact-templates/capability-map-template.es.md)
- [Plantilla Matriz de Candidatos a Épica](../04-artifact-templates/epic-candidate-matrix-template.es.md)
- [Plantilla Gate de Preparación de Discovery](../04-artifact-templates/discovery-readiness-gate-template.es.md)
- [Principios KDD](https://github.com/Kaddo-kdd/kaddo) — referencia externa, no es una dependencia
