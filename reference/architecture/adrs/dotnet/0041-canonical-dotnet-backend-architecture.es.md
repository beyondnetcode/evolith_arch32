# [ADR 0041](0041-canonical-dotnet-backend-architecture.md): Arquitectura de Backend Canónica para .NET (C#)

## 1. Estado
**Estado**: Aprobado 
**Fecha**: 2026-05-11 
**Alcance**: Stack Tecnológico - Específico de .NET 

---

## 2. Contexto
Para las cargas de trabajo de cómputo de alta intensidad, la organización ha autorizado **.NET (C#)**. Para prevenir estándares fragmentados, debemos establecer un blueprint arquitectónico canónico alineado con los principios existentes de Hexagonal/Limpia para que los proyectos Node.js y .NET se sientan sintácticamente simétricos para el equipo de la plataforma.

---

## 3. Decisión
El marco canónico de .NET consiste en:

### A. Configuración Core
* **Runtime**: .NET 8+ (Soporte a Largo Plazo - LTS).
* **Framework**: ASP.NET Core (APIs Mínimas optimizadas para contenerización ligera).
* **Estilo**: Arquitectura Limpia (Clean Architecture). El proyecto de Dominio posee cero dependencias de Entity Framework o ASP.NET.

### B. Directivas de Diseño
* **Inyección de Dependencias**: Microsoft.Extensions.DependencyInjection nativa.
* **Base de Datos/ORM**: Entity Framework Core para CRUD transaccional; **Dapper** autorizado para cargas de trabajo de lectura intensiva de ETL/Lotes sensibles al rendimiento.
* **Validación**: FluentValidation (reflejando la intención del class-validator de Node).
* **Flujo de Errores**: Basado en Tipos de Retorno usando librerías como `OneOf` u objetos `Result` personalizados, coincidiendo con la mentalidad funcional del [ADR-0038](../nodejs/0038-error-handling-result-pattern-strategy.md).
* **Asíncronos/Trabajadores**: Uso de `BackgroundService` (IHostedService) para procesamiento nativo de lotes de alta concurrencia.

### C. Estándar de Pruebas
* **Unitarias**: xUnit + FluentAssertions.
* **Integración**: WebApplicationFactory + **Testcontainers.NET**.
* **Contratos**: PactNet (verificando contratos de consumidores con BFFs de Node.js).

---

## 4. Consecuencias

### Positivas
* **Alta Eficiencia**: Rendimiento de concurrencia masivo para pools de trabajadores.
* **Simetría de Diseño**: Un desarrollador cambiando de Node.js a .NET encontrará la misma separación de Dominio/Aplicación/Infraestructura, reduciendo la fricción.

### Negativas
* **Huella Operativa**: Estado inactivo de memoria ligeramente mayor comparado con scripts node ligeros, mitigado por trimming y compilación AOT.

---
[Volver al Índice](./README.es.md)
