# UMS como el Modelo de Referencia Empresarial Oficial

> Navegación bilingüe: [English version](./README.md)
> Hub de producto: [UMS Reference Hub](../../products/ums-reference/README.es.md) — la superficie de producto de primer nivel para UMS en `product/products/`.

Este portal establece la relación de arquitectura corporativa entre la línea base de arquitectura progresiva y su referencia oficial y ejecutable a nivel de producto: el sistema de código abierto **User Management System (UMS)**.

---

## 1. Por qué se retiró el antiguo Sandbox TO-DO

La aplicación To-Do fue un punto de partida útil para pruebas de patrones básicos, pero introdujo limitaciones críticas que obstaculizaron su utilidad como referencia corporativa:
- **Sobresimplificación:** No representaba de manera creíble los desafíos reales de los sistemas empresariales, tales como flujos de autorización granular, ciclos de vida de identidad y auditorías con seguridad a nivel de fila (RLS).
- **Conflicto de Narrativas:** Mantener una aplicación NestJS/React local y específica dentro de un repositorio de decisiones y políticas corporativas universales y agnósticas difuminaba la frontera entre las reglas canónicas corporativas y las evidencias a nivel de producto.

---

## 2. Por qué UMS es la nueva Base de Referencia

La aplicación open-source [User Management System (UMS)](https://github.com/beyondnetcode/ums) provee un modelo aplicado de nivel empresarial. Funciona como un repositorio satélite independiente que consume, extiende y especializa las reglas centrales definidas en este upstream:
- **Realismo Ejecutable:** UMS es un producto completamente funcional con contextos delimitados reales (Identity, Access, IGA, Auditing, Compliance) estructurado sobre una topología de monolito modular.
- **Stack Tecnológico Moderno:** Muestra un backend de producción en C#/.NET 8, un cliente enriquecido en React, y la separación de consultas y comandos (CQRS) a nivel de protocolo (GraphQL para lecturas vs REST para mutaciones), respaldado por SQL Server, Redis y un stack completo de OpenTelemetry.
- **Clara Separación de Autoridades:** Las reglas y políticas universales permanecen aquí; el código ejecutable y las configuraciones de despliegue residen en UMS.

---

## 3. Conocimiento y Conceptos de Arquitectura Heredados de UMS

Los equipos de producto deben usar UMS para estudiar y adoptar los siguientes patrones estructurales:

| Preocupación Arquitectónica | Evidencia de Implementación Concreta en UMS |
| :--- | :--- |
| **Mapa de Contextos Delimitados** | Aislamiento de responsabilidades en contextos dedicados: Identity, Access, Audit, Approvals, Configuration. |
| **Arquitectura Limpia / Hexagonal** | Desacoplamiento explícito de entidades de Dominio, casos de uso de Aplicación y adaptadores de Infraestructura. |
| **Separación de Protocolos de API** | Comandos REST directos para operaciones mutables y consultas GraphQL de alto rendimiento para lecturas. |
| **Envoltorio de Observabilidad** | Propagación del contexto de ejecución (`TraceParent` + enriquecimiento de logs) a través de todo el pipeline. |
| **Auditoría e Isolation RLS** | Tablas temporales en SQL Server combinadas con capas de seguridad a nivel de fila (RLS) en la aplicación y base de datos. |
| **Idempotencia Ligera** | Middleware de deduplicación de requests utilizando cachés en memoria o distribuidas (IMemoryCache/Redis). |

---

## 4. Matriz de Navegación de Documentación

Explora el registro completo de migración y las fronteras de diseño dentro de esta referencia:

| Recurso | Alcance y Propósito |
| :--- | :--- |
| **[Visión Técnica de UMS](./ums-technical-overview.es.md)** | **Qué es UMS, sus 8 bounded contexts, stack técnico, patrones implementados y deep links por rol.** |
| [Modelo de Referencia UMS](./ums-reference-model.es.md) | Análisis detallado de la herencia, especialización y conceptos clave de UMS. |
| [Referencia vs Modelo Aplicado](./demo-vs-reference.es.md) | Comprensión de la frontera crítica entre políticas universales corporativas y especialización de productos. |
| [Libro de Registro de Migración](./migration-from-todo-to-ums.es.md) | Bitácora histórica completa de los archivos To-Do retirados y pasos ejecutados. |
| [Repositorio UMS](https://github.com/beyondnetcode/ums) | Acceso al código ejecutable del producto y sus instrucciones actuales de despliegue. |
| [Portal de Arquitectura UMS](https://github.com/beyondnetcode/ums/blob/main/docs/architecture/index.md) | Documentación oficial de los límites modulares y decisiones técnicas de UMS. |

## Ejemplos Resueltos

| Ejemplo | Descripción |
| :--- | :--- |
| [Composición Cross-Topología](./examples/cross-topology-composition/README.es.md) | Componer una topología del eje progresivo con una del eje de integración |

---
[Volver al Hub de Referencia](../../../README.es.md)
