# ADR-0018: Pirámide de Pruebas y Puertas de Calidad Automatizadas

## Estado
Accepted

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
- [ADR-0005: Puertas de Seguridad](../../adrs/core/0005-automated-sast-quality-gates.es.md)





## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde sin requisitos de pruebas rígidos, la regresión gradual de la base de código convierte rápidamente monolitos mantenibles en paquetes de legado inestables, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Pirámide de Pruebas y Puertas de Calidad Automatizadas
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

- [ADR-0005: Puertas de Seguridad](../../adrs/core/0005-automated-sast-quality-gates.es.md)

---
[Volver al Índice](./README.es.md)

> **Agent Signature:** Architect Agent
