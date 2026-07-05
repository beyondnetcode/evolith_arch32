# Vista Ejecutiva SDLC para Directores de Tecnología

> **Navegación bilingüe:** [English version](./executive-view.md)
> **Owner:** Evolith Architecture Board
> **Estado:** Referencia activa
> **Padre:** [Centro de Gobernanza SDLC Corporativa](./README.es.md)

---

## Propósito

Para Directores de Tecnología, el SDLC de Evolith no debe entenderse como un proceso documental, sino como un sistema de control de delivery.

Su propósito es asegurar que el trabajo financiado sea trazable, que el riesgo arquitectónico se resuelva antes de construir, que los gates de calidad sean objetivos y que la preparación productiva se demuestre antes del despliegue.

Ninguna fase del ciclo de vida debe avanzar solo por acuerdo verbal. Cada gate requiere evidencia versionada, responsable asignado y criterio objetivo de aprobación.

---

## Preguntas Operativas Ejecutivas

Los Directores de Tecnología deben usar el SDLC para responder cinco preguntas operativas:

| Pregunta | Qué controla |
|---|---|
| Estamos construyendo el producto correcto? | Alcance, alineamiento de inversión y resultados de negocio |
| Las decisiones arquitectónicas fueron aprobadas antes de iniciar construcción? | Riesgo de solución, alineamiento con plataforma y retrabajo evitable |
| Cada cambio de código es trazable a una necesidad de negocio y a un diseño técnico? | Responsabilidad de delivery y auditabilidad |
| Los gates de calidad son suficientemente objetivos para bloquear releases inseguros? | Seguridad de release y disciplina de ingeniería |
| La preparación productiva puede demostrarse antes de declarar Producción Activa? | Resiliencia operativa e impacto al cliente |

---

## Puntos de Control Ejecutivo

| Punto de control | Pregunta ejecutiva | Evidencia requerida | Riesgo de negocio reducido |
|---|---|---|---|
| Aprobación de Negocio | El alcance justifica inversión y está claro para diseñar? | PRD aprobado | Inversión desalineada y cambios constantes de alcance |
| Baseline de Diseño | Arquitectura, límites, ADRs y restricciones están estables? | ADRs, Historias Funcionales, alineamiento con Blueprint | Retrabajo arquitectónico y complejidad no controlada |
| Build Exitoso | El producto está técnicamente listo para validación? | Resultado CI, Historias Técnicas, Definición de Terminado | Código defectuoso o no revisado entrando a QA |
| RC Sellado | El release es seguro para desplegar? | Test Summary Report | Defectos productivos, exposición de seguridad e inestabilidad de release |
| Producción Activa | El sistema es observable, reversible y nominal? | Release Notes, checklist de observabilidad, plan de rollback | Despliegues ciegos y recuperación lenta ante incidentes |

---

## Derechos de Decisión Directiva

| Área de decisión | Preocupación directiva | Evidencia esperada |
|---|---|---|
| Continuidad de inversión | El producto sigue alineado con resultados de negocio medibles? | Objetivos del PRD, métricas de éxito, alcance de release |
| Excepción arquitectónica | La excepción genera más valor estratégico que riesgo? | ADR con opciones, trade-offs, consecuencias y owner |
| Aprobación de release | El release es objetivamente seguro para usuarios? | Gates de calidad aprobados, RC sellado, plan de rollback |
| Preparación productiva | El equipo puede detectar, diagnosticar y recuperarse de fallos? | Checklist de observabilidad, dashboards, runbooks |
| Waiver de gobernanza | La desviación es temporal, justificada, asignada y con fecha límite? | Registro de waiver, fecha de expiración, plan de mitigación |

---

## Regla Práctica de Gobernanza

Una fase solo puede avanzar cuando su gate tiene evidencia.

La evidencia debe estar:

- Almacenada en control de versiones o en un sistema gobernado de registro.
- Asignada a un rol responsable y nombrado.
- Vinculada al producto, release o bounded context correspondiente.
- Revisable por Arquitectura, Ingeniería, QA, Producto u Operaciones según el gate.
- Definida con suficiente objetividad para bloquear la progresión si falta o falla.

---

## Dashboard Ejecutivo Mínimo

Un Director de Tecnología debe poder revisar el SDLC mediante un dashboard compacto:

| Señal | Estado saludable | Disparador de escalamiento |
|---|---|---|
| Estado de gates | Cada iniciativa activa tiene fase actual y owner de gate | El trabajo avanza sin evidencia de gate |
| Decisiones arquitectónicas | Las decisiones significativas tienen ADR antes de implementación | Las decisiones aparecen primero en el código |
| Gates de calidad | CI, cobertura, CVEs, complejidad y deuda son visibles | El release depende solo de confianza manual |
| Trazabilidad | La cadena PRD a release es navegable | Las funcionalidades no se pueden rastrear a intención de negocio |
| Preparación productiva | El release incluye rollback y evidencia de observabilidad | El despliegue no tiene camino de recuperación validado |

---

## Documentos Relacionados

| Documento | Propósito |
|---|---|
| [Centro de Gobernanza SDLC Corporativa](./README.es.md) | Hub principal del ciclo de vida y navegación por fases. |
| [Gates de Calidad](./quality-gates.es.md) | Umbrales objetivos de calidad usados para bloquear progresión insegura. |
| [Modelo de Trazabilidad](./traceability-model.es.md) | Cadena de evidencia end-to-end desde necesidad de negocio hasta producción. |
| [Matriz de Responsabilidades](./responsibility-matrix.es.md) | Roles accountable y responsible por gate. |
| [Mapeo SDLC–Artefactos Evolith](./sdlc-evolith-artifact-mapping.es.md) | Artefactos requeridos y opcionales por fase del ciclo de vida. |

---

<div align="center">
  <sub>Evolith — Enterprise Architecture Platform | Vista Ejecutiva SDLC</sub>
</div>
