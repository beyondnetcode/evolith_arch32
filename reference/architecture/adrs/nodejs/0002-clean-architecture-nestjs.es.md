# [ADR 0002](0002-clean-architecture-nestjs.md): Arquitectura Hexagonal Limpia con NestJS

## Estado
Aprobado

## Fecha
2026-05-08

## Contexto
Los tutoriales estándar de NestJS fomentan la colocación de la lógica de negocio directamente dentro de servicios decorados con `@Injectable()`, creando un acoplamiento estrecho entre el dominio y el framework. Esto hace que la base de código sea difícil de probar (requiere el bootstrapping del módulo de pruebas de NestJS incluso para lógica de negocio pura) e imposible de migrar a un framework diferente sin una reescritura total.

## Decisión
Adoptar la **Arquitectura Hexagonal (Puertos y Adaptadores)** como el patrón estructural obligatorio para todas las aplicaciones NestJS en este monorepo.

La arquitectura se divide en tres capas explícitas:

1. **Core (Dominio)** - Clases de TypeScript puras. Cero importaciones de NestJS, TypeORM, o cualquier SDK externo. Contiene entidades, objetos de valor (value objects), e interfaces de puertos (`IUserRepository`, `IPasswordHasher`).
2. **Aplicación** - Clases de caso de uso (Use-case) que orquestan la lógica del Core. Pueden importar NestJS solo para decoradores de DI (`@Injectable`). Sin importaciones de infraestructura.
3. **Infraestructura (Adaptadores)** - Implementaciones concretas de los puertos del Core (`TypeOrmUserRepository`, `BcryptPasswordHasher`). Todas las importaciones del framework y del SDK residen aquí.

La dirección de dependencia se impone estrictamente: Infraestructura -> Aplicación -> Core. Nunca a la inversa.

### 4. Aislamiento de Programación Orientada a Aspectos (AOP)
Las preocupaciones transversales (Registro, Auditoría, Rastreo Distribuido, Almacenamiento en Caché, Gestión de Transacciones) NUNCA deben acoplar rígidamente decoradores de librerías de terceros o SDKs dentro de las capas Core o de Aplicación.
- **Prohibido**: Inyectar `@SentryCapture`, `@OpentelemetrySpan`, o `@Cacheable` directamente en los métodos de UseCase.
- **Permitido**: Encapsular las preocupaciones AOP dentro de **Interceptores, Middleware, o Envoltorios Decoradores de NestJS que residan exclusivamente en la capa Adaptador/Infraestructura**, envolviendo limpiamente la ejecución pura de UseCase desde el exterior.

## Consecuencias

### Positivas
- Las pruebas de dominio puro corren en milisegundos sin configuración de base de datos o framework.
- Toda la capa Core puede ser extraída y reutilizada en un framework diferente (Fastify, Express) con cero cambios.
- `eslint-plugin-boundaries` puede imponer estáticamente la dirección de dependencia en CI.

### Negativas
- Requiere código de mapeo adicional (Entidad -> Modelo ORM) en la capa de infraestructura.
- Curva de aprendizaje más pronunciada para desarrolladores acostumbrados al patrón de servicio estándar de NestJS.

## Referencias
- [ADR-0003: Estándares Estrictos de TypeScript](../../adrs/nodejs/0003-strict-typescript-standards.md)
- [ADR-0029: Primitivas DDD Tácticas](../../adrs/nodejs/0029-tactical-ddd-primitives-library.md)
- [Especificación de Arquitectura - Diagrama de Componentes de Nivel 3](../../blueprints/c4-topology-spec.md)

---
[Volver al Índice](./README.es.md)
