# Registro de Migracion: Sandbox To-Do a UMS

> Navegacion bilingue: [English](./migration-from-todo-to-ums.md)

## Alcance

Este registro documenta el retiro de la anterior demo local y la adopcion de [UMS](https://github.com/beyondnetcode/ums) como modelo aplicado oficial de referencia.

## Referencias Anteriores Encontradas y Destino

| Grupo anterior de artefactos | Proposito anterior | Destino |
|---|---|---|
| `src/apps/todo-api/`, `src/apps/todo-web/` | Implementacion ejecutable To-Do | Eliminada; la referencia ejecutable se mantiene en UMS |
| `src/libs/aop/` y configuracion local del workspace | Codigo de soporte de la demo local anterior | Eliminados junto con la implementacion obsoleta |
| `reference/knowledge/demo/functional/` | Vision, glosario, casos de uso y alcance To-Do | Eliminados; usar documentacion de producto UMS |
| `reference/knowledge/demo/project/` | PRD y backlog To-Do | Eliminados; usar el indice documental UMS |
| `reference/knowledge/demo/technical/` | Verificacion y mapa de bounded contexts To-Do | Eliminados; usar el portal de arquitectura UMS |
| README raiz, indice maestro, getting-started, onboarding, glosario y taxonomia | Enlaces y descripciones de un sandbox local | Actualizados para dirigir a UMS y declarar el limite de autoridad |
| Ejemplos arquitectonicos y documentacion runtime | Menciones que presentaban el sandbox local como evidencia | Actualizados para identificar UMS o patrones especificos de runtime |

## Plan de Migracion Ejecutado

1. Declarar UMS como referencia oficial ejecutable y de nivel producto.
2. Reemplazar la navegacion desde paginas del sandbox local hacia el hub UMS y sus fuentes publicas.
3. Eliminar codigo fuente y documentacion de dominio To-Do locales para evitar narrativas demo competidoras.
4. Conservar un registro breve de migracion para comprender referencias historicas.
5. Mantener reglas universales en este repositorio; mantener implementacion y setup UMS en UMS.
6. Validar enlaces, politica de caracteres Markdown y diagramas Mermaid tras la migracion.

## Riesgos y Seguimiento

| Riesgo o gap | Respuesta |
|---|---|
| Los lectores confunden selecciones de implementacion UMS con politica universal | Exigir el limite referencia-versus-modelo-aplicado en navegacion y taxonomia |
| Los enlaces o el setup externo UMS evolucionan independientemente | Enlazar puntos de entrada propiedad de UMS en vez de duplicar comandos aqui |
| La informacion de setup UMS en ingles y espanol puede divergir | Resolver la alineacion en UMS y declarar el gap en el documento del modelo UMS |
| Nueva evidencia de producto se promueve sin control de alcance | Exigir revision ADR o de patron canonico antes de tratar evidencia como guia reutilizable |

## Recomendacion

Mantener este repositorio como upstream arquitectonico neutral en tecnologia y UMS como referencia viva de implementacion empresarial. Promover aprendizajes probados de UMS selectivamente mediante ADRs y patrones canonicos, con limites explicitos de runtime y de producto.

---
[Volver al Hub de Referencia UMS](./README.md)
