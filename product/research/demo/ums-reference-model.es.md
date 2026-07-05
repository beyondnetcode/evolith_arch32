# UMS como Modelo Aplicado Oficial de Referencia

> Navegación bilingüe: [English](./ums-reference-model.md)

## Decisión

El repositorio open-source [User Management System (UMS)](https://github.com/beyondnetcode/ums) es la referencia oficial ejecutable y de nivel producto para este corpus de arquitectura progresiva. El sandbox local To-Do ha sido retirado.

## Por Qué Se Retira el Sandbox To-Do

El ejemplo To-Do servía para demostrar patrones elementales, pero no representaba de forma creíble las preocupaciones que un arquitecto debe evaluar en un producto empresarial: ciclo de vida de identidad, límites de autorización, auditoría, flujos administrativos, protección de datos, selección de protocolos y presión de extracción. Su código local también confundía la frontera entre documentación universal y una demo tecnológicamente específica.

## Por Qué UMS Es una Mejor Línea Base

UMS es un repositorio público de producto con código fuente, documentación de producto, portal de arquitectura y guía de construcción propios. Expone un espacio de problema real: identidad y autorización empresarial. Su README identifica un monolito modular con .NET 8, comandos REST y consultas GraphQL, cliente web React, EF Core y SQL Server, acompañado de documentación de arquitectura y gobernanza.

| Aprendizaje arquitectónico | Evidencia UMS a inspeccionar |
|---|---|
| Bounded contexts y alcance de producto | Documentación de Identity, Access, Audit, Configuration, Approvals, IGA y Compliance |
| Límites clean o hexagonales | Portal de arquitectura UMS y organización del backend |
| Decisiones de comandos y consultas | Consultas GraphQL y comandos REST descritos por UMS |
| Seguridad y responsabilidad | Identidad, autorización y auditoría |
| Adopción progresiva | Relación de adopción, especialización y override con esta referencia upstream |
| Realismo de entrega | Aplicaciones API/web ejecutables, setup, pruebas y artefactos operativos |

## Qué Conocimiento Se Hereda de UMS

UMS aporta evidencia, no reemplaza la política. Este corpus puede aprender de UMS mediante:

1. Candidatos a ADR descubiertos en un producto ejecutable y promovidos tras revisión.
2. Patrones canónicos específicos de runtime con alcance explícitamente declarado.
3. Prácticas de trazabilidad entre capacidad de negocio, decisión, patrón de código y operación.
4. Señales concretas de extracción desde un producto modular con límites de seguridad significativos.

## Conceptos que Deben Usarse como Referencia

Usa UMS para estudiar propiedad de bounded contexts, contratos de identidad y acceso, auditoría inmutable, separación de protocolos API, manejo de resultados y errores, propagación de contexto de observabilidad, idempotencia y trazabilidad documental. No trates sus elecciones de runtime o almacenamiento como universales salvo que un artefacto aceptado de este repositorio lo establezca.

## Enlaces Oficiales

| Recurso | URL |
|---|---|
| Repositorio y setup | [README UMS](https://github.com/beyondnetcode/ums/blob/main/README.md) |
| Mapa documental | [Índice Maestro UMS](https://github.com/beyondnetcode/ums/blob/main/docs/MASTER_INDEX.md) |
| Límite arquitectónico y modelo de adopción | [Portal de Arquitectura UMS](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) |

## Gap Conocido

La documentación de entrada en inglés y español de UMS debe mantenerse alineada respecto de infraestructura y setup. Los consumidores deben seguir las instrucciones vigentes de UMS y confirmar allí cualquier discrepancia entre idiomas antes de adoptar detalles de producto.

---
[Volver al Hub de Referencia UMS](README.es.md)
