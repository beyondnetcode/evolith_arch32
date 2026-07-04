# Registro de Migración: Sandbox To-Do a UMS

> Navegación bilingüe: [English](./migration-from-todo-to-ums.md)

## Alcance

Este registro documenta el retiro de la anterior demo local y la adopción de [UMS](https://github.com/beyondnetcode/ums) como modelo aplicado oficial de referencia.

## Referencias Anteriores Encontradas y Destino

| Grupo anterior de artefactos | Propósito anterior | Destino |
|---|---|---|
| `src/apps/todo-api/`, `src/apps/todo-web/` | Implementación ejecutable To-Do | Eliminada; la referencia ejecutable se mantiene en UMS |
| `src/libs/aop/` y configuración local del workspace | Código de soporte de la demo local anterior | Eliminados junto con la implementación obsoleta |
| `reference/knowledge/demo/functional/` | Visión, glosario, casos de uso y alcance To-Do | Eliminados; usar documentación de producto UMS |
| `reference/knowledge/demo/project/` | PRD y backlog To-Do | Eliminados; usar el índice documental UMS |
| `reference/knowledge/demo/technical/` | Verificación y mapa de bounded contexts To-Do | Eliminados; usar el portal de arquitectura UMS |
| README raíz, índice maestro, getting-started, onboarding, glosario y taxonomía | Enlaces y descripciones de un sandbox local | Actualizados para dirigir a UMS y declarar el límite de autoridad |
| Ejemplos arquitectónicos y documentación runtime | Menciones que presentaban el sandbox local como evidencia | Actualizados para identificar UMS o patrones específicos de runtime |

## Plan de Migración Ejecutado

1. Declarar UMS como referencia oficial ejecutable y de nivel producto.
2. Reemplazar la navegación desde páginas del sandbox local hacia el hub UMS y sus fuentes públicas.
3. Eliminar código fuente y documentación de dominio To-Do locales para evitar narrativas demo competidoras.
4. Conservar un registro breve de migración para comprender referencias históricas.
5. Mantener reglas universales en este repositorio; mantener implementación y setup UMS en UMS.
6. Validar enlaces, política de caracteres Markdown y diagramas Mermaid tras la migración.

## Riesgos y Seguimiento

| Riesgo o gap | Respuesta |
|---|---|
| Los lectores confunden selecciones de implementación UMS con política universal | Exigir el límite referencia-versus-modelo-aplicado en navegación y taxonomía |
| Los enlaces o el setup externo UMS evolucionan independientemente | Enlazar puntos de entrada propiedad de UMS en vez de duplicar comandos aquí |
| La información de setup UMS en inglés y español puede divergir | Resolver la alineación en UMS y declarar el gap en el documento del modelo UMS |
| Nueva evidencia de producto se promueve sin control de alcance | Exigir revisión ADR o de patrón canónico antes de tratar evidencia como guía reutilizable |

## Recomendación

Mantener este repositorio como upstream arquitectónico neutral en tecnología y UMS como referencia viva de implementación empresarial. Promover aprendizajes probados de UMS selectivamente mediante ADRs y patrones canónicos, con límites explícitos de runtime y de producto.

---
[Volver al Hub de Referencia UMS](README.es.md)
