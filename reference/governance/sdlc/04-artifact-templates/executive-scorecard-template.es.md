# Plantilla: Scorecard Ejecutivo SDLC

> **Navegación bilingüe:** [English Version](./executive-scorecard-template.md)
> **Fase:** Transversal / Gobernanza de Release
> **Relevancia de gate:** Baseline de Diseño, Build Exitoso, RC Sellado, Producción Activa
> **Padre:** [Hub de Plantillas de Artefactos](./README.es.md)

---

## Acerca de Esta Plantilla

El Scorecard Ejecutivo SDLC es el panel de control de liderazgo de una página para una iniciativa, producto o release basado en Evolith.

No reemplaza PRDs, ADRs, Historias Funcionales, Historias Técnicas, Test Summary Reports, Release Notes, workbooks RACI ni Gates de Calidad. Resume su estado para que Directores de Tecnología y líderes senior puedan decidir cuándo avanzar, cuándo bloquear y dónde intervenir.

---

## Cuándo Este Artefacto Es Requerido

Este artefacto es **requerido** cuando la iniciativa tiene al menos una de las siguientes condiciones:

- Visibilidad ejecutiva.
- Riesgo de release hacia cliente.
- Impacto productivo.
- Dependencias entre equipos o cross-functional.
- Exposición regulatoria, auditoría, seguridad o cumplimiento.
- Impacto de multi-tenancy o identidad/access-management.
- Decisión formal go/no-go antes de Producción Activa.

Para MVPs internos pequeños con bajo riesgo productivo, puede ser opcional, pero sigue siendo recomendado como checkpoint ligero de liderazgo.

---

## Cómo Leer el Scorecard

El scorecard se organiza alrededor de seis preguntas ejecutivas:

| Pregunta | Sección del scorecard |
|---|---|
| Qué estamos liberando y quién lo gobierna? | Identidad del Release |
| Qué fases SDLC aplican y qué gate está activo? | Readiness por Fase |
| Tenemos la evidencia requerida? | Readiness de Artefactos |
| Las personas correctas están asignadas? | Readiness RACI |
| Los gates de calidad están aprobando? | Gates de Calidad |
| Qué decisiones o escalamiento se requieren? | Riesgos, Decisiones y Decisión Ejecutiva |

---

## Sección 1 — Plantilla en Blanco

### Fuente — Copiar y pegar

