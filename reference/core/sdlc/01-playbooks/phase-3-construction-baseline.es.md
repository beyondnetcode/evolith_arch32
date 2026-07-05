# Fase 3 — Construction Baseline

> **Navegación Bilingüe:** [English Version](./phase-3-construction-baseline.md)

**Fase:** 03 — Construcción
**Gate:** Build Exitoso — Merge de PR Autorizado
**Rol Responsable:** Tech Lead
**Autoridad de Waiver:** Architecture Board (waivers CVE: Aceptación de Riesgo Ejecutiva)

---

## Propósito

Este playbook gobierna el bucle interno de construcción de la Fase 3 — desde la creación de Historias Técnicas hasta el merge de PRs. La Fase 3 es iterativa: cada PR que implementa una Historia Técnica debe satisfacer la Definición de Terminado antes del merge. La fase termina cuando todas las Historias Técnicas trazables a las Historias Funcionales aprobadas están en estado Done y se satisface la compuerta Build Exitoso.

---

## 0. Condiciones Previas

Antes de crear la primera Historia Técnica:

- El gate de Fase 2 (Baseline de Diseño) está APPROVED y archivado.
- `evolith.yaml` declara `metadata.phase` (F1, F2, o F3). Las reglas de topología se aplican automáticamente basándose en esta declaración.
- El Registro ADR de la Fase 2 está bloqueado y accesible.
- Las Historias Funcionales de la Fase 2 están en estado Ready.

---

## 1. Orden de Ejecución Recomendado

| Paso | Actividad | Salida |
|------|-----------|--------|
| 0 | Verificar gate Fase 2 APPROVED; confirmar `evolith.yaml metadata.phase` | Condiciones previas |
| 1 | Descomponer cada Historia Funcional en Historias Técnicas; poblar campo `functionalStoryRef` | Historias Técnicas (To Do) |
| 2 | Implementar → pruebas unitarias → pruebas integración → lint → escaneo de seguridad | Evidencia de implementación |
| 3 | Por PR: ejecutar checklist DoD; verificar CI verde; verificar cobertura ≥ 80% | Checklist DoD, Pipeline CI |
| 4 | Por PR: Documentación Delta — actualizar ADRs si cambió decisión arquitectónica; actualizar docs inline y README | Documentación Delta |
| 5 | Por PR: `evolith validate --topology <declarado>` | Reglas de Topología pasan |
| 6 | (Condicional F3) Verificar DOMA por ADR-0076: cada servicio mapea a exactamente un bounded context | Evidencia DOMA |
| 7 | Revisión gate: todas las Historias Técnicas Done; `evolith gate evaluate --phase construction` | APPROVED / BLOCKED |

---

## 2. Bucle Interno de Construcción (Por PR)

Para cada pull request durante la Fase 3:

1. **Selección de historia.** Tomar una Historia Técnica del backlog en orden de prioridad. Confirmar que tiene `functionalStoryRef` vinculando a una Historia Funcional de Fase 2.
2. **Implementación.** Escribir código siguiendo los límites de ADR-0002 (Arquitectura Hexagonal), ADR-0056 (Convenciones de Naming), y el Construction-Focused SDLC Framework.
3. **Testing.** Escribir pruebas unitarias (objetivo ≥ 80% cobertura de lógica de negocio por ADR-0018), pruebas de integración donde interactúan módulos, y actualizar el reporte de tests.
4. **Compuertas de calidad.** Ejecutar el pipeline CI completo: lint, type-check, unit tests, integration tests, SAST/SCA scan (ADR-0005). Todo debe estar verde.
5. **Delta de documentación.** Si el PR introduce o cambia una decisión arquitectónica, crear o actualizar un ADR. Actualizar docs inline y README si cambiaron interfaces públicas.
6. **Validación de topología.** Ejecutar `evolith validate --topology <declarado>` para verificar que las reglas de topología siguen pasando.
7. **Revisión PR.** Al menos una revisión de par. El revisor confirma cumplimiento de DoD, trazabilidad ADR, y ausencia de violaciones de límites.
8. **Merge.** Después de aprobación y CI verde, hacer merge del PR. El estado de la Historia Técnica transiciona a Done.

---

## 3. Checklist de Definición de Terminado

Cada PR debe satisfacer todos los ítems antes del merge:

- [ ] Todas las pruebas unitarias pasan (cobertura ≥ 80% en lógica de negocio)
- [ ] Todas las pruebas de integración pasan
- [ ] Pipeline CI verde (lint, type-check, test, security scan)
- [ ] Sin CVEs High o Critical en dependency scan
- [ ] ADR actualizado si se introdujo o cambió decisión arquitectónica
- [ ] Delta de documentación completo (docs inline, README si cambió API pública)
- [ ] `evolith validate --topology <declarado>` pasa
- [ ] Revisión de par aprobada
- [ ] Historia Técnica `functionalStoryRef` vincula a una Historia Funcional válida

---

## 4. Criterios de Bloqueo

| Criterio | Acción |
|----------|--------|
| Cobertura por debajo de 80% en lógica de negocio | BLOCK — agregar pruebas antes del merge |
| CVE High o Critical detectado | BLOCK — actualizar o reemplazar dependencia |
| ADR faltante para decisión arquitectónica | BLOCK — crear ADR antes del merge |
| Validación de topología falla | BLOCK — resolver violación antes del merge |
| Violación DOMA (solo F3) | BLOCK — resolver por ADR-0076 |

---

## 5. Salidas

- Todas las Historias Técnicas en estado Done con trazabilidad `functionalStoryRef`.
- Registro ADR actualizado con todas las decisiones de la fase de construcción.
- Test Summary Report reflejando cobertura final y distribución de tests.
- Delta de documentación completo.
- Evidencia de gate para `evolith gate evaluate --phase construction`.

---

## 6. Handoff hacia Gate F4

Después de gate PASS, lo siguiente debe estar listo para Fase 4 (Validación):

| Artefacto | Fuente | Condición |
|-----------|--------|-----------|
| Test Summary Report | Resultados de tests de construcción | Nivel 1+ |
| Registro ADR (snapshot) | Todos los ADRs creados/actualizados durante construcción | Nivel 1+ |
| Reporte de cobertura | Salida del pipeline CI | Nivel 1+ |

---

[Volver a la Centro de Gobernanza SDLC](../README.es.md)
