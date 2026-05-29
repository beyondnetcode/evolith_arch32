# Plantilla: Reporte de Resumen de Testing

> **Navegación bilingüe:** [English](./test-summary-report-template.md)
> **Fase:** 4 — Validación y QA
> **Puerta de salida:** Release Candidate (RC) Sellado
> **Padre:** [Plantillas de Artefactos](./README.es.md)

---

## Acerca de Esta Plantilla

El Reporte de Resumen de Testing es el documento formal de puerta de calidad requerido antes de que un Release Candidate pueda ser sellado. Prueba que el build satisface los cuatro umbrales cuantitativos definidos en el [Framework SDLC Orientado a Construcción §3.2](../02-engineering/construction-focused-sdlc-framework.md) y que los requisitos de distribución de la pirámide de testing del [ADR-0018](../../../architecture/adrs/core/0018-testing-pyramid-quality-gates.md) se han cumplido.

Este documento lo produce QA / SDET y lo firman conjuntamente el QA Lead y el Engineering Lead. El Architecture Board puede solicitarlo durante la revisión de puerta.

---

## Sección 1 — Plantilla en Blanco

### Fuente — Copiar y pegar

```markdown
# Reporte de Resumen de Testing — [Nombre del Producto] [Versión]

> Estado: [Borrador | Completo | Firmado]
> RC Candidato: [v0.X.0-rc.X]
> Fecha del Reporte: [AAAA-MM-DD]
> QA Lead: [Nombre]
> Engineering Lead: [Nombre]
> Revisor Architecture Board: [Nombre o TBD]

---

## 1. Alcance del Release

[Descripción breve de qué cubre este RC: qué épicas, qué historias funcionales,
qué historias técnicas. Referencia el PRD o el resumen del sprint si está disponible.]

| Historia Funcional | Título | Estado |
|---|---|---|
| FS-XX | [Título] | [Pasó / Falló / Diferido] |

---

## 2. Métricas de Umbral de Calidad

Estas cuatro métricas están mandatadas por el Framework SDLC §3.2.
Todas deben mostrar APROBADO antes de sellar el RC.

| Métrica | Umbral | Real | Estado |
|---|:---:|:---:|:---:|
| Cobertura de Código (lógica de negocio) | >= 80% | [X%] | [APROBADO / FALLIDO] |
| Complejidad Ciclomática (máx por método) | <= 15 | [X] | [APROBADO / FALLIDO] |
| CVEs HIGH / CRITICAL | 0 | [N] | [APROBADO / FALLIDO] |
| Ratio de Deuda Técnica | < 5% | [X%] | [APROBADO / FALLIDO] |

---

## 3. Resumen de la Pirámide de Testing

Distribución mandatada por ADR-0018: 70% unit / 20% integración / 10% E2E.

| Tipo de Test | Tests Ejecutados | Tests Aprobados | Tests Fallidos | Contribución a Cobertura |
|---|:---:|:---:|:---:|:---:|
| **Unit** | [N] | [N] | [N] | [X%] |
| **Integración** | [N] | [N] | [N] | [X%] |
| **E2E** | [N] | [N] | [N] | [X%] |
| **Total** | [N] | [N] | [N] | [X%] |

Distribución pirámide (real): Unit [X%] / Integración [X%] / E2E [X%]

---

## 4. Resultados del Escaneo de Seguridad

| Herramienta | Alcance | CVEs HIGH | CVEs CRITICAL | Estado |
|---|---|:---:|:---:|:---:|
| [dotnet audit / npm audit] | [Dependencias] | 0 | 0 | [APROBADO / FALLIDO] |
| [GitHub CodeQL] | [Código fuente] | 0 | 0 | [APROBADO / FALLIDO] |
| [SonarQube / SonarCloud] | [Code smells, hotspots de seguridad] | — | — | [APROBADO / FALLIDO] |

---

## 5. Validación de Historias Funcionales

Para cada Historia Funcional en alcance, confirma que cada Criterio de Aceptación fue verificado.

### FS-XX — [Título de la Historia]

| ID CA | Criterio de Aceptación | Tipo de Test | Verificado Por | Estado |
|---|---|---|---|:---:|
| CA-01 | [Texto del criterio] | [Unit / Integración / E2E / Manual] | [Nombre del tester] | [Aprobó / Falló] |
| CA-02 | [Texto del criterio] | [Unit / Integración / E2E / Manual] | [Nombre del tester] | [Aprobó / Falló] |

---

## 6. Resultados de Contract Tests

(Completar solo si existen contratos inter-servicio — [Guía de Contract Testing](../../standards/engineering/contract-testing-guideline.md))

| Contrato | Proveedor | Consumidor | Estado |
|---|---|---|:---:|
| [Nombre del contrato API] | [Nombre del contexto] | [Nombre del contexto] | [Aprobó / Falló] |

---

## 7. Problemas Conocidos y Elementos Diferidos

| ID Problema | Descripción | Severidad | Disposición | Versión Objetivo |
|---|---|---|---|---|
| [PRB-001] | [Descripción del problema] | [Alto / Medio / Bajo] | [Diferido / No se corregirá / En progreso] | [vX.X.X] |

---

## 8. Firma de Sello RC

Las cuatro métricas de umbral de calidad deben mostrar APROBADO antes de que esta sección pueda firmarse.

| Rol | Nombre | Fecha | Decisión |
|---|---|---|---|
| QA Lead | | | [Aprobar RC / Bloquear RC] |
| Engineering Lead | | | [Aprobar RC / Bloquear RC] |
| Architecture Board | | | [Aprobar RC / Bloquear RC] |

---

## 9. Apéndice: Referencia de Ejecución del Pipeline CI

| Ejecución del Pipeline | URL | Resultado |
|---|---|:---:|
| [ID de ejecución GitHub Actions] | [Enlace] | [Éxito / Fallo] |
```

