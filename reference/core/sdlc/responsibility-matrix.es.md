# Matriz de Responsabilidades SDLC

> **Navegación bilingüe:** [English version](./responsibility-matrix.md)
> **Owner:** Evolith Architecture Board
> **Estado:** Referencia activa
> **Padre:** [Centro de Gobernanza SDLC Corporativa](./README.es.md)

---

## Propósito

Este documento define el modelo de accountability para los gates SDLC de Evolith.

Cada gate debe tener un rol accountable claro, responsables de producción, revisores consultados y evidencia requerida. Esto evita que la progresión del ciclo de vida dependa de ownership ambiguo o aprobación informal.

---

## Términos de Responsabilidad

| Término | Significado |
|---|---|
| Accountable | Dueño de la decisión final del gate y acepta la consecuencia de aprobar o rechazar. |
| Responsible | Produce el artefacto o realiza el trabajo requerido para el gate. |
| Consulted | Revisa o asesora antes de tomar la decisión. |
| Evidence | Prueba versionada o gobernada requerida para pasar el gate. |

---

## Matriz de Responsabilidad por Gate

| Gate | Accountable | Responsible | Consulted | Evidencia requerida |
|---|---|---|---|---|
| Aprobación de Negocio | Sponsor Ejecutivo | Product Owner | Arquitecto de Software, Revisor de Gobernanza | PRD aprobado, alcance, objetivos, restricciones, no-objetivos |
| Baseline de Diseño Aprobado | Architecture Board | Arquitecto de Software | Product Owner, Tech Lead, QA / SDET | ADRs, Historias Funcionales, alineamiento con blueprint, estándares aplicables |
| Build Exitoso | Tech Lead | Backend Developer, Frontend Developer, DevOps Engineer | Arquitecto de Software, QA / SDET | CI aprobado, Historias Técnicas, checklist DoD, delta documental |
| RC Sellado | QA Lead | QA / SDET | Tech Lead, Product Owner, Ingeniero de Seguridad | Test Summary Report, validación de aceptación, métricas de calidad |
| Producción Activa | DevOps / SRE Lead | DevOps / SRE | Tech Lead, Product Owner, QA Lead | Release Notes, plan de rollback, checklist de observabilidad, evidencia de despliegue |

---

## Expectativas por Rol

### Sponsor Ejecutivo

- Confirma valor de negocio y alineamiento de inversión.
- Aprueba el alcance en Aprobación de Negocio.
- Acepta riesgo de gobernanza escalado cuando corresponde.

### Product Owner

- Es dueño del PRD, objetivos de negocio, personas, alcance y readiness de Historias Funcionales.
- Confirma que los criterios de aceptación expresen resultados de negocio.
- Revisa Release Notes para claridad de negocio.

### Architecture Board

- Aprueba baseline arquitectónica y desviaciones significativas.
- Asegura que los ADRs no contradigan estándares Evolith existentes.
- Revisa solicitudes de waiver para excepciones arquitectónicas.

### Arquitecto de Software

- Produce o revisa ADRs, decisiones de bounded context, alineamiento con blueprint y restricciones de diseño.
- Asegura que la construcción inicie desde una baseline arquitectónica aprobada.

### Tech Lead

- Es dueño de la disciplina de construcción, calidad de implementación y aplicación de la Definición de Terminado.
- Bloquea merge cuando fallan CI, revisión, documentación o restricciones arquitectónicas.

### QA Lead / QA / SDET

- Es dueño de la evidencia de calidad del RC.
- Confirma criterios de aceptación, cobertura de pruebas, resultados de escaneo de seguridad y métricas de calidad.
- Bloquea RC Sellado cuando falta o falla evidencia obligatoria de validación.

### DevOps / SRE Lead

- Es dueño de readiness de despliegue, observabilidad, rollback y nominalidad productiva.
- Bloquea Producción Activa cuando monitoreo, recuperación o evidencia de despliegue son insuficientes.

---

## Reglas de Escalamiento

| Situación | Ruta de escalamiento |
|---|---|
| El alcance de negocio es ambiguo | Product Owner -> Sponsor Ejecutivo |
| Decisión arquitectónica entra en conflicto con baseline Evolith | Arquitecto de Software -> Architecture Board |
| Umbral de calidad falla | Tech Lead / QA Lead -> Architecture Board o Engineering Leadership |
| Vulnerabilidad high/critical | Ingeniero de Seguridad -> Technology Director / Executive Risk Owner |
| Preparación productiva no puede demostrarse | DevOps / SRE Lead -> Technology Director |
| Se solicita waiver | Accountable del gate -> Architecture Board o Sponsor Ejecutivo según riesgo |

---

## Regla Práctica

Ningún gate debe tener ambigüedad compartida.

Puede haber muchos contribuyentes, pero exactamente un rol debe ser accountable de decidir si el gate pasa.

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Vista Ejecutiva para Directores de Tecnología](./executive-view.es.md) | Modelo operativo SDLC a nivel directivo. |
| [Gates de Calidad](./quality-gates.es.md) | Umbrales objetivos y reglas bloqueantes. |
| [Modelo de Trazabilidad](./traceability-model.es.md) | Cadena de evidencia a través de todas las fases. |
| [Mapeo SDLC–Artefactos Evolith](./sdlc-evolith-artifact-mapping.es.md) | Artefactos requeridos y opcionales por fase del ciclo de vida. |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | Matriz de Responsabilidades SDLC</sub>
</div>
