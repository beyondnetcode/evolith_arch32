# [ADR 0054](0054-estandares-diseño-normalizacion-base-datos.md): Estándares de Diseño y Normalización de Bases de Datos

## 1. Metadatos
* **ADR ID:** 0054
* **Título:** Estándares de Diseño y Normalización de Bases de Datos
* **Estado:** Aprobado
* **Autores:** Oficina de Arquitectura Empresarial
* **Revisores:** Comité de Arquitectura Corporativa, Oficina del CTO
* **Fecha:** 2026-05-14
* **Tags:** `Base de Datos`, `Diseño`, `Normalización`, `SQL`, `NoSQL`, `Mejores-Prácticas`
* **ADRs Relacionados:** 
 * [ADR-0031: Aislamiento de Esquema por Contexto](./0031-schema-per-context-domain-event-catalog.md)
 * [ADR-0051: Estrategia de Motores de Base de Datos Empresarial](./0051-estrategia-motor-base-datos-empresarial.es.md)

---

## Resumen Ejecutivo
Los datos son el activo más valioso y permanente de la empresa. Mientras que el código de la aplicación se refactoriza con frecuencia, los esquemas de base de datos a menudo persisten durante años. Este ADR establece los estándares obligatorios de diseño y normalización tanto para motores Relacionales (SQL) como No Relacionales (NoSQL) para garantizar la integridad de los datos, minimizar la redundancia y optimizar el rendimiento en toda la malla políglota.

---

## 2. Contexto del Problema
Los patrones de modelado inconsistentes entre diferentes equipos han provocado:
1. **Anomalías de Datos:** Anomalías de actualización, inserción y eliminación debido a una mala normalización en SQL.
2. **Degradación del Rendimiento:** Documentos sobredimensionados y arreglos infinitos en NoSQL (MongoDB).
3. **Fricción en el Gobierno:** Dificultad para comprender e integrar datos entre contextos delimitados debido a una nomenclatura y estructura no estándar.
4. **Selección Inadecuada del Motor:** Uso de SQL para datos no estructurados o NoSQL para grafos relacionales complejos.

---

## 3. Decisión
Establecemos un estándar de modelado de doble vía basado en la naturaleza del motor de persistencia.

### 3.1 Diseño Relacional (SQL Server / PostgreSQL)
Todos los modelos relacionales DEBEN seguir la **Tercera Forma Normal (3NF)** como línea base por defecto.

* **1NF (Valores Atómicos):** Cada columna debe contener valores atómicos; sin grupos repetitivos o arreglos dentro de una celda.
* **2NF (Dependencia Funcional):** Debe estar en 1NF y todos los atributos que no sean clave deben depender totalmente de la clave primaria.
* **3NF (Dependencia Transitiva):** Debe estar en 2NF y ningún atributo que no sea clave debe depender de otro atributo que no sea clave.
* **Desnormalización Pragmática:** Solo permitida para vistas analíticas de lectura pesada o cuellos de botella de rendimiento probados, gobernada por un ADR.
* **Integridad:** El uso estricto de Claves Foráneas (FK), restricciones Not-Null e índices únicos es OBLIGATORIO.

### 3.2 Diseño No Relacional (MongoDB)
El modelado DEBE seguir patrones de **Diseño para el Acceso** (*Design-for-Access*) en lugar de la normalización.

* **Incrustación / Embedding (Atomicidad):** Favorecer la incrustación para datos que siempre se leen juntos y tienen una relación 1-a-1 o 1-a-N pequeña.
* **Referenciación / Referencing (Escalado):** Usar referenciación para relaciones 1-a-N grandes (>1000 sub-ítems) o cuando los datos se comparten entre múltiples entidades.
* **Advertencia de Antipatrón:** Está estrictamente PROHIBIDO el uso de "Arreglos Infinitos" (arreglos que crecen sin límite). Use el "Patrón de Cubeta" (*Bucket Pattern*) o referenciación en su lugar.

### 3.3 Convenciones de Nomenclatura
| Componente | .NET / SQL Server | Node.js / Postgres / Mongo |
| :--- | :--- | :--- |
| **Tablas / Colecciones** | PascalCase (ej. `UserProfiles`) | snake_case (ej. `user_profiles`) |
| **Columnas / Campos** | PascalCase (ej. `FirstName`) | snake_case (ej. `first_name`) |
| **Claves Primarias** | `Id` | `id` (o `_id` para Mongo) |

---

## 4. Matriz de Decisión: SQL vs NoSQL
| Factor | Favorecer SQL | Favorecer NoSQL |
| :--- | :--- | :--- |
| **Esquema** | Rígido, predefinido. | Flexible, dinámico. |
| **Transacciones** | Requiere ACID fuerte. | Consistencia eventual aceptable. |
| **Relaciones** | Joins complejos entre tablas. | Datos jerárquicos o aislados. |
| **Escalado** | Vertical (tépicamente). | Horizontal (Sharding). |
| **Velocidad de Datos**| Moderada. | Alta (Escritura pesada). |

---

## 5. Consecuencias

### Positivas:
* **Consistencia:** Lenguaje universal para el modelado de datos en toda la organización.
* **Integridad:** Reducción del riesgo de corrupción de datos o registros huérfanos.
* **Predictibilidad:** El rendimiento de la base de datos es más fácil de ajustar cuando las estructuras están estandarizadas.

### Negativas:
* **Esfuerzo de Diseño:** Requiere más pensamiento inicial en comparación con el desarrollo ad-hoc "sin esquema".
* **Complejidad:** La gestión de 3NF puede llevar a más Joins, requiriendo estrategias de indexación eficientes.

---

## Conclusión Estratégica
Una base de datos bien diseñada es el cimiento de un sistema resiliente. Al imponer 3NF para datos relacionales y patrones optimizados para el acceso en NoSQL, aseguramos que nuestros datos sigan siendo un activo estratégico en lugar de una responsabilidad de deuda técnica.

---
[Volver al Índice](../../../../MASTER_INDEX.es.md)
