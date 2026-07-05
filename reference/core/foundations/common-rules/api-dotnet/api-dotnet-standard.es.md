# Estandar API Dotnet

> Navegacion bilingue: [English](./api-dotnet-standard.md)

## 1. Proposito

Este estandar define la linea base reutilizable de Evolith para APIs empresariales Dotnet. Cubre bootstrap de host, arquitectura por capas, superficies de comandos y consultas, validacion, persistencia, tenancy, observabilidad, resiliencia, seguridad, procesamiento background, documentacion y quality gates.

Este estandar no es una copia de una implementacion de producto. UMS puede usarse como evidencia aplicada, pero los detalles especificos de UMS permanecen locales salvo que se promuevan mediante ADR, estandar de gobierno o patron canonico.

## 2. Autoridad y alcance

| Area | Estandar Evolith | Referencia aplicada de producto |
|---|---|---|
| Arquitectura API | Linea base normativa | Debe cumplir o documentar desviacion |
| Bootstrap | Reglas normativas de composicion | Puede especializarse mediante bootstrappers de producto |
| Capa de aplicacion | Reglas normativas de frontera | Posee comandos, queries, handlers y validators concretos |
| Infraestructura | Fronteras normativas de integracion | Posee persistencia, providers y adaptadores concretos |
| Superficie API | Division normativa de responsabilidades | Posee rutas, schemas y modulos concretos |
| Observabilidad | Capacidades obligatorias | Posee sinks, valores y dashboards concretos |

## 3. Perfil API Dotnet empresarial recomendado

El perfil por defecto para una API Dotnet de Evolith DEBERIA usar:

| Aspecto | Perfil recomendado |
|---|---|
| Runtime | Dotnet 10 o perfil LTS/STS actual aprobado |
| Host | ASP.NET Core minimal host |
| Superficie API | REST para comandos y GraphQL o REST para consultas segun necesidades del producto |
| Orquestacion de aplicacion | Mediator o frontera de aplicacion equivalente |
| Validacion | Validacion de pipeline antes de ejecutar handlers |
| Persistencia | EF Core con SQL Server como perfil relacional empresarial por defecto salvo aprobacion diferente |
| Errores | Problem Details y contratos de error seguros para usuario |
| Observabilidad | Logs estructurados, correlation IDs, trazas, metricas y health checks |
| Resiliencia | Timeouts, retries, circuit breakers, rate limits e idempotencia donde aplique |
| Seguridad | Autenticacion, autorizacion, security headers, aislamiento de tenant y gobierno de secretos |

Toda herramienta o perfil runtime que se vuelva obligatorio para todos los productos requiere aprobacion por ADR.

## 4. Estructura boilerplate

Una API Dotnet de producto DEBERIA usar esta estructura o documentar un mapeo equivalente:

```text
src/
  apps/
    <product>.api/
      <Product>.Domain/
      <Product>.Application/
      <Product>.Infrastructure/
      <Product>.Presentation/
      <Product>.Presentation.IntegrationTest/
      <Product>.Application.Test/
      <Product>.Domain.Test/
```

Reglas de capas:

1. Domain DEBE permanecer independiente de frameworks de infraestructura.
2. Application DEBE orquestar casos de uso y depender de abstracciones, no de infraestructura concreta.
3. Infrastructure DEBE implementar persistencia, adaptadores externos, mensajeria, telemetry sinks e integraciones de provider.
4. Presentation DEBE exponer HTTP, GraphQL, documentacion, middleware y composicion del pipeline API.
5. Los tests DEBERIAN organizarse por capa y por comportamiento visible externamente.

## 5. Bootstrap de host

El host API DEBE ser pequeno y composicional.

Elementos requeridos:

- Bootstrap temprano de logging estructurado.
- Configuracion de fuente de secretos antes de registrar servicios.
- Registro modular de servicios mediante bootstrappers o unidades equivalentes de composicion.
- Frontera explicita de inicializacion de plataforma.
- Frontera explicita de pipeline middleware.
- Frontera explicita de mapeo de superficie API.

El archivo host DEBERIA delegar configuraciones complejas a extension methods o bootstrappers nombrados.

## 6. Capa de aplicacion

La capa de aplicacion DEBE definir fronteras de casos de uso.

Reglas:

1. Commands y queries DEBERIAN modelarse explicitamente.
2. La ejecucion de handlers DEBERIA mediarse mediante una frontera unica de aplicacion.
3. La validacion DEBE ejecutarse antes del handler de negocio.
4. Result o outcomes tipados equivalentes DEBERIAN preferirse sobre excepciones para flujo de negocio esperado.
5. Politicas tecnicas como transacciones, auditoria, retries y validacion de tenant DEBERIAN aplicarse mediante pipeline behaviors, decoradores o aspectos explicitos.

## 7. Gobierno de superficie API

Las superficies API DEBEN tener responsabilidad clara.

Reglas:

1. Los comandos DEBERIAN ser REST-first cuando importan claridad transaccional y semantica HTTP.
2. Las consultas PUEDEN ser REST o GraphQL cuando se requiere flexibilidad de read-shape.
3. El versionado API DEBE ser explicito para APIs publicas o orientadas al producto.
4. Los health endpoints DEBEN separarse de endpoints de negocio.
5. Los endpoints solo de desarrollo DEBEN estar protegidos por entorno.
6. OpenAPI o documentacion equivalente DEBE describir la superficie REST.
7. Los schemas GraphQL DEBEN documentarse y gobernarse cuando se use GraphQL.

