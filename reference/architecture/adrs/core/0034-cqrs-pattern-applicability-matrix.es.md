# [ADR 0034](0034-cqrs-pattern-applicability-matrix.md): Matriz de Aplicación del Patrón CQRS

## Estado
Aprobado

## Fecha
2026-05-11

## Contexto
Implementar la **Segregación de Responsabilidad de Comando y Consulta (CQRS)** introduce complejidad arquitectónica debido a la separación de los modelos de datos, rutas de código distintas y mecánicas de consistencia eventual. Aplicar CQRS completo ciegamente a cada entidad simple da como resultado una sobrecarga masiva innecesaria. Requerimos reglas rígidas de gobernanza corporativa que definan CUíNDO debe implementarse este patrón.

## Decisión
Adoptar la siguiente **Matriz de Evaluación** para determinar si un Caso de Uso específico requiere la imposición de CQRS Completo:

### Nivel 1: Ruta Estándar (No se requiere CQRS)
* **Criterios**: Operaciones CRUD básicas, cambios de estado simples, acceso concurrente de bajo a medio.
* **Enfoque**: Lógica de modelo único utilizando la implementación del Repositorio Hexagonal leyendo y escribiendo en la misma Entidad de Dominio.

### Nivel 2: Agregación de Modelo de Lectura (CQRS a nivel de BFF)
* **Criterios**: Los modelos de dominio deben combinarse, unirse o refiltrarse para Vistas de UI especializadas.
* **Enfoque**: El BFF crea "Proyecciones de Solo Lectura" especializadas de los datos utilizando SQL optimizado, mientras mantiene los comandos dirigidos al repositorio core.

### Nivel 3: Imposición de CQRS Completo (Obligatorio)
Mandar la separación completa de código/lógica física ÚNICAMENTE si se cumplen al menos **DOS** de las siguientes condiciones:
1. **Asimetría de Volumen**: La relación entre las consultas de Lectura y las actualizaciones de Escritura excede **100:1**.
2. **Alta Contienda**: Las lecturas analíticas pesadas perturban el rendimiento de las transacciones y bloquean filas, requiriendo una "Proyección de Réplica de Lectura" separada.
3. **Proyecciones de Vista Complejas**: Existen múltiples vistas distintas de los mismos datos que no pueden ser derivadas matemáticamente del Agregado de Dominio central sin una pesada sobrecarga de cómputo.
4. **Reconstrucción de Estado**: La lógica de auditoría de negocio requiere almacenar el flujo del historial (prerrequisito de Event Sourcing).

## Consecuencias

### Positivas
- Defiende contra la sobre-ingeniería en dominios simples.
- Dirige los recursos a construir CQRS ÚNICAMENTE para zonas de contienda de alto rendimiento.
- Asegura una clara segregación de las preocupaciones de escalado.

### Negativas
- Los equipos requieren capacitación para diferenciar entre el Nivel 2 (Agregación de Lectura en BFF) y el Nivel 3 (CQRS Completo).

## Referencias
- [Patrón CQRS (Martin Fowler)](https://martinfowler.com/bliki/CQRS.html)
- [ADR-0002: Arquitectura Hexagonal Limpia](../../adrs/nodejs/0002-clean-architecture-nestjs.md)

---
[Volver al Índice](./README.es.md)