---

### Vista Previa

# Reporte de Resumen de Testing — [Nombre del Producto] [Versión]

> Estado: [Borrador | Completo | Firmado]
> RC Candidato: [v0.X.0-rc.X]
> Fecha del Reporte: [AAAA-MM-DD]
> QA Lead: [Nombre]
> Engineering Lead: [Nombre]
> Revisor Architecture Board: [Nombre o TBD]

---

## 1. Alcance del Release

[Descripción breve de qué cubre este RC: qué épicas, qué historias funcionales,
qué historias técnicas. Referencia el PRD o el resumen del sprint si está disponible.]

| Historia Funcional | Título | Estado |
|---|---|---|
| FS-XX | [Título] | [Pasó / Falló / Diferido] |

---

## 2. Métricas de Umbral de Calidad

Estas cuatro métricas están mandatadas por el Framework SDLC §3.2.
Todas deben mostrar APROBADO antes de sellar el RC.

| Métrica | Umbral | Real | Estado |
|---|:---:|:---:|:---:|
| Cobertura de Código (lógica de negocio) | >= 80% | [X%] | [APROBADO / FALLIDO] |
| Complejidad Ciclomática (máx por método) | <= 15 | [X] | [APROBADO / FALLIDO] |
| CVEs HIGH / CRITICAL | 0 | [N] | [APROBADO / FALLIDO] |
| Ratio de Deuda Técnica | < 5% | [X%] | [APROBADO / FALLIDO] |

---

## 3. Resumen de la Pirámide de Testing

Distribución mandatada por ADR-0018: 70% unit / 20% integración / 10% E2E.

| Tipo de Test | Tests Ejecutados | Tests Aprobados | Tests Fallidos | Contribución a Cobertura |
|---|:---:|:---:|:---:|:---:|
| **Unit** | [N] | [N] | [N] | [X%] |
| **Integración** | [N] | [N] | [N] | [X%] |
| **E2E** | [N] | [N] | [N] | [X%] |
| **Total** | [N] | [N] | [N] | [X%] |

Distribución pirámide (real): Unit [X%] / Integración [X%] / E2E [X%]

---

## 4. Resultados del Escaneo de Seguridad

| Herramienta | Alcance | CVEs HIGH | CVEs CRITICAL | Estado |
|---|---|:---:|:---:|:---:|
| [dotnet audit / npm audit] | [Dependencias] | 0 | 0 | [APROBADO / FALLIDO] |
| [GitHub CodeQL] | [Código fuente] | 0 | 0 | [APROBADO / FALLIDO] |
| [SonarQube / SonarCloud] | [Code smells, hotspots de seguridad] | — | — | [APROBADO / FALLIDO] |

---

## 5. Validación de Historias Funcionales

Para cada Historia Funcional en alcance, confirma que cada Criterio de Aceptación fue verificado.

### FS-XX — [Título de la Historia]

| ID CA | Criterio de Aceptación | Tipo de Test | Verificado Por | Estado |
|---|---|---|---|:---:|
| CA-01 | [Texto del criterio] | [Unit / Integración / E2E / Manual] | [Nombre del tester] | [Aprobó / Falló] |
| CA-02 | [Texto del criterio] | [Unit / Integración / E2E / Manual] | [Nombre del tester] | [Aprobó / Falló] |

