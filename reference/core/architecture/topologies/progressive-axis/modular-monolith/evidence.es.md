# Guía de Evidencia del Monolito Modular

> **Navegación Bilingüe:** [English](./evidence.md) | [Español](./evidence.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Monolito Modular

---

## Comandos de Validación

La validación automatizada asegura que el monolito modular cumple con sus restricciones arquitectónicas. Ejecutar estos comandos en CI y durante la revisión de código.

```bash
# Validar cumplimiento de límites de módulo
npm run validate:module-boundaries

# Verificar violaciones de acceso a base de datos entre módulos
npm run lint:cross-module-access

# Verificar aislamiento de esquema por dominio
npm run validate:schema-isolation

# Ejecutar evaluación de preparación para extracción
npm run metrics:extraction-readiness

# Validar cumplimiento de contratos de API
npm run validate:api-contracts
```

**Integración en CI:** Todos los comandos de validación deben pasar antes de la fusión. Las violaciones se tratan como fallas de compilación.

## Métricas de Acoplamiento

Rastrear el acoplamiento entre módulos para asegurar que los límites de aislamiento se mantengan intactos.

| Métrica | Objetivo | Medición |
|---------|----------|----------|
| Acoplamiento aferente (Ca) | <= 5 por módulo | Número de módulos que dependen de este módulo |
| Acoplamiento eferente (Ce) | <= 8 por módulo | Número de módulos de los que este módulo depende |
| Inestabilidad (I) | 0.0 - 0.5 | Ce / (Ca + Ce); menor = más estable |
| Abstracción (A) | 0.5 - 1.0 | Clases abstractas / clases totales |

**Alertas:** Las métricas de acoplamiento de módulo que exceden los umbrales activan una revisión de arquitectura.

**Seguimiento de tendencias de acoplamiento:** Las métricas se capturan mensualmente; la regresión en puntuaciones de acoplamiento bloquea la extracción de módulos.

## Cumplimiento de Límites

Verificar que los límites de los módulos se respetan en código, datos y comportamiento en tiempo de ejecución.

- **Límites de código:** Sin importaciones directas a través de límites de módulos; solo a través de interfaces publicadas
- **Límites de datos:** Sin consultas de base de datos entre módulos; verificadas por escaneos automatizados
- **Límites en tiempo de ejecución:** Sin estado mutable compartido entre módulos; verificado por análisis estático
- **Límites de API:** Todas las llamadas entre módulos usan contratos versionados y documentados

**Puntuación de cumplimiento:** Cada módulo mantiene una puntuación de cumplimiento de límites. Objetivo: >= 95% de cumplimiento en todas las dimensiones.

**Manejo de violaciones:** Las violaciones se registran, categorizan por severidad y se rastrean hasta la resolución. Las violaciones críticas bloquean versiones.

## Seguimiento de Preparación para Extracción

Las puntuaciones de preparación se rastrean por módulo a lo largo del tiempo para identificar tendencias y candidatos de extracción.

```
Módulo: order-management
  Puntuación actual: 78% (↑ desde 72% el mes pasado)
  Dimensiones:
    Limpieza de interfaces: 85% (↑)
    Independencia de base de datos: 90% (→)
    Sin estado compartido: 100% (→)
    Emisión de eventos: 65% (↑)
    Cobertura de pruebas: 82% (↑)
  Estado: En camino para candidatura de extracción en Q2
```

**Reportes:** Los reportes mensuales de preparación se generan automáticamente; se comparten con la Junta de Arquitectura y los equipos de módulos.

**Datos históricos:** Las puntuaciones de preparación se retienen durante 12 meses para respaldar el análisis de tendencias y la planificación de extracción.

---

[Volver al Perfil de Monolito Modular](./README.es.md)
