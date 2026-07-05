# Glosario Documental

> Navegación bilingüe: [English](./glossary.md)

Este glosario estabiliza la terminología usada en el repositorio. Usa estos términos de forma consistente en README, ADRs, estándares y documentación del modelo aplicado.

| Término | Significado | Regla de uso |
|---|---|---|
| Visión Evolith | La visión documental: empezar simple, modularizar deliberadamente y distribuir solo cuando se justifique. | Usar para el propósito y principio rector de la plataforma Evolith. |
| Evolith | La plataforma de arquitectura progresiva de nivel empresarial — la fuente autoritativa de decisiones, estándares y patrones para todos los repositorios de producto de la organización. | Usar como la marca oficial de este corpus de arquitectura en toda documentación, encabezados y footers. |
| BMAD-METHOD | Método spec-driven AI-DD que puede apoyar la generación y validación de artefactos. | No usar como nombre ni acrónimo de la documentación. |
| Corpus de referencia | Cuerpo documental bajo `reference/`. | Usar para arquitectura, gobernanza, conocimiento, operaciones e infraestructura. |
| Blueprint | Un **esquema detallado que sirve como guía para desarrollar un proyecto, proceso o sistema** ([ADR-0104](../../architecture/adrs/core/0104-topology-driven-advisory-design-governance.es.md)). Se compone y valida desde bloques y referencias por concerns (frontend, backend, servicios, mobile, data); Core mide su madurez (qué tan buena guía es) y deriva criterios downstream de él. | Usar para la guía de desarrollo componible y validada, no para notas temporales. |
| ADR | Registro de Decisión Arquitectónica. | Usar para decisiones con contexto, decisión y consecuencias. |
| Estándar | Regla o política exigible. | Usar cuando se espera cumplimiento. |
| Guía | Instrucción práctica para una tarea o rol. | Usar cuando el documento es explicativo o procedimental. |
| Modelo aplicado UMS | Producto empresarial open-source externo usado como evidencia ejecutable oficial para este corpus. | Enlazar UMS para código y setup; no generalizar elecciones específicas del producto como reglas universales. |
| Perfil runtime | Recomendación tecnológica específica para Node.js, .NET, Android u otro runtime. | Separar de reglas agnósticas de runtime. |
| Patrón canónico | Patrón de implementación específico de runtime mapeado a ADRs aceptados. | Tratarlo como guía reutilizable condicionada, no como estándar agnóstico de runtime. |

---
[Volver al Hub de Referencia](../README.es.md)