---

## 6. Resultados de Contract Tests

(Completar solo si existen contratos inter-servicio — [Guía de Contract Testing](../../standards/engineering/contract-testing-guideline.md))

| Contrato | Proveedor | Consumidor | Estado |
|---|---|---|:---:|
| [Nombre del contrato API] | [Nombre del contexto] | [Nombre del contexto] | [Aprobó / Falló] |

---

## 7. Problemas Conocidos y Elementos Diferidos

| ID Problema | Descripción | Severidad | Disposición | Versión Objetivo |
|---|---|---|---|---|
| [PRB-001] | [Descripción del problema] | [Alto / Medio / Bajo] | [Diferido / No se corregirá / En progreso] | [vX.X.X] |

---

## 8. Firma de Sello RC

Las cuatro métricas de umbral de calidad deben mostrar APROBADO antes de que esta sección pueda firmarse.

| Rol | Nombre | Fecha | Decisión |
|---|---|---|---|
| QA Lead | | | [Aprobar RC / Bloquear RC] |
| Engineering Lead | | | [Aprobar RC / Bloquear RC] |
| Architecture Board | | | [Aprobar RC / Bloquear RC] |

---

## 9. Apéndice: Referencia de Ejecución del Pipeline CI

| Ejecución del Pipeline | URL | Resultado |
|---|---|:---:|
| [ID de ejecución GitHub Actions] | [Enlace] | [Éxito / Fallo] |

---

## Sección 2 — Ejemplo Completo

### Fuente — Copiar y pegar

