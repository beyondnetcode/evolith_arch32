# [ADR 0053](0053-integration-e2e-testing-strategy.md): Estrategia de Pruebas de Integración y E2E

## 1. Metadatos
* **ADR ID:** 0053
* **Título:** Estrategia de Pruebas de Integración y E2E
* **Estado:** Aprobado
* **Autores:** Oficina de Arquitectura Empresarial
* **Revisores:** Comité de Arquitectura Corporativa, Oficina del CTO
* **Fecha:** 2026-05-14
* **Tags:** `Pruebas`, `Integración`, `E2E`, `Testcontainers`, `Calidad`
* **ADRs Relacionados:** 
 * [ADR-0018: Pirámide de Pruebas y Puertas de Calidad Automatizadas](./0018-testing-pyramid-quality-gates.es.md)
 * [ADR-0052: Estrategia de Aislamiento de Pruebas Unitarias](./0052-unit-testing-isolation-strategy.es.md)

---

## Resumen Ejecutivo
Si bien las pruebas unitarias verifican la lógica de negocio en aislamiento, las pruebas de Integración y E2E son necesarias para garantizar que el sistema funcione correctamente con su infraestructura real y colaboradores externos. Este ADR establece un enfoque de "Infraestructura Real Primero" para las pruebas de integración, utilizando **Testcontainers** para eliminar los riesgos asociados con las simulaciones en memoria.

---

## 2. Contexto del Problema
Históricamente, los equipos han dependido de proveedores de bases de datos en memoria (ej. EF Core In-Memory o SQLite en memoria) para probar los adaptadores de infraestructura. Esto ha provocado fallos críticos en producción debido a:
1. **Incompatibilidades de Dialectos SQL:** Los proveedores en memoria a menudo no soportan características específicas de SQL Server o PostgreSQL (ej. RLS, JSONB, restricciones específicas).
2. **Problemas de Concurrencia:** Los comportamientos reales de bloqueo de bases de datos y los aislamientos de transacciones no se simulan con precisión.
3. **Falsa Confianza:** Las pruebas pasan localmente pero fallan en producción porque la infraestructura real se comporta de manera diferente.

---

## 3. Decisión
Establecemos una estrategia obligatoria para las capas de pruebas pesadas.

### 3.1 Pruebas de Integración (La Capa de Adaptadores)
* **Definición:** Verificar un único **Adaptador de Infraestructura** contra su contraparte externa real.
* **Regla Obligatoria:** SE DEBE utilizar **Testcontainers** para levantar instancias reales de SQL Server, PostgreSQL, Redis o MongoDB.
* **Alcance:** 
 - **Adaptadores de Persistencia:** Probar SQL puro, migraciones e implementaciones de repositorios.
 - **Adaptadores de API Externa:** Probar clientes HTTP/gRPC contra **WireMock** (como contenedor) o simuladores de servicio reales.
 - **Adaptadores de Bus de Mensajes:** Probar publicadores y consumidores contra una instancia real de RabbitMQ o Redis.

### 3.2 Pruebas E2E (La Rebanada Vertical)
* **Definición:** Probar un flujo de negocio completo desde el punto de entrada (API) hasta el almacén de datos.
* **Estándar:** Usar "Hosts Web en Proceso" (ej. `WebApplicationFactory` en .NET o `TestingModule` en NestJS) pero apuntando a contenedores reales para las bases de datos.
* **Autenticación:** Las pruebas DEBEN incluir tokens JWT reales o simulados para verificar las puertas de autorización (RBAC/ABAC).

### 3.3 Gestión de Estado (Política de Pizarra Limpia)
* Para garantizar la repetibilidad de las pruebas, el estado de la base de datos DEBE restablecerse entre pruebas.
* **Herramientas Preferidas:**
 - **.NET:** Usar **Respawn** para un truncado rápido de la base de datos.
 - **Node.js:** Usar scripts de truncado personalizados o hooks de ciclo de vida de `testcontainers`.

---

## 4. Estándares de Herramientas
| Capa | Stack .NET | Stack Node.js |
| :--- | :--- | :--- |
| **Orquestación** | **Testcontainers.NET** | **testcontainers-node** |
| **Pruebas de API** | **WebApplicationFactory** | **Supertest** |
| **Reseteo de DB** | **Respawn** | **Truncado TypeORM/Drizzle** |
| **Mocking de API** | **WireMock.Net** | **Nock** o **WireMock (Contenedor)** |

---

## 5. Consecuencias

### Positivas:
* **Paridad con Producción:** Las pruebas se ejecutan contra la misma versión del motor utilizada en producción.
* **Detección Temprana de Problemas de Esquema:** Las migraciones y restricciones se verifican en cada ejecución de CI.
* **Contratos Confiables:** Las pruebas de integración garantizan que los Adaptadores realmente cumplen con los contratos de los Puertos.

### Negativas:
* **Tiempo de Ejecución:** Las pruebas de Integración/E2E son más lentas que las unitarias.
* **Intensidad de Recursos:** Requiere que Docker esté disponible en la máquina del desarrollador y en el agente de CI.
* **Complejidad de CI:** Requiere una orquestación cuidadosa de los ciclos de vida de los contenedores en las pipelines.

---

## Conclusión Estratégica
Al alejarnos de las simulaciones en memoria y adoptar una estrategia de integración basada en contenedores, aumentamos significativamente la confiabilidad de nuestra pipeline de despliegue. El tiempo de ejecución adicional es un compromiso justificado por la confianza ganada en nuestro código dependiente de la infraestructura.





## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde context is unavailable, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Estrategia de Pruebas de Integración y E2E
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

Ninguna explícitamente enlazada.

---
[Volver al Índice](../../../../MASTER_INDEX.es.md)
