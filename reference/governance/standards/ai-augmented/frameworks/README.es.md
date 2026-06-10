# Frameworks AI-DD — Referencia de Adopcion

> **Navegacion bilingue:** [English Version](./README.md)

Esta seccion documenta como este repositorio adopta y configura frameworks externos de desarrollo dirigido por IA. No reemplaza ni replica la documentacion oficial de ningun framework. Cada entrada describe las decisiones locales de implementacion, adaptaciones y extensiones construidas sobre el framework original.

---

## Distincion Importante

Los documentos de esta seccion describen **la configuracion especifica de este repositorio** para cada framework: los agentes agregados, las reglas definidas, los playbooks escritos y el harness conectado al contexto de arquitectura progresiva.

Para la fuente autoritativa de cada framework, consulte siempre su repositorio oficial.

---

## Frameworks Adoptados en Este Repositorio

| Framework | Fuente oficial | Que se documenta aqui |
| :--- | :--- | :--- |
| [BMAD-METHOD](bmad-method/README.es.md) | [github.com/bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | Como este repositorio adopto BMAD, que se extendio y que capa local de reglas harness se construyo encima |

---

## Gates de Calidad para Esta Seccion

Todo documento de adopcion de framework debe cumplir estos gates antes de merge:

| Gate | Requisito |
| :--- | :--- |
| Links | Los links relativos y anclas Markdown resuelven desde la ubicacion real del archivo |
| Diagramas | Los fences Mermaid son sintacticamente validos y renderizables cuando se usa `--render-mermaid` |
| Idiomas | Existen variantes en ingles y espanol cuando se declara navegacion bilingue |
| Reglas de agentes | Las adiciones locales estan separadas del comportamiento upstream del framework |
| Validacion | `node .harness/scripts/validate-docs.mjs` pasa sin tratar advertencias como exito |

---

## Estructura Documental por Framework

| Documento | Proposito |
| :--- | :--- |
| `README.md` | Contexto de adopcion: que se tomo del framework, que se agrego localmente y que se dejo fuera |
| `agents-catalog.md` | Configuracion local de agentes: como se acota cada agente al contexto arquitectonico |
| `rules-reference.md` | Reglas locales del harness: que son, por que se agregaron y como extienden el framework |
| `portable-setup.md` | Como otro equipo puede replicar la adopcion en su propio contexto |

---

[Volver a Arquitectura Aumentada por IA](../../../standards/ai-augmented/README.es.md)
