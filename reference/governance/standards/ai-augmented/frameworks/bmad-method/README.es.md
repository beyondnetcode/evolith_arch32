# BMAD-METHOD — Referencia de Adopcion

> **Este documento describe como este repositorio adopto y configuro BMAD-METHOD.**
> No sustituye la documentacion oficial del framework.
>
> **Fuente oficial de BMAD-METHOD:** [github.com/bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
>
> **Navegacion bilingue:** [English Version](./README.es.md)

---

## Referencia Rapida

| Necesito... | Ir a |
| :--- | :--- |
| Entender que es BMAD-METHOD | [Repositorio oficial](https://github.com/bmad-code-org/BMAD-METHOD) |
| Ver como este repositorio lo adopto | [Seccion 1 — Contexto de Adopcion](#1-contexto-de-adopcion) |
| Ver la configuracion local de agentes | [Catalogo de Agentes](./agents-catalog.md) |
| Ver las reglas locales del harness | [Referencia de Reglas](./rules-reference.md) |
| Replicar esta adopcion en otro repositorio | [Guia de Setup Portable](./portable-setup.md) |

---

## 1. Contexto de Adopcion

BMAD-METHOD es un framework AI-DD (AI-Driven Development) orientado a especificaciones, creado por la comunidad `bmad-code-org`. Estructura la asistencia de IA como un equipo de agentes especializados, cada uno con rol, limite de responsabilidad y protocolo de handoff definidos, para producir resultados mas predecibles y auditables que una conversacion generalista unica.

Este repositorio adopto BMAD-METHOD como metodo AI-DD para su flujo de desarrollo orientado a especificaciones y para la gobernanza documental. La adopcion implico tres decisiones:

**1. Que agentes BMAD usar y como acotarlos.**
Se adoptaron los seis agentes de equipo BMAD (analyst, pm, architect, sm, dev, qa) y se acotaron al contexto de monolito progresivo: restricciones de arquitectura hexagonal, requisitos de multi-tenancy, perfiles runtime especificos de Node.js/.NET/Android y el proceso de decisiones basado en ADR definido en este repositorio.

**2. Que reglas locales del harness agregar encima.**
BMAD-METHOD no prescribe reglas de calidad documental. Este repositorio definio 18 reglas harness (R-01 a R-18) como capa local de gobernanza sobre BMAD, cubriendo sincronizacion bilingue, UTF-8, etiquetado de diagramas, estandares de aislamiento multi-tenant, preparacion para extraccion modular y gobernanza API. Estas reglas son locales a este repositorio y no forman parte del framework BMAD-METHOD.

**3. Que agentes ligeros de gobernanza agregar.**
Se definieron cuatro agentes locales de gobernanza harness (@po, @architect, @analyst, @devops) para revision documental y auditoria arquitectonica bajo demanda. Complementan el flujo secuencial del equipo BMAD, pero no forman parte del framework upstream BMAD.

---

## 2. Que Proviene de BMAD-METHOD

Los siguientes elementos de este repositorio provienen directamente de BMAD-METHOD:

| Elemento | Ubicacion | Notas |
| :--- | :--- | :--- |
| Seis personas de agente | `.bmad-core/agents/` | Acotadas al stack y contexto arquitectonico del repositorio |
| Flujo secuencial de entrega | `.bmad-core/workflows/development.yaml` | Adaptado a la estructura de directorios del repositorio |
| Enfoque orientado a especificaciones | En todo el repositorio | Principio analyst → PRD → TAD → backlog → code → QA |

---

## 3. Que se Agrego Localmente

Los siguientes elementos **no forman parte de BMAD-METHOD**; fueron construidos por este repositorio sobre el framework:

| Elemento | Ubicacion | Proposito |
| :--- | :--- | :--- |
| 18 reglas harness (R-01–R-18) | `.harness/rules/global-rules.md` | Calidad documental, estandares de diagramas y gobernanza arquitectonica |
| 4 agentes de gobernanza harness | `.harness/agents/agent-specs.md` | Revision bajo demanda: @po, @architect, @analyst, @devops |
| 4 playbooks de gobernanza | `.harness/playbooks/` | Checklists operativos recurrentes |
| Script `validate-docs.mjs` | `.harness/scripts/` | Validacion automatizada de UTF-8, links, anclas, bilingue y Mermaid |
| Restricciones arquitectonicas especificas | Personas de agente | Limites hexagonales, RLS, extraccion modular, trazabilidad ADR |

---

## 4. Que se Dejo Fuera

No se adoptaron todas las capacidades de BMAD-METHOD. Lo siguiente fue excluido intencionalmente:

| Capacidad | Razon |
| :--- | :--- |
| Directivas frontend especificas (React, Tailwind) | Este repositorio es agnostico a nivel de referencia; el stack frontend es especifico de demos |
| Integraciones con herramientas de backlog | Se mantuvo en archivos planos para preservar independencia de herramientas |
| Plantillas comunitarias BMAD no alineadas con la taxonomia ADR | Este repositorio usa sus propios formatos de ADR e historias en `.harness/templates/` |

---

## 5. Documentos en Esta Seccion

| Documento | Proposito |
| :--- | :--- |
| [Catalogo de Agentes](./agents-catalog.md) | Como se configura cada agente en este repositorio: alcance, restricciones y protocolo de handoff |
| [Referencia de Reglas](./rules-reference.md) | Las 18 reglas locales harness: que son, por que se agregaron y como adaptarlas |
| [Guia de Setup Portable](./portable-setup.md) | Como otro equipo puede replicar esta adopcion en su propio repositorio |

---

[Volver al Indice de Frameworks](../README.es.md)