```markdown
# Scorecard Ejecutivo SDLC — [Producto / Iniciativa] [Release]

> Estado Global: [En Curso | Observación | En Riesgo | Bloqueado | Listo]
> Readiness SDLC: [X%]
> Fase Actual: [Concepción | Diseño | Construcción | Validación | Entrega]
> Gate Actual: [Aprobación de Negocio | Baseline de Diseño | Build Exitoso | RC Sellado | Producción Activa]
> Go-Live Objetivo: [YYYY-MM-DD]
> Sponsor Ejecutivo: [Nombre]
> Director de Tecnología: [Nombre]
> Delivery Owner: [Nombre]
> Última Actualización: [YYYY-MM-DD]

---

## 1. Identidad del Release

| Campo | Valor |
|---|---|
| Producto / Iniciativa | [Nombre] |
| Release / Versión | [vX.Y.Z] |
| Cliente / Unidad de Negocio | [Nombre] |
| Objetivo de Negocio | [Objetivo corto] |
| Fase SDLC Actual | [Fase] |
| Gate Actual | [Gate] |
| Go-Live Objetivo | [Fecha] |
| Variación de Cronograma | [+/- N días] |
| Decisión Requerida | [Avanzar | Avance Condicional | Bloquear | Escalar] |

---

## 2. Readiness por Fase

| Fase | Aplicabilidad | Gate | Estado | Evidencia | Accountable | Decisión |
|---|---|---|---|---|---|---|
| Concepción | [Aplica / Adaptada / Diferida / N/A] | Aprobación de Negocio | [Hecho / Observación / En Riesgo / Bloqueado] | [Link PRD] | [Nombre] | [Aprobado / Pendiente / Bloqueado] |
| Diseño | [Aplica / Adaptada / Diferida / N/A] | Baseline de Diseño | [Estado] | [Links ADR / HF] | [Nombre] | [Decisión] |
| Construcción | [Aplica / Adaptada / Diferida / N/A] | Build Exitoso | [Estado] | [Links CI / HT] | [Nombre] | [Decisión] |
| Validación | [Aplica / Adaptada / Diferida / N/A] | RC Sellado | [Estado] | [Link TSR] | [Nombre] | [Decisión] |
| Entrega | [Aplica / Adaptada / Diferida / N/A] | Producción Activa | [Estado] | [Links Release Notes / observabilidad] | [Nombre] | [Decisión] |

---

## 3. Readiness de Artefactos

| Artefacto | Requerido / Opcional / Condicional | Estado | Owner | Link de Evidencia | Brecha | Fecha Límite |
|---|---|---|---|---|---|---|
| PRD | Requerido | [Estado] | [Nombre] | [Link] | [Brecha o N/A] | [Fecha] |
| ADRs | Condicional / Requerido | [Estado] | [Nombre] | [Link] | [Brecha o N/A] | [Fecha] |
| Historias Funcionales | Requerido | [Estado] | [Nombre] | [Link] | [Brecha o N/A] | [Fecha] |
| Historias Técnicas | Requerido | [Estado] | [Nombre] | [Link] | [Brecha o N/A] | [Fecha] |
| Evidencia CI | Requerido | [Estado] | [Nombre] | [Link] | [Brecha o N/A] | [Fecha] |
| Test Summary Report | Requerido antes de RC Sellado | [Estado] | [Nombre] | [Link] | [Brecha o N/A] | [Fecha] |
| Release Notes | Requerido antes de Producción Activa | [Estado] | [Nombre] | [Link] | [Brecha o N/A] | [Fecha] |
| Plan de Rollback | Requerido antes de Producción Activa | [Estado] | [Nombre] | [Link] | [Brecha o N/A] | [Fecha] |
| Checklist de Observabilidad | Requerido antes de Producción Activa | [Estado] | [Nombre] | [Link] | [Brecha o N/A] | [Fecha] |

---

## 4. Readiness RACI

| Fase | Accountable | Responsible | Consulted | Informed | Brecha de empleado nominal | Estado |
|---|---|---|---|---|---|---|
| Concepción | [Nombre] | [Nombre/equipo] | [Nombres] | [Nombres] | [Brecha o N/A] | [Asignado / Parcial / Faltante] |
| Diseño | [Nombre] | [Nombre/equipo] | [Nombres] | [Nombres] | [Brecha o N/A] | [Estado] |
| Construcción | [Nombre] | [Nombre/equipo] | [Nombres] | [Nombres] | [Brecha o N/A] | [Estado] |
| Validación | [Nombre] | [Nombre/equipo] | [Nombres] | [Nombres] | [Brecha o N/A] | [Estado] |
| Entrega | [Nombre] | [Nombre/equipo] | [Nombres] | [Nombres] | [Brecha o N/A] | [Estado] |

---

## 5. Gates de Calidad

| Métrica | Umbral | Actual | Estado | Link de Evidencia | Owner | Decisión Requerida |
|---|---:|---:|---|---|---|---|
| Cobertura de lógica de negocio | >= 80% | [X%] | [Pass / Observación / Fail] | [Link] | [Nombre] | [Sí/No] |
| Complejidad ciclomática | <= 15 | [N] | [Estado] | [Link] | [Nombre] | [Sí/No] |
| CVEs High/Critical | 0 | [N] | [Estado] | [Link] | [Nombre] | [Sí/No] |
| Ratio de deuda técnica | < 5% | [X%] | [Estado] | [Link] | [Nombre] | [Sí/No] |
| Distribución de testing | Objetivo 70/20/10 | [Actual] | [Estado] | [Link] | [Nombre] | [Sí/No] |
| Evidencia de observabilidad | Requerida | [Lista / Pendiente] | [Estado] | [Link] | [Nombre] | [Sí/No] |

---

## 6. Riesgos y Decisiones

| Riesgo / Decisión | Impacto | Severidad | Owner | Acción Requerida | Fecha Límite | Escalamiento | Estado |
|---|---|---|---|---|---|---|---|
| [Riesgo o decisión] | [Impacto] | [Baja / Media / Alta / Crítica] | [Nombre] | [Acción] | [Fecha] | [Sí/No] | [Abierto / En Progreso / Resuelto] |

---

## 7. Decisión Ejecutiva

| Campo | Valor |
|---|---|
| Decisión | [Avanzar | Avance Condicional | Bloquear | Escalar] |
| Aprobado Por | [Nombre / Rol] |
| Condiciones | [Condiciones o N/A] |
| Próxima Revisión | [YYYY-MM-DD] |
| Comentarios | [Notas de decisión] |
```

---

## Reglas de Seguimiento

- Actualizar el scorecard antes de cada gate review.
- Usar links a evidencia fuente, no evidencia copiada, siempre que sea posible.
- Marcar la evidencia faltante como brecha, no como supuesto informal.
- Una fase solo puede estar en verde cuando el gate, la evidencia de artefactos, el ownership RACI y los gates obligatorios de calidad estén en verde.
- El estado global debe seguir la peor dimensión crítica, no un promedio simple.
- Producción Activa no puede marcarse como Lista si falta evidencia de rollback u observabilidad.

---

## Definiciones de Estado

| Estado | Significado |
|---|---|
| En Curso | La evidencia requerida existe, el ownership está asignado y no hay issue bloqueante de calidad. |
| Observación | Existe un issue menor o dependencia que aún no bloquea el gate actual. |
| En Riesgo | Un artefacto, rol, métrica o decisión requerida está incompleta y podría bloquear el gate. |
| Bloqueado | Un criterio obligatorio de gate falló o falta evidencia. |
| Listo | La evidencia de gate está completa y el rol accountable puede aprobar la progresión. |

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Vista Ejecutiva para Directores de Tecnología](../executive-view.es.md) | Modelo operativo a nivel directivo. |
| [Gates de Calidad SDLC](../quality-gates.es.md) | Baseline canónica de umbrales y política de waivers. |
| [Matriz de Responsabilidades SDLC](../responsibility-matrix.es.md) | Ownership de gates y expectativas por rol. |
| [Modelo de Trazabilidad SDLC](../traceability-model.es.md) | Cadena de evidencia desde intención de negocio hasta producción. |
| [Hub de Plantillas de Artefactos](./README.es.md) | Plantillas oficiales SDLC. |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | Plantilla de Scorecard Ejecutivo SDLC</sub>
</div>
