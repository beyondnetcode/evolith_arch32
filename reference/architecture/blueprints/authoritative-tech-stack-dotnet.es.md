# Stack Tecnológico Autorizado: Ecosistema .NET & C#

> **Navegación Bilingüe:** [English Version](../blueprints/authoritative-tech-stack-dotnet.es.md)

**Tipo de Documento:** Apéndice de Runtime  
**Prerrequisito:** DEBE leerse después de la **[Línea Base Agnóstica](./authoritative-tech-stack-agnostic.es.md)**.  
**Ecosistema Objetivo:** Workers de Cómputo Pesado, Interoperabilidad Legacy, Procesamiento por Lotes Empresarial.

---

## 1. Matriz de Cumplimiento Ejecutiva (Mandatos para Proveedores)

Todas las escuadras de ingeniería que desarrollen dentro del ecosistema .NET DEBEN imponer estrictamente los artefactos autorizados a continuación. Cualquier intento de reemplazo exige un ADR aprobado ANTES de escribir código.

| Categoría | Herramienta / Framework Aprobado | Versión Validada | ¿ADR Requerido para Cambiar? | Alternativas Explícitamente Rechazadas |
| :--- | :--- | :--- | :--- | :--- |
| **Runtime Base** | **.NET 8 LTS** | 8.0.x | **SÍ** | .NET Framework 4.8, .NET 7 (STS) |
| **Host Web** | **ASP.NET Core** | 8.0.x | **SÍ** | Hospedaje IIS, Legacy WCF |
| **ORM Relacional** | **EF Core (vía SQL Server)** | 8.0.x | **SÍ** | Npgsql, Oracle, MySQL |
| **Validación** | **FluentValidation** | 11.9+ | **NO** | System.ComponentModel (Data Annotations) dentro del Dominio |
| **Pruebas Unitarias** | **xUnit** | 2.6.x | **SÍ** | MSTest, NUnit |
| **Mocks / Stubs** | **Moq 4.x** o **NSubstitute** | Latest | **NO** | WireMock (Permitido solo para mocks de API externos) |
| **Formateo** | **CSharpier** | Latest | **NO** | dotnet format (Estándar) |
| **Observabilidad** | **OpenTelemetry.Extensions.Hosting** | 1.7+ | **SÍ** | Application Insights SDK nativo (Vendor Lock-in) |

> [!TIP]
> **Aislamiento de Pruebas:** Los desarrolladores DEBEN seguir la estrategia de aislamiento definida en el [ADR-0052](../adrs/core/0052-unit-testing-isolation-strategy.es.md) al utilizar Mocks (verificación de interacción) o Stubs (configuración de estado).
>
> **Pruebas de Infraestructura:** Las pruebas de Integración y E2E DEBEN utilizar **Testcontainers** como se define en el [ADR-0053](../adrs/core/0053-integration-e2e-testing-strategy.es.md) para garantizar la paridad con producción.

---

## 2. Implementación Arquitectónica (Mapeo .NET)

Para cumplir con el mandato general de arquitectura Hexagonal, se aplican las siguientes reglas de organización de proyectos .NET:

### 2.1 Segregación de Proyectos (Estructura de la Solución)
1. **`{BoundedContext}.Domain`**: Plain Old CLR Objects (POCOs). Absolutamente **cero referencias NuGet** fuera de las librerías fundamentales de `System`. Contiene Entidades de Dominio, Objetos de Valor e Interfaces (Puertos).
2. **`{BoundedContext}.Application`**: Implementa los comandos CQRS y casos de uso vía `MediatR`. Coordina la lógica de dominio sin conocimiento de Bases de Datos.
3. **`{BoundedContext}.Infrastructure`**: Contiene el **EF Core DbContext**, configuraciones de SQL Server, adaptadores de cliente Redis y clientes de APIs externos.
4. **`{BoundedContext}.Presentation` (o Web API)**: Punto de entrada que contiene los Controladores ASP.NET o endpoints de Minimal API, mapeando DTOs a Comandos de Aplicación.

### 2.2 Política de Gestión de Errores
Lanzar Excepciones estándar para el control de flujo está **PROHIBIDO**.  
Los equipos DEBEN utilizar el **Patrón Result** para propagar fallos de lógica de negocio de forma segura. Se exige el uso de `OneOf<T>` o clases personalizadas `Result<T, TError>` para las respuestas de la Capa de Aplicación para garantizar el manejo de errores en tiempo de compilación en los controladores Web.

---

## 3. Detalles de Persistencia (Entity Framework Core)

### 3.1 Aislamiento Multi-Tenancy (Aplicación Primero, SQL Server RLS Después)
Al utilizar SQL Server como motor de persistencia en .NET:
* La capa de Infraestructura DEBE implementar un `TenantResolver` extrayendo el `tenant_id` de las `ClaimsPrincipal`.
* Las capas de Aplicación e Infraestructura DEBEN imponer primero el aislamiento del tenant mediante filtros de consulta de EF Core, composición de consultas scoped o adaptadores de persistencia equivalentes que apliquen automáticamente el discriminador del tenant activo.
* El `DbContext` PUEDE adicionalmente utilizar `connection.CreateCommand()` dentro de los eventos de apertura del contexto o interceptores de conexión para ejecutar:
 ```sql
 EXEC sp_set_session_context 'tenant_id', @tenantId;
 ```
* SQL Server Row-Level Security es la red de seguridad secundaria frente a SQL puro u omisiones de desarrolladores. No debe tratarse como el mecanismo primario de aislamiento.

### 3.2 Migraciones
Ejecutar automáticamente `context.Database.Migrate()` directamente desde el host Web durante el arranque de la aplicación está **FUERTEMENTE DESACONSEJADO** para clústeres de producción. Utilizar bundles de scripts SQL de Entity Framework dentro de Init-Containers de Kubernetes para proteger la atomicidad del despliegue.

---

## 4. Advertencia Final de Integración para Proveedores

No satisfacer estas definiciones de herramientas estáticas bloqueará automáticamente la aceptación del código de integración.  
-> Volver al **[Índice Maestro Global](../../../MASTER_INDEX.es.md)**

---
[Volver al Índice](./README.md)
