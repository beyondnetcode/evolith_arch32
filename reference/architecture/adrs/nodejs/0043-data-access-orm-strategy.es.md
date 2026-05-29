# [ADR 0043](0043-data-access-orm-strategy.md): Estrategia de Acceso a Datos y ORM para Node.js

## Estado
Aprobado

## Fecha
2026-05-12

## Contexto
La plataforma de referencia requiere una estrategia de acceso a datos unificada, mantenible y de alto rendimiento a través de sus módulos de monolito progresivo. Operamos en un entorno de base de datos heterogéneo (principalmente PostgreSQL para lógica transaccional, potencialmente MongoDB para almacenamiento de documentos/proyecciones). Necesitamos seleccionar el ecosistema base de Mapeo Objeto-Relacional (ORM) y Mapeo Objeto-Documento (ODM) que equilibre la productividad del desarrollador (DX), características empresariales (migraciones, multi-inquilino) y la alineación con nuestras restricciones de Arquitectura Hexagonal (desacoplamiento del dominio de la infraestructura).

## Drivers Arquitectónicos
- **Desacoplamiento**: Separación estricta entre Entidades de Dominio y Modelos de Persistencia (en apoyo al [ADR 0002](0002-clean-architecture-nestjs.md)).
- **Multi-Tenancy**: Soporte nativo o fácilmente integrable para estrategias de aislamiento (separación por Esquema/Base de Datos, alineado con el [ADR 0010](../core/0010-multi-tenancy-architecture-strategy.md)).
- **Seguridad de Tipos**: Inferencia de TypeScript de extremo a extremo para reducir errores de consulta en tiempo de ejecución.
- **Gestión de Migraciones**: Ciclo de vida robusto e integrable en CI/CD para operaciones DDL.
- **Sobrecarga de Rendimiento**: Mínima, con mecanismos claros de escape para SQL nativo cuando sea necesario.

## Criterios de Evaluación y Candidatos

| Tecnología | Categoría | Ventajas | Desventajas | Adecuación |
|------------|-----------|----------|-------------|------------|
| **TypeORM** | RDBMS ORM | Soporte nativo de NestJS, patrón Data Mapper, excelente soporte de decoradores, ecosistema empresarial activo. | Puede generar consultas complejas, Data Mapper requiere disciplina para evitar atajos de Active Record. | **Alta** (Principal SQL) |
| **Prisma** | RDBMS ORM | Excelente DX, cliente autogenerado, DSL de esquema muy intuitivo. | Complejidad en despliegue del motor Rust, esquema rígido dificulta separación Hexagonal (genera modelos monolíticos), soporte débil para cambio dinámico de esquemas multi-inquilino. | Media (Casos puntuales) |
| **MikroORM** | RDBMS ORM | Patrón Unit of Work, excelente alineación con Clean Architecture, maneja referencias cíclicas de forma nativa. | Ecosistema más pequeño que TypeORM, mayor curva de aprendizaje. | Alta (Alternativa SQL) |
| **Knex.js** | Query Builder | Ligero, control total sobre SQL, fácil de optimizar rendimiento. | Sin gestión de relaciones, mapeo manual a objetos de dominio consume mucho tiempo. | Alta (Rendimiento/Analítica) |
| **Mongoose** | NoSQL ODM | Estándar de facto para MongoDB, buena validación de esquemas, lógica de población robusta. | Pesado, fomenta acoplamiento estrecho a los esquemas de Mongo. | **Alta** (Principal NoSQL) |

## Decisión

### 1. Persistencia Relacional Principal (RDBMS): **TypeORM**
Adoptar **TypeORM** utilizando el patrón **Data Mapper** como el estándar corporativo para bases de datos relacionales (PostgreSQL).
- **Justificación**: Completamente alineado con nuestra Arquitectura Hexagonal ([ADR 0002](0002-clean-architecture-nestjs.md)). Permite la definición distinta de la Entidad en el Core separada de los Modelos de Persistencia `@Entity` en Infraestructura. Posee la integración más fuerte con `TypeOrmModule` de NestJS.
- **Restricción**: El patrón "Active Record" está estrictamente PROHIBIDO. Todo acceso debe pasar a través de Repositorios inyectados en la capa de infraestructura.

### 2. Persistencia No Relacional Principal (NoSQL): **Mongoose**
Para casos de uso orientados a documentos (agregaciones, colecciones de auditoría, modelos de lectura de proyecciones), **Mongoose** es el ODM estándar.

### 3. Mecanismo de Escape y Consultas de Alto Rendimiento: **SQL Nativo / Knex**
Para reportes analíticos, JOINs complejos que causen degradación del rendimiento del ORM, u operaciones masivas, se permite a los desarrolladores omitir el ORM utilizando la capacidad `query()` a nivel de driver o un Constructor de Consultas ligero (Knex), siempre que se mantenga oculto detrás de la interfaz del Repositorio de Core.

## Implicaciones de Diseño

### Soporte Multi-Tenancy
El soporte de TypeORM para la clonación de conexiones y la anulación dinámica de `schema` durante las peticiones se alinea con nuestra estrategia de aislamiento basada en RLS/Esquema ([ADR 0010](../core/0010-multi-tenancy-architecture-strategy.md)). Usar `nestjs-cls` para inyectar el contexto del inquilino en la capa de datos de forma dinámica.

### Migraciones
Las migraciones deben escribirse explícitamente a través de archivos TypeScript generados por el CLI de TypeORM. La sincronización automática de esquemas (`synchronize: true`) está PROHIBIDA en entornos de producción.

## Consecuencias

### Positivas
- **Consistencia**: El estándar único reduce la carga cognitiva de incorporación.
- **Flexibilidad**: Ruta de migración clara hacia otros drivers mediante la abstracción del Repositorio.
- **Mantenibilidad**: Migraciones gestionadas en el control de versiones junto con el código.

### Negativas
- **Boilerplate**: Requiere código de mapeo personalizado de Modelos de persistencia a Entidades de Dominio.
- **Complejidad**: Se requiere gestión dinámica de conexiones para el enrutamiento dinámico de múltiples inquilinos.

## Riesgos y Mitigación
- **Problema de Consultas N+1**: Mitigación mediante reglas de ESLint para relaciones y monitoreo estricto de revisión de código de las relaciones obtenidas.
- **Dependencia del Proveedor (Lock-in)**: Mitigación a través de la estricta adherencia a interfaces en la capa de Dominio (Puertos).

## Referencias
- [ADR-0002: Arquitectura Hexagonal Limpia con NestJS](../../adrs/nodejs/0002-clean-architecture-nestjs.md)
- [ADR-0010: Estrategia de Arquitectura Multi-Tenancy](../../adrs/core/0010-multi-tenancy-architecture-strategy.md)
- [ADR-0029: Primitivas DDD Tácticas](../../adrs/nodejs/0029-tactical-ddd-primitives-library.md)

---
[Volver al Índice](./README.es.md)
