# [ADR 0046](0046-no-raw-identifiers-in-ui.md): Prohibición de Identificadores Técnicos en Interfaces de Usuario

## Estado

Aceptado

## Fecha

2026-06-07

## Alcance

Universal — Frontend (todos los satélites de Evolith)

> **Origen en satélite:** Validado originalmente en el satélite UMS (UMS ADR-0065). Promovido a línea base corporativa de Evolith como regla universal de UX y DDD.

---

## Contexto y Enunciado del Problema

En arquitecturas distribuidas, los identificadores técnicos (UUID, GUID, claves sustitutas, IDs de fila de base de datos) se utilizan extensamente para identidad, referencias de clave foránea y enrutamiento. Sin una regla explícita, los desarrolladores exponen inadvertidamente estos identificadores técnicos en vistas de interfaz, tablas de datos y paneles de detalle.

Esta práctica:

- Degrada la experiencia del usuario — los UUID en bruto como `550e8400-e29b-41d4-a716-446655440000` carecen de significado semántico para los usuarios finales.
- Viola el Lenguaje Ubicuo de DDD — los conceptos de negocio (nombre de usuario, código de documento, etiqueta de rol) deben ser la representación visible, no las claves de base de datos.
- Crea la impresión de un prototipo técnico inacabado en lugar de un producto pulido.
- Puede facilitar la enumeración o reconocimiento (preocupación de defensa en profundidad incluso cuando los UUID no son secuenciales).

---

## Decisión

**Los identificadores técnicos en bruto (UUID, GUID, claves sustitutas, IDs internos de base de datos) no deben renderizarse directamente en una interfaz orientada al usuario, a menos que un requisito de negocio específico y justificado lo exija explícitamente.**

### Directrices de Implementación

1. **Representación semántica.** Cualquier identificador técnico debe mapearse a una etiqueta legible por humanos — un alias, nombre de rol, nombre de usuario, correo electrónico, código de documento o código corto amigable para el negocio — antes de renderizarlo.
2. **Uso solo interno.** Los identificadores técnicos se usan internamente para solicitudes de API, parámetros de enrutamiento de URL, claves de gestión de estado y procesamiento de payloads. No aparecen en columnas de tablas visibles, etiquetas, títulos ni paneles de detalle.
3. **Mecanismos de respaldo.** Si una etiqueta amigable no está disponible en el momento del renderizado, el sistema debe mostrar un respaldo genérico y localizado (p. ej., "Usuario", "Registro", "Desconocido") en lugar del identificador en bruto.
4. **Cumplimiento en revisión de código.** Los pull requests que rendericen identificadores técnicos en bruto en la capa de presentación sin una excepción documentada explícita deben ser rechazados durante la revisión de código.
5. **Excepciones.** Un requisito de negocio que necesite explícitamente el identificador visible (p. ej., un panel de soporte u operaciones que muestre un ID técnico de seguimiento) debe estar documentado y aprobado.

---

## Consecuencias

### Positivas

- Mejora significativa en la profesionalidad del sistema y la experiencia del usuario.
- Refuerza la alineación con el Lenguaje Ubicuo del Diseño Orientado al Dominio — los usuarios ven conceptos de negocio, no internos de base de datos.
- Reduce el ruido de soporte generado por usuarios confundidos por datos técnicos.
- Defensa en profundidad: ofuscar los formatos de clave interna reduce la superficie de enumeración.

### Negativas / Concesiones

- Requiere mapeos adicionales de frontend o backend para obtener etiquetas semánticas de entidades relacionadas en lugar de pasar solo claves foráneas.
- Los desarrolladores deben manejar casos límite donde los datos semánticos aún no están disponibles en el contexto de vista actual (estados de carga, etiquetas de respaldo).

---

## Referencias

- [ADR-0044: Límites de Capas — Arquitectura Limpia en Frontend](./0044-frontend-clean-architecture-layer-boundaries.es.md)
- [ADR-0049: Semántica de Nomenclatura y Política de Código Limpio](../core/0049-naming-semantics-clean-code-policy.es.md)






## Opciones Consideradas

- **Seleccionada:** Prohibición de Identificadores Técnicos en Interfaces de Usuario
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

- [ADR-0044: Límites de Capas — Arquitectura Limpia en Frontend](./0044-frontend-clean-architecture-layer-boundaries.es.md)
- [ADR-0049: Semántica de Nomenclatura y Política de Código Limpio](../core/0049-naming-semantics-clean-code-policy.es.md)

## Vigilancia Tecnológica (Tendencias, Madurez, Adopción, Soporte)

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-reference-catalog.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Fuentes Actuales

Desconocido (registro histórico).

---
[Volver al Índice](./README.es.md)