## 8. Persistencia y gobierno de datos

La persistencia DEBE estar gobernada por provider y fronteras.

Reglas:

1. SQL Server es el provider relacional empresarial por defecto salvo ADR que apruebe otro provider.
2. La configuracion de EF Core DbContext DEBE vivir en infraestructura.
3. Las interfaces de repositorio DEBERIAN pertenecer a las fronteras de dominio o aplicacion segun la arquitectura del producto.
4. Los switches de provider DEBEN ser configurables.
5. Migraciones, schema bootstrap y seed data DEBEN ser explicitos y seguros por entorno.
6. Audit stamping, filtros de tenant e interceptores de consistencia DEBEN documentarse.
7. Outbox o mecanismo equivalente de despacho confiable DEBE usarse para eventos de dominio que cruzan fronteras transaccionales.

## 9. Tenancy y contexto de ejecucion

Las APIs multi-tenant DEBEN proteger aislamiento de tenant en multiples capas.

Capacidades requeridas:

- Request context accessor o frontera equivalente de contexto de ejecucion.
- Filtro de tenant en capa de aplicacion como mecanismo primario de aislamiento.
- Failsafes de infraestructura como SQL Server row-level security cuando este aprobado.
- Logging y observabilidad tenant-aware.
- Validacion de tenant en comandos y queries que acceden a datos con propietario tenant.

Los nombres de headers y claims especificos permanecen como contratos locales del producto.

## 10. Observabilidad y operaciones

Las APIs DEBEN emitir telemetria util operacionalmente.

Capacidades requeridas:

1. Logging estructurado de request.
2. Propagacion de correlation ID.
3. Identificadores de trace y span donde distributed tracing este habilitado.
4. Health endpoints de liveness y readiness.
5. Metricas y trazas via OpenTelemetry o equivalente aprobado.
6. Identificadores de error seguros para usuario.
7. Reduccion de ruido para logs de health checks.

## 11. Resiliencia y confiabilidad

Las APIs DEBERIAN incluir controles de confiabilidad proporcionales al riesgo.

Controles recomendados:

- Rate limiting por tenant, usuario, API key o fallback por IP.
- Politicas de retry y circuit breaker alrededor de infraestructura transitoria.
- Idempotencia para operaciones mutantes que pueden reintentarse.
- Revocacion de tokens o invalidacion de sesion equivalente cuando autenticacion lo soporte.
- Background workers para outbox y persistencia de auditoria.
- Readiness checks que incluyan dependencias criticas y salud de backlog.

## 12. Seguridad y secretos

Reglas:

1. Las fuentes de secretos DEBEN ser explicitas y conscientes del entorno.
2. User secrets se permiten solo en desarrollo.
3. Managed identity o equivalente DEBERIA preferirse para secret stores cloud.
4. La autenticacion DEBE ser explicita y configurable.
5. La autenticacion de desarrollo NUNCA DEBE estar habilitada en produccion.
6. Las definiciones de seguridad Swagger NO DEBEN implicar bypasses productivos.
7. Security headers y CORS DEBEN configurarse centralmente.

## 13. Documentacion y quality gates

Documentacion minima:

- Estandar API o referencia aplicada.
- Mapa de superficie API.
- Provider de persistencia y estrategia de schema.
- Modelo de tenancy.
- Modelo de observabilidad y health checks.
- Desviaciones locales respecto a Evolith.

Gates minimos:

- Build.
- Tests unitarios para logica de dominio y aplicacion.
- Tests de integracion para comportamiento API y persistencia.
- Validacion de contratos OpenAPI o GraphQL donde aplique.
- Checks de arquitectura para fronteras de capas cuando sea factible.

## 14. Camino de promocion desde producto hacia Evolith

Una practica API de producto puede promoverse solo cuando cumple todas las condiciones:

1. Es reutilizable en mas de un contexto de producto.
2. No esta acoplada a lenguaje de dominio, rutas, headers o seed data del producto.
3. Tiene evidencia de implementacion o revision.
4. Esta documentada en Evolith como estandar, ADR o patron canonico.
5. Los ejemplos de producto permanecen como ejemplos, no como autoridad.

## 15. Mapeo obligatorio de referencia aplicada

Todo producto que aplique este estandar DEBERIA mantener un documento de mapeo con:

| Topico Evolith | Artefacto de producto | Clasificacion |
|---|---|---|
| Bootstrap de host | Program o archivo host del producto | Evidencia aplicada |
| Composicion de servicios | Bootstrapper o modulo DI del producto | Evidencia aplicada |
| Superficie API | Mapeo de rutas REST y GraphQL | Evidencia aplicada |
| Persistencia | DbContext, repositorios, migraciones, configuracion provider | Implementacion local |
| Tenancy | Request context, filtros de tenant, validacion de tenant | Evidencia aplicada con contratos locales |
| Observabilidad | Logging, tracing, health, metricas | Evidencia aplicada |
| Desviaciones | ADRs locales o decisiones locales | Deben justificarse |

---
[Volver al portal del estandar API](./README.es.md)