```markdown
# Reporte de Resumen de Testing — UMS MVP v0.1.0

> Estado: Firmado
> RC Candidato: v0.1.0-rc.1
> Fecha del Reporte: 2026-03-28
> QA Lead: QA Engineer — Equipo UMS
> Engineering Lead: UMS Tech Lead
> Revisor Architecture Board: Evolith Architecture Board

---

## 1. Alcance del Release

UMS MVP cubriendo EP-01 (Identity), EP-02 (Authorization), EP-03 (Configuration),
EP-04 (Audit), EP-05 (Console/Admin). Historias Funcionales FS-01 a FS-08 y FS-13.
89 Historias Técnicas planificadas; 53 completadas en alcance MVP (253 story points).

| Historia Funcional | Título | Estado |
|---|---|---|
| FS-01 | Registro de Usuario y Ciclo de Vida de Identidad | Pasó |
| FS-02 | Asignación de Roles y Gestión de Plantillas RBAC | Pasó |
| FS-03 | Provisionamiento de Organización Multi-Tenant | Pasó |
| FS-04 | Jerarquía de Configuración y Resolución de Tenant | Pasó |
| FS-05 | Compilación del Grafo de Permisos y Visual Resolver | Pasó |
| FS-06 | Audit Trail Inmutable y Registro de Eventos | Pasó |
| FS-07 | Consola Administrativa y Dashboard de Tenant | Pasó |
| FS-08 | Flujo de Login OIDC y Abstracción de IdP | Pasó |
| FS-13 | Proyecciones CQRS y API de Consulta de Permisos | Pasó |

---

## 2. Métricas de Umbral de Calidad

| Métrica | Umbral | Real | Estado |
|---|:---:|:---:|:---:|
| Cobertura de Código (lógica de negocio) | >= 80% | 84% | APROBADO |
| Complejidad Ciclomática (máx por método) | <= 15 | 11 | APROBADO |
| CVEs HIGH / CRITICAL | 0 | 0 | APROBADO |
| Ratio de Deuda Técnica | < 5% | 3.2% | APROBADO |

---

## 3. Resumen de la Pirámide de Testing

| Tipo de Test | Tests Ejecutados | Tests Aprobados | Tests Fallidos | Contribución a Cobertura |
|---|:---:|:---:|:---:|:---:|
| **Unit** | 412 | 412 | 0 | 71% |
| **Integración** | 118 | 117 | 1 | 21% |
| **E2E** | 47 | 47 | 0 | 8% |
| **Total** | 577 | 576 | 1 | 84% |

Distribución pirámide (real): Unit 71% / Integración 20% / E2E 8% — dentro de los objetivos ADR-0018.

Un fallo en test de integración (IT-203: timeout de conexión Redis en CI) fue investigado y confirmado
como test flaky por race condition en el arranque del container. Corregido en commit `a8f3c1`. Re-ejecución: APROBADO.

---

## 4. Resultados del Escaneo de Seguridad

| Herramienta | Alcance | CVEs HIGH | CVEs CRITICAL | Estado |
|---|---|:---:|:---:|:---:|
| dotnet audit | Dependencias NuGet | 0 | 0 | APROBADO |
| GitHub CodeQL | Código fuente C# (Identity, Authorization, Audit) | 0 | 0 | APROBADO |
| SonarCloud | Solución completa — code smells y hotspots de seguridad | 0 | 0 | APROBADO |

---

## 5. Validación de Historias Funcionales (extracto)

### FS-01 — Registro de Usuario y Ciclo de Vida de Identidad

| ID CA | Criterio de Aceptación | Tipo de Test | Estado |
|---|---|---|:---:|
| CA-01 | Admin crea usuario; usuario aparece como Pendiente en directorio del tenant | E2E | Aprobó |
| CA-02 | Usuario activa vía invitación; estado cambia a Activo | Integración | Aprobó |
| CA-03 | Correo duplicado retorna error informativo sin crear duplicado | Unit + Integración | Aprobó |
| CA-04 | Usuario suspendido no puede autenticarse | E2E | Aprobó |
| CA-05 | Todos los eventos del ciclo de vida aparecen en historial de auditoría | Integración | Aprobó |

---

## 6. Resultados de Contract Tests

| Contrato | Proveedor | Consumidor | Estado |
|---|---|---|:---:|
| Schema evento asíncrono UserCreated | EP-01 Identity | EP-04 Audit | Aprobó |
| Schema evento asíncrono UserCreated | EP-01 Identity | EP-02 Authorization | Aprobó |
| Contrato OpenAPI GET /api/v1/users/{id} | EP-01 Identity | EP-05 Console | Aprobó |

---

## 7. Problemas Conocidos y Elementos Diferidos

| ID Problema | Descripción | Severidad | Disposición | Versión Objetivo |
|---|---|---|---|---|
| PRB-014 | Visual Graph Resolver renderiza lento para orgs > 500 roles | Medio | Diferido — optimización de rendimiento | v0.2.0 |
| PRB-019 | API de consulta del audit log no tiene paginación cursor-based | Bajo | Diferido — aceptable para escala MVP | v0.2.0 |

---

## 8. Firma de Sello RC

| Rol | Nombre | Fecha | Decisión |
|---|---|---|---|
| QA Lead | QA Engineer — Equipo UMS | 2026-03-28 | Aprobar RC |
| Engineering Lead | UMS Tech Lead | 2026-03-28 | Aprobar RC |
| Architecture Board | Evolith Architecture Board | 2026-03-29 | Aprobar RC |

---

## 9. Apéndice: Referencia de Ejecución del Pipeline CI

| Ejecución del Pipeline | URL | Resultado |
|---|---|:---:|
| GitHub Actions #1847 — rama main | https://github.com/beyondnetcode/ums/actions/runs/1847 | Éxito |
```

---

### Vista Previa

# Reporte de Resumen de Testing — UMS MVP v0.1.0

> Estado: Firmado
> RC Candidato: v0.1.0-rc.1
> Fecha del Reporte: 2026-03-28
> QA Lead: QA Engineer — Equipo UMS
> Engineering Lead: UMS Tech Lead
> Revisor Architecture Board: Evolith Architecture Board

---

## 1. Alcance del Release

UMS MVP cubriendo EP-01 (Identity), EP-02 (Authorization), EP-03 (Configuration),
EP-04 (Audit), EP-05 (Console/Admin). Historias Funcionales FS-01 a FS-08 y FS-13.
89 Historias Técnicas planificadas; 53 completadas en alcance MVP (253 story points).

| Historia Funcional | Título | Estado |
|---|---|---|
| FS-01 | Registro de Usuario y Ciclo de Vida de Identidad | Pasó |
| FS-02 | Asignación de Roles y Gestión de Plantillas RBAC | Pasó |
| FS-03 | Provisionamiento de Organización Multi-Tenant | Pasó |
| FS-04 | Jerarquía de Configuración y Resolución de Tenant | Pasó |
| FS-05 | Compilación del Grafo de Permisos y Visual Resolver | Pasó |
| FS-06 | Audit Trail Inmutable y Registro de Eventos | Pasó |
| FS-07 | Consola Administrativa y Dashboard de Tenant | Pasó |
| FS-08 | Flujo de Login OIDC y Abstracción de IdP | Pasó |
| FS-13 | Proyecciones CQRS y API de Consulta de Permisos | Pasó |

