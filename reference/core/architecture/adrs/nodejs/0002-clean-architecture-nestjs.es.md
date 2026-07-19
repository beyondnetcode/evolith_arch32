# [ADR 0002](0002-clean-architecture-nestjs.md): Arquitectura Hexagonal Limpia con NestJS

## Estado
Accepted

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
- [ADR-0003: Estándares Estrictos de TypeScript](../../adrs/nodejs/0003-strict-typescript-standards.es.md)
- [ADR-0029: Primitivas DDD Tácticas](../../adrs/nodejs/0029-tactical-ddd-primitives-library.es.md)
- [Especificación de Arquitectura - Diagrama de Componentes de Nivel 3](../../blueprints/c4-topology-spec.es.md)







## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde los tutoriales estándar de NestJS fomentan la colocación de la lógica de negocio directamente dentro de servicios decorados con `@Injectable()`, creando un acoplamiento estrecho entre el dominio y el framework, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Arquitectura Hexagonal Limpia con NestJS
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

- [ADR-0003: Estándares Estrictos de TypeScript](../../adrs/nodejs/0003-strict-typescript-standards.es.md)
- [ADR-0029: Primitivas DDD Tácticas](../../adrs/nodejs/0029-tactical-ddd-primitives-library.es.md)
- [Especificación de Arquitectura - Diagrama de Componentes de Nivel 3](../../blueprints/c4-topology-spec.es.md)

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

NestJS se encuentra en etapa de crecimiento con adopción empresarial sólida. El framework mantiene lanzamientos regulares con soporte activo del equipo principal y la comunidad. Amplia comunidad en GitHub (60k+ estrellas), adopción extensa en ecosistemas Node.js empresariales. Vigencia esperada: 3-5 años.

## Fuentes Actuales

- Documentación oficial de NestJS — https://docs.nestjs.com, consultado 2026-06-20.
- Descargas npm y releases en GitHub — https://www.npmjs.com/package/@nestjs/core, consultado 2026-06-20.
- Encuestas State of Node.js sobre adopción de frameworks — https://stateofjs.com, consultado 2026-06-20.

---
[Volver al Índice](./README.es.md)
