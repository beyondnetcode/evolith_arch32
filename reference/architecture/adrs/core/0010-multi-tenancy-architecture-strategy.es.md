# [ADR 0010](0010-multi-tenancy-architecture-strategy.md): Estrategia de Arquitectura Multi-Tenancy para la Evolución SaaS

## Estado
Aprobado

## Fecha
2026-05-08

## Contexto
A medida que el sistema madura hacia una oferta SaaS, debemos aislar los datos de múltiples inquilinos (tenants) de forma segura sin disparar las facturas de infraestructura cloud. Existen tres enfoques principales de particionado:
1. **Base de Datos por Inquilino**: Máximo aislamiento, máxima sobrecarga de costo operativo.
2. **Esquema por Inquilino**: Separación lógica, pero gestión de migraciones de esquema más difícil.
3. **Base de Datos Compartida (Pooled)**: Un solo espacio de tablas, IDs discriminadores, alta eficiencia pero potencial filtración de datos si los desarrolladores olvidan las cláusulas WHERE.

Necesitamos prevención absoluta de filtraciones junto con un escalado de recursos eficiente.

## Decisión
Adoptar una **Estrategia Multi-Tenancy Híbrida "Pooled"** utilizando un **Marco de Aislamiento de Doble Capa obligatorio de "Defensa en Profundidad"**:

1. **Capa 1: Aislamiento a Nivel de Aplicación (Primario - Agnóstico al Motor)**:
 La capa de adaptadores de persistencia DEBE inyectar automáticamente el filtro `tenant_id` activo en todas las consultas ejecutadas vía ORM/Constructores de Consultas (ej. usando filtros globales o interceptores de consulta del repositorio base). Esto asegura que el aislamiento funcional de datos permanezca completamente agnóstico de las capacidades específicas del motor de base de datos.

2. **Capa 2: Red de Seguridad a Nivel de Base de Datos (Enforcement Nativo Específico del Motor)**:
 Como red de seguridad absoluta frente a errores humanos (ej. consultas SQL puras escritas por desarrolladores que se saltan los filtros del ORM), los equipos DEBERÍAN aprovechar el enforcement nativo de base de datos cuando el motor seleccionado lo soporte. Los ejemplos incluyen **Row-Level Security (RLS) de PostgreSQL** o **Row-Level Security de SQL Server** respaldado por contexto de sesión. Esta capa es secundaria por diseño y nunca debe reemplazar la Capa 1.

3. **Alcance de la Ejecución**: Pasar las claims de `tenant_id` de forma segura dentro de JWTs verificados o un contexto de identidad confiable equivalente. El contenedor de contexto por petición específico del runtime (ej. `AsyncLocalStorage` de NestJS, contexto tenant scoped de .NET) sirve como la fuente única de la verdad utilizada por los resolutores tanto de la Capa 1 como de la Capa 2.

4. **Preparación para Aislamiento VIP**: Mientras el 90% de los inquilinos comparten el pool, la capa de abstracción de persistencia debe soportar inherentemente el enrutamiento de clientes Enterprise a endpoints de clúster de base de datos física completamente aislados basados en metadatos del inquilino resueltos, de forma completamente transparente para el dominio.

## Consecuencias

### Positivas
- **Defensa en Profundidad**: El aislamiento de filas combina corrección a nivel de aplicación con enforcement nativo de base de datos como red de seguridad.
- **Escalabilidad Extrema**: Ejecuta cientos de inquilinos básicos en una sola instancia de Postgres sin gestionar cientos de esquemas separados.
- **Actualizaciones Simplificadas**: Una única ruta de migración se aplica limpiamente a todos los inquilinos agrupados (Pooled) instantáneamente.

### Negativas
- **Vecinos Ruidosos (Noisy Neighbors)**: Una consulta descontrolada de un inquilino puede robar capacidad de hardware. Requiere estrategias estrictas de estrangulamiento (throttling).
- **Complejidad de Restauración**: Restaurar el ciclo de vida de los datos de *solo un* inquilino desde el backup requiere significativamente más mano de obra en un modelo agrupado.

## Referencias
- [Documentación de RLS en PostgreSQL](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Row-Level Security de SQL Server](https://learn.microsoft.com/sql/relational-databases/security/row-level-security)
- [ADR-0031: Estrategia de Esquema por Contexto](../../adrs/core/0031-schema-per-context-domain-event-catalog.es.md)





## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde a medida que el sistema madura hacia una oferta SaaS, debemos aislar los datos de múltiples inquilinos (tenants) de forma segura sin disparar las facturas de infraestructura cloud, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Estrategia de Arquitectura Multi-Tenancy para la Evolución SaaS
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

- [Documentación de RLS en PostgreSQL](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Row-Level Security de SQL Server](https://learn.microsoft.com/sql/relational-databases/security/row-level-security)
- [ADR-0031: Estrategia de Esquema por Contexto](../../adrs/core/0031-schema-per-context-domain-event-catalog.es.md)

---
[Volver al Índice](./README.es.md)

> **Agent Signature:** Architect Agent
