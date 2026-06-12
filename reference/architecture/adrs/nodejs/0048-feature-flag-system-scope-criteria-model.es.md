# [ADR 0048](0048-feature-flag-system-scope-criteria-model.md): Alcance de Sistema en Feature Flags y Modelo de Criterios Estructurado

## Estado

Aceptado

## Fecha

2026-06-07

## Alcance

Pila tecnológica — Modelo de Dominio para Feature Flags (todos los satélites de Evolith)

> **Origen en satélite:** Validado originalmente en el satélite UMS (UMS ADR-0068). Promovido a línea base corporativa de Evolith.
> **Complementa:** [ADR-0017: Estrategia de Feature Flagging](../core/0017-feature-flagging-strategy.es.md), [ADR-0025: Abstracción de Proveedor de Feature Flags](../core/0025-feature-flag-provider-abstraction.es.md)

---

## Contexto

La estrategia genérica de feature flagging de Evolith (ADR-0017) y la abstracción de proveedor (ADR-0025) definen el contrato de interfaz pero no imponen el modelo de dominio interno para los feature flags. Sin una guía explícita, los repositorios satélite han implementado feature flags con dos problemas recurrentes:

1. **Sin aislamiento de sistema.** Un flag activado globalmente afecta a inquilinos o límites de sistema que no deberían estar incluidos en un despliegue específico. No existe ningún mecanismo para restringir un flag a un ámbito de sistema particular.

2. **Targeting opaco.** Las reglas de targeting expresadas como cadenas JSON de forma libre son imposibles de consultar, validar o evolucionar sin analizar payloads opacos. Agregar o eliminar una única condición de targeting requiere reemplazar todo el blob.

---

## Decisión

### 1. FeatureFlag como Aggregate Root Independiente

`FeatureFlag` debe ser un Aggregate Root en el contexto acotado de Configuración. No debe convertirse en una entidad hija de `SystemSuite`, `Tenant` u otro agregado de negocio, porque:

- Los feature flags tienen un ciclo de vida independiente (`Inactivo → Activo → Archivado`) impulsado por la gestión de releases, no por el ciclo de vida del agregado propietario.
- Incrustar flags en agregados grandes los sobrecarga, degrada el rendimiento de carga y aumenta el riesgo de conflictos de concurrencia.

### 2. Alcance de Propiedad Obligatorio

Cada `FeatureFlag` debe crearse con un identificador de ámbito de propiedad obligatorio e inmutable (p. ej., `SystemSuiteId` o equivalente específico del producto). Este ámbito:

- Se valida contra el agregado de dominio autoritativo en el momento de la creación.
- Es inmutable tras la creación — cambiar el ámbito requiere crear un nuevo flag.
- Sirve como clave de partición para la unicidad del flag: el mismo `FlagCode` puede existir en diferentes ámbitos sin conflicto.

### 3. Modelo de Criterios Estructurado

Reemplazar el JSON de targeting de forma libre con una colección de entidades poseídas y estructuradas. Cada criterio contiene:

| Campo | Propósito |
|---|---|
| `CriteriaType` | La dimensión a evaluar (p. ej., `TenantId`, `Environment`, `DateRange`, `PercentageHash`, `CustomRule`) |
| `Operator` | La comparación a aplicar (`Equals`, `NotEquals`, `In`, `Between`, `Matches`) |
| `Value` | El valor objetivo como cadena compatible con tipos o JSON |

La colección de criterios es opcional y dinámica:

- Una colección vacía significa que el flag está activo para todos los llamadores dentro del ámbito.
- Los criterios individuales pueden agregarse o eliminarse sin modificar el aggregate root.
- Cada cambio debe emitir un evento de dominio discreto.

### 4. Semántica de Evaluación

El puerto `IFeatureFlagEvaluator` evalúa los criterios usando:

- **Dentro del mismo `CriteriaType`:** los criterios se combinan con lógica **OR**.
- **Entre diferentes grupos `CriteriaType`:** los grupos se combinan con lógica **AND**.
- **Contexto ausente:** si el contexto de evaluación no proporciona los datos requeridos por un criterio, la evaluación devuelve `false` (postura segura). Esto previene la activación no intencionada cuando el contexto está parcialmente poblado.

### 5. Ubicación en el Contexto Acotado

La gestión de feature flags es una responsabilidad de configuración, no un subdominio de negocio central. Los agregados de configuración y gestión de características pertenecen a un contexto acotado `Configuration` o `SystemManagement` dedicado que referencia identificadores de otros contextos como claves foráneas, no como entidades embebidas.

---

## Justificación

- El **ciclo de vida independiente** justifica un agregado independiente, no una entidad hija.
- Los **criterios estructurados** permiten la consultabilidad, los eventos de dominio por criterio y la validación a nivel de dominio de las reglas de targeting.
- La **postura segura ante contexto ausente** previene la activación inadvertida cuando los llamadores aún no han migrado para proporcionar los campos de contexto requeridos.

---

## Consecuencias

### Positivas

- Cada feature flag tiene un ámbito de propiedad explícito y consultable alineado con el límite del sistema que controla.
- Las condiciones de targeting son individualmente dirigibles: se agregan, eliminan, consultan y auditan sin modificar las propiedades del aggregate root.
- Los eventos de dominio para cambios de criterios proporcionan un registro de auditoría granular para el cumplimiento.
- El puerto `IFeatureFlagEvaluator` mantiene la lógica de evaluación extensible y testeable de forma aislada.
- El mismo código de flag puede reutilizarse en diferentes ámbitos sin conflictos de nombres.

### Negativas / Concesiones

- Los flags ahora requieren un identificador de ámbito válido en el momento de la creación — los llamadores deben resolver la identidad del ámbito antes de emitir comandos de creación.
- El modelo de criterios estructurado introduce tablas adicionales y operaciones JOIN para lecturas completas de flags. Se recomienda una proyección de modelo de lectura para rutas de evaluación de alta frecuencia.
- Una clave foránea entre contextos entre el contexto de configuración y el contexto de ámbito autoritativo introduce un acoplamiento a nivel de persistencia. Esto es intencional para la integridad referencial.

---

## Referencias

- [ADR-0017: Estrategia de Feature Flagging](../core/0017-feature-flagging-strategy.es.md)
- [ADR-0025: Abstracción de Proveedor de Feature Flags](../core/0025-feature-flag-provider-abstraction.es.md)
- [ADR-0034: Matriz de Aplicabilidad CQRS](../core/0034-cqrs-pattern-applicability-matrix.es.md)





## Opciones Consideradas

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Decisiones y Estándares Relacionados

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Fuentes Actuales

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

---
[Volver al Índice](./README.es.md)
