# [ADR 0017](0017-feature-flagging-strategy.md): Estrategia de Feature Flagging para Entrega Progresiva

## Estado
Aprobado

## Fecha
2026-05-09

## Contexto
Impulsar nuevas expansiones funcionales a producción conlleva un riesgo operativo elevado. Para rebajar los techos de riesgo, el código debe liberarse desactivado dentro de rutas de tiempo de ejecución dirigidas, desbloqueándose específicamente para clientes Alpha, datos demográficos de usuarios graduales, o clústeres enteros sin invocar re-despliegues de pipeline o migraciones de base de datos.

## Decisión
Tratar el enrutamiento dinámico de características como una **Inyección de Infraestructura** estándar, completamente disjunta de las arquitecturas de persistencia:

1. **Desacoplamiento de Servicios**: Evitar la creación de tablas físicas `toggles` en la base de datos. Utilizar planos de gestión SaaS externos autoritativos (ej. ConfigCat, Unleash, LaunchDarkly) nativamente a través de espejos locales SDK eficientes en tiempo de ejecución.
2. **Inversión Hexagonal**: Las bases de código se comunican estrictamente con interfaces abstractas locales (`IFeatureTogglePort`). Los proveedores concretos implementan módulos adaptadores ocultos que evalúan expresiones de forma segura fuera del hilo principal.
3. **Evaluadores en Tiempo de Ejecución**: Enrutar bifurcaciones dentro de los comandos del servicio utilizando verificaciones de toggle inyectadas para interruptores canarios inmediatos sin intervención (zero-touch) y rollbacks instantáneos.

## Consecuencias

### Positivas
- Permite ingeniería Trunk-Based desacoplada: las fusiones (merges) no equivalen a lanzamientos.
- Concede controles operativos instantáneos (Kill Switch) a personal no técnico fuera de los límites de CI.

### Negativas
- Acumula "Deuda Técnica" si las banderas no están programadas para su eliminación tras la estabilización.
- Introduce bifurcaciones lógicas dinámicas que inflan la complejidad ciclomática de las pruebas.

## Referencias
- [ADR-0025: Abstracción de Feature Flags](../../adrs/core/0025-feature-flag-provider-abstraction.md)
- [ADR-0024: Gestión de Configuración](../../adrs/core/0024-configuration-feature-management-platform.md)

---
[Volver al Índice](./README.es.md)
