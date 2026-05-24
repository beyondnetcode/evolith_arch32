# UMS como Modelo Aplicado Oficial de Referencia

> Navegacion bilingue: [English](./ums-reference-model.md)

## Decision

El repositorio open-source [User Management System (UMS)](https://github.com/beyondnetcode/ums) es la referencia oficial ejecutable y de nivel producto para este corpus de arquitectura progresiva. El sandbox local To-Do ha sido retirado.

## Por Que Se Retira el Sandbox To-Do

El ejemplo To-Do servia para demostrar patrones elementales, pero no representaba de forma creible las preocupaciones que un arquitecto debe evaluar en un producto empresarial: ciclo de vida de identidad, limites de autorizacion, auditoria, flujos administrativos, proteccion de datos, seleccion de protocolos y presion de extraccion. Su codigo local tambien confundia la frontera entre documentacion universal y una demo tecnologicamente especifica.

## Por Que UMS Es una Mejor Linea Base

UMS es un repositorio publico de producto con codigo fuente, documentacion de producto, portal de arquitectura y guia de construccion propios. Expone un espacio de problema real: identidad y autorizacion empresarial. Su README identifica un monolito modular con .NET 8, comandos REST y consultas GraphQL, cliente web React, EF Core y SQL Server, acompañado de documentacion de arquitectura y gobernanza.

| Aprendizaje arquitectonico | Evidencia UMS a inspeccionar |
|---|---|
| Bounded contexts y alcance de producto | Documentacion de Identity, Access, Audit, Configuration, Approvals, IGA y Compliance |
| Limites clean o hexagonales | Portal de arquitectura UMS y organizacion del backend |
| Decisiones de comandos y consultas | Consultas GraphQL y comandos REST descritos por UMS |
| Seguridad y responsabilidad | Identidad, autorizacion y auditoria |
| Adopcion progresiva | Relacion de adopcion, especializacion y override con esta referencia upstream |
| Realismo de entrega | Aplicaciones API/web ejecutables, setup, pruebas y artefactos operativos |

## Que Conocimiento Se Hereda de UMS

UMS aporta evidencia, no reemplaza la politica. Este corpus puede aprender de UMS mediante:

1. Candidatos a ADR descubiertos en un producto ejecutable y promovidos tras revision.
2. Patrones canonicos especificos de runtime con alcance explicitamente declarado.
3. Practicas de trazabilidad entre capacidad de negocio, decision, patron de codigo y operacion.
4. Senales concretas de extraccion desde un producto modular con limites de seguridad significativos.

## Conceptos que Deben Usarse como Referencia

Usa UMS para estudiar propiedad de bounded contexts, contratos de identidad y acceso, auditoria inmutable, separacion de protocolos API, manejo de resultados y errores, propagacion de contexto de observabilidad, idempotencia y trazabilidad documental. No trates sus elecciones de runtime o almacenamiento como universales salvo que un artefacto aceptado de este repositorio lo establezca.

## Enlaces Oficiales

| Recurso | URL |
|---|---|
| Repositorio y setup | [README UMS](https://github.com/beyondnetcode/ums/blob/main/README.md) |
| Mapa documental | [Indice Maestro UMS](https://github.com/beyondnetcode/ums/blob/main/docs/MASTER_INDEX.md) |
| Limite arquitectonico y modelo de adopcion | [Portal de Arquitectura UMS](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |

## Gap Conocido

La documentacion de entrada en ingles y espanol de UMS debe mantenerse alineada respecto de infraestructura y setup. Los consumidores deben seguir las instrucciones vigentes de UMS y confirmar alli cualquier discrepancia entre idiomas antes de adoptar detalles de producto.

---
[Volver al Hub de Referencia UMS](./README.md)
