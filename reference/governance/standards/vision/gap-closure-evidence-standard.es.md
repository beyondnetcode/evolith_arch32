# Estándar de Evidencia para Cierre de Gaps

> **Navegación Bilingüe:** [English Version](./gap-closure-evidence-standard.md)

**Estado:** Activo  
**Responsable:** Evolith Architecture Board  
**Registro Machine-Readable:** [`gap-closure-evidence.json`](./gap-closure-evidence.json)

## 1. Propósito

Este estándar convierte un gap completado en una afirmación de gobernanza respaldada por evidencia. Una fila consistente en el tablero es necesaria, pero no suficiente: el cierre debe poder reproducirse desde el historial del repositorio y artefactos resolubles.

## 2. Registro de Cierre Requerido

Cada gap marcado `COMPLETADO` debe tener exactamente una entrada en el registro canónico con:

| Campo | Requisito |
|---|---|
| `id` | Identificador `GT-nn` existente en el tablero y catálogo |
| `closedAt` | Fecha ISO que no esté en el futuro |
| `closureCommit` | Commit Git existente que contiene o establece el cierre |
| `evidence` | Uno o más archivos relativos al repositorio que demuestran el resultado |
| `validationCommands` | Uno o más comandos reproducibles usados para validar el resultado |
| `dependencyDisposition` | `none`, `satisfied`, `accepted-scope` o `deferred` |
| `dependencyRationale` | Obligatorio cuando la disposición no es `none` |

Los artefactos de gobernanza machine-readable usan inglés como idioma canónico según [ADR-0090](../../adr/adr-0090-rule-language-policy.es.md).

## 3. Enforcement Semántico

`node .harness/scripts/validate-tracking.mjs` falla cuando:

1. un gap completado no tiene registro de cierre;
2. un registro apunta a un gap, commit o archivo de evidencia inexistente;
3. una sección completada del catálogo contiene un criterio `- [ ]` sin marcar;
4. la metadata de cierre está incompleta, duplicada, fechada en el futuro o usa una disposición de dependencia no soportada;
5. los tableros inglés y español difieren en orden de IDs o estado semántico.

Los gaps pendientes, en progreso y diferidos no deben tener registros de cierre activos. La justificación histórica permanece en el catálogo.

## 4. Workflow de Cierre

1. Completar y validar el trabajo dentro del alcance.
2. Crear el commit de implementación o evidencia documental.
3. Añadir el registro de cierre usando ese commit real.
4. Resolver cada checkbox en ambos idiomas del catálogo.
5. Cambiar el estado del tablero a `DONE` / `COMPLETADO`.
6. Ejecutar validación de tracking, documentación y paridad bilingüe.

No se pueden usar commits placeholder, evidencia especulativa ni checkboxes dispensados para satisfacer el cierre.

---
[Volver al Tracking de Gaps](./gap-tracking.es.md)
