# Reglas Globales (Optimizadas por Contexto)

> **Navegación bilingüe:** [English Version](./global-rules.md)

Directivas vinculantes. Sin relleno.

| ID | Regla | Restricción |
|---|---|---|
| **R-01** | Sincronización Bilingüe | Los documentos y diagramas en español e inglés deben mantenerse 100% sincronizados; ningún documento terminado puede mantener navegación bilingüe como marcador. Las referencias a frameworks externos (BMAD-METHOD) están exentas de requisitos bilingües. |
| **R-19** | Nomenclatura Bilingüe | Use sufijo `.es.md` para archivos individuales; use subdirectorio `-es/` para contenido agrupado. Nunca mezcle patrones dentro de la misma área. Todos los pares deben mantener paridad estructural. |
| **R-02** | Context7 | Siempre consulte `context7` para límites arquitectónicos en vivo antes de tareas técnicas. |
| **R-03** | Limpieza UTF-8 | Las salidas de documentos deben ser UTF-8 puro; sin BOM, CRLF, caracteres de reemplazo, mojibake, o artefactos de codificación. |
| **R-04** | Idioma de Etiquetas | Las etiquetas de diagramas deben coincidir estrictamente con el idioma del documento; los identificadores de código están exentos. |
| **R-05** | Pila Tecnológica | Valide todas las menciones técnicas contra la pila tecnológica aprobada únicamente. |
| **R-06** | Historias Separadas | Separe FUNCTIONAL, TECHNICAL y ENABLER. Nunca mezcle negocio con detalles de implementación. |
| **R-07** | Trazabilidad | Cuando un UC cambia, actualice todos los diagramas relevantes y registre: [Doc, Type, Change, UC ID]. |
| **R-08** | Ruta de Autenticación | Los diseños de autenticación deben mostrar explícitamente ambos flujos: IDP e Interno. |
| **R-09** | Legibilidad | Los documentos funcionales usan lenguaje sencillo; sin jerga técnica. |
| **R-10** | Formato de Auditoría | Las auditorías输出的格式: [Documento, Ubicación, Tipo de Problema, Severidad, Corrección Recomendada]. |
| **R-11** | Orden | Las tareas duales ejecutan: 1. PO (funcional) -> 2. Arquitecto (técnico). Sin ejecución en paralelo. |
| **R-12** | Convenciones | Aplique estrictamente prefijos de nomenclatura, taxonomías, enlaces relativos y anclas Markdown antes de merges; los directorios de contenido en raíz requieren autoridad de ADR aceptado y `/topologies/` está prohibido salvo que un ADR reemplazante cambie la taxonomía de raíz. |
| **R-13** | Estructura Funcional | Las historias funcionales y artefactos equivalentes deben mantener la narrativa de negocio legible y aislar los detalles técnicos en una sección dedicada `Technical Requirements`. |
| **R-14** | Autoridad de Runtime | Las referencias técnicas deben citar el perfil de runtime autoritativo y mantenerse alineadas con la pila objetivo real. |
| **R-15** | Capas de Multi-Tenancy | Los estándares de multi-tenancy deben definir aislamiento en capa de aplicación como primario y ejecución en base de datos nativa como failafe secundario. |
| **R-16** | Contrato de Catálogo | Las entidades paramétricas y de configuración deben definir `code`, `value` y `description` con expectativas de trazabilidad, unicidad, auditabilidad y extensibilidad. |
| **R-17** | Extracción Modular | La lógica compartida y los límites de módulo deben preservar la preparación para extracción para evolución de monolito modular a distribuido. |
| **R-18** | Gobernanza de API Híbrida | Si REST y GraphQL coexisten, los comandos permanecen REST-first y el comportamiento de query debe permanecer consistente en ambas superficies. |
| **R-20** | Promoción Upstream de Satélites | Todos los proyectos satélite deben empujar patrones arquitectónicos descubiertos upstream a EVOLITH. El CLI de EVOLITH debe asistir en el andamiaje y aplicación de estos comportamientos comunes en todos los hijos. |
| **R-21** | Shells Transversales | La lógica de infraestructura (workflows, config, integración) debe estar encapsulada en Shells compartidos. No contamine Bounded Contexts. |
| **R-22** | Agregados Pequeños | Use listas de UUID (`List<UUID>`) para relaciones 1:N masivas para preservar rendimiento O(1) y prevenir deadlocks de concurrencia optimista. |
| **R-23** | Puertas de Dominio Dinámico | Los workflows de tenant dinámicos deben estar asegurados a nivel de dominio via un `RequirementChecklist` interno evaluado antes de transiciones de estado. |
| **R-24** | Ergonomía de Diagramas | Los modelos complejos de Domain-Driven Design (DDD) no deben ser renderizados como un único diagrama monolítico. Deben dividirse en al menos tres vistas (Business Core, Workflow/Audit, y Cross-Cutting Shells) con una leyenda visual. |
| **R-25** | Paridad de Dos Motores | Toda adición o modificación de una regla arquitectónica debe implementarse tanto en el Evaluador TypeScript Nativo como en su archivo OPA `.rego` correspondiente. El CLI debe garantizar el cambio transparente entre ambos motores. |
| **R-26** | Cierre Semántico de Gaps | Un gap solo puede estar `COMPLETADO` cuando todos sus criterios de cierre estén satisfechos y el registro canónico de cierres contenga un commit real, artefactos de evidencia fechados, comandos de validación reproducibles y disposición explícita de dependencias. |

## Compuertas de Validación Obligatorias

Antes de que cualquier cambio de documentación o regla de agente se considere completo:

1. Ejecute `node .harness/scripts/validate-docs.mjs`.
2. Ejecute `node .harness/scripts/validate-docs.mjs --render-mermaid` cuando los diagramas Mermaid hayan cambiado.
3. Corrija enlaces relativos rotos, anclas Markdown faltantes, bloques Mermaid mal formados, navegación bilingüe inválida, contrapartes de idioma faltantes, y violaciones de UTF-8 o terminaciones de línea antes del merge.
4. Reporte cualquier anomalía restante explícitamente si no puede ser corregida en el mismo cambio.

(End of file - total 40 lines)