---

## 2. Métricas de Umbral de Calidad

| Métrica | Umbral | Real | Estado |
|---|:---:|:---:|:---:|
| Cobertura de Código (lógica de negocio) | >= 80% | 84% | APROBADO |
| Complejidad Ciclomática (máx por método) | <= 15 | 11 | APROBADO |
| CVEs HIGH / CRITICAL | 0 | 0 | APROBADO |
| Ratio de Deuda Técnica | < 5% | 3.2% | APROBADO |

---

## 3. Resumen de la Pirámide de Testing

| Tipo de Test | Tests Ejecutados | Tests Aprobados | Tests Fallidos | Contribución a Cobertura |
|---|:---:|:---:|:---:|:---:|
| **Unit** | 412 | 412 | 0 | 71% |
| **Integración** | 118 | 117 | 1 | 21% |
| **E2E** | 47 | 47 | 0 | 8% |
| **Total** | 577 | 576 | 1 | 84% |

Distribución pirámide (real): Unit 71% / Integración 20% / E2E 8% — dentro de los objetivos ADR-0018.

Un fallo en test de integración (IT-203: timeout de conexión Redis en CI) fue investigado y confirmado
como test flaky por race condition en el arranque del container. Corregido en commit `a8f3c1`. Re-ejecución: APROBADO.

---

## 4. Resultados del Escaneo de Seguridad

| Herramienta | Alcance | CVEs HIGH | CVEs CRITICAL | Estado |
|---|---|:---:|:---:|:---:|
| dotnet audit | Dependencias NuGet | 0 | 0 | APROBADO |
| GitHub CodeQL | Código fuente C# (Identity, Authorization, Audit) | 0 | 0 | APROBADO |
| SonarCloud | Solución completa — code smells y hotspots de seguridad | 0 | 0 | APROBADO |

---

## 5. Validación de Historias Funcionales (extracto)

### FS-01 — Registro de Usuario y Ciclo de Vida de Identidad

| ID CA | Criterio de Aceptación | Tipo de Test | Estado |
|---|---|---|:---:|
| CA-01 | Admin crea usuario; usuario aparece como Pendiente en directorio del tenant | E2E | Aprobó |
| CA-02 | Usuario activa vía invitación; estado cambia a Activo | Integración | Aprobó |
| CA-03 | Correo duplicado retorna error informativo sin crear duplicado | Unit + Integración | Aprobó |
| CA-04 | Usuario suspendido no puede autenticarse | E2E | Aprobó |
| CA-05 | Todos los eventos del ciclo de vida aparecen en historial de auditoría | Integración | Aprobó |

---

## 6. Resultados de Contract Tests

| Contrato | Proveedor | Consumidor | Estado |
|---|---|---|:---:|
| Schema evento asíncrono UserCreated | EP-01 Identity | EP-04 Audit | Aprobó |
| Schema evento asíncrono UserCreated | EP-01 Identity | EP-02 Authorization | Aprobó |
| Contrato OpenAPI GET /api/v1/users/{id} | EP-01 Identity | EP-05 Console | Aprobó |

---

## 7. Problemas Conocidos y Elementos Diferidos

| ID Problema | Descripción | Severidad | Disposición | Versión Objetivo |
|---|---|---|---|---|
| PRB-014 | Visual Graph Resolver renderiza lento para orgs > 500 roles | Medio | Diferido — optimización de rendimiento | v0.2.0 |
| PRB-019 | API de consulta del audit log no tiene paginación cursor-based | Bajo | Diferido — aceptable para escala MVP | v0.2.0 |

---

## 8. Firma de Sello RC

| Rol | Nombre | Fecha | Decisión |
|---|---|---|---|
| QA Lead | QA Engineer — Equipo UMS | 2026-03-28 | Aprobar RC |
| Engineering Lead | UMS Tech Lead | 2026-03-28 | Aprobar RC |
| Architecture Board | Evolith Architecture Board | 2026-03-29 | Aprobar RC |

---

## 9. Apéndice: Referencia de Ejecución del Pipeline CI

| Ejecución del Pipeline | URL | Resultado |
|---|---|:---:|
| GitHub Actions #1847 — rama main | https://github.com/beyondnetcode/ums/actions/runs/1847 | Éxito |

---

[Volver a Plantillas de Artefactos](./README.es.md)
