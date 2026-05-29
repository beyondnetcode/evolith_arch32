# [ADR 0018](0018-testing-pyramid-quality-gates.md): Pirámide de Pruebas y Puertas de Calidad Automatizadas

## Estado
Aprobado

## Fecha
2026-05-08

## Contexto
Sin requisitos de pruebas rígidos, la regresión gradual de la base de código convierte rápidamente monolitos mantenibles en paquetes de legado inestables. Requerimos criterios de prueba estrictos que limiten la confianza de ejecución impuesta automáticamente antes de que el código entre en los flujos de ramas objetivo.

## Decisión
Comprometerse con una jerarquía de pruebas de software estándar y el bloqueo mecánico de despliegues:

1. **Capa Unitaria (Rápida)**: Dominar el volumen total de pruebas usando ejecuciones estándar de Jest que aíslen las clases core y de aplicación puras. Las pruebas no deben ejecutar E/S o arranques de contenedores.
2. **Capa de Integración (Segura)**: Probar los adaptadores de Persistencia y Gateway contra bases de datos activas usando motores de testcontainers (ej. PostgreSQL/Redis activos en contenedores efímeros).
3. **Capa e2e (Completa)**: Desplegar rutinas `supertest` aisladas que orquesten rutas HTTP completas (Controlador -> Servicio -> Base de Datos) probando la seguridad de límites externos reales y el transporte.
4. **Puertas Binarias**: La pipeline CI niega rigurosamente el procesamiento de commits de fusión que hagan colapsar los umbrales generales de cobertura de pruebas por debajo de los mínimos corporativos establecidos (**línea base del 70%**).

## Consecuencias

### Positivas
- Protege contra cascadas de regresión a velocidad de liberación infinita.
- Fomenta la confianza de refactorización segura del desarrollador.

### Negativas
- Adición marginal de tiempo requerida durante la fase de creación de rutinas complejas.
- Requiere orquestación activa (testcontainers) para mantener la optimización de velocidad local.

## Referencias
- [ADR-0005: Puertas de Seguridad](../../adrs/core/0005-ci-cd-quality-codeql.md)

---
[Volver al Índice](./README.es.md)
