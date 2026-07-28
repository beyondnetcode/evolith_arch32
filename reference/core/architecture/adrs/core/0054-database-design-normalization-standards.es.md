# ADR-0054: Estándares de diseño y normalización de bases de datos

## 1. Metadatos
* **ID del ADR:** 0054
* **Título:** Estándares de diseño y normalización de bases de datos
* **Estado:** Aceptado
* **Autores:** Enterprise Architecture Office
* **Revisores:** Comité Corporativo de Arquitectura, Oficina del CTO
* **Fecha:** 2026-05-14
* **Etiquetas:** `Database`, `Design`, `Normalization`, `SQL`, `NoSQL`, `Best-Practices`
* **ADR relacionados:**
  * [ADR-0031: Aislamiento de esquema por contexto](./0031-schema-per-context-domain-event-catalog.es.md)
  * [ADR-0051: Estrategia corporativa de motores de base de datos](./0051-enterprise-database-engine-strategy.es.md)

---

## Resumen ejecutivo
Los datos son el activo más valioso y más permanente de la empresa. Mientras que el código de aplicación se refactoriza con frecuencia, los esquemas de base de datos suelen sobrevivir durante años. Este ADR establece los estándares obligatorios de diseño y normalización, tanto para motores relacionales (SQL) como no relacionales (NoSQL), con el fin de garantizar la integridad de los datos, minimizar la redundancia y optimizar el rendimiento en toda la malla políglota.

---

## 2. Contexto del problema
Los patrones de modelado inconsistentes entre los distintos equipos han provocado:
1. **Anomalías de datos:** anomalías de actualización, inserción y borrado por una normalización deficiente en SQL.
2. **Degradación del rendimiento:** documentos sobredimensionados y arreglos infinitos en NoSQL (MongoDB).
3. **Fricción de gobernanza:** dificultad para entender e integrar datos entre contextos acotados, por nomenclatura y estructura no estándar.
4. **Selección inadecuada del motor:** usar SQL para datos no estructurados, o NoSQL para grafos relacionales complejos.

---

## 3. Decisión
Establecemos un estándar de modelado de doble vía, según la naturaleza del motor de persistencia.

### 3.1 Diseño relacional (SQL Server / PostgreSQL)
Todos los modelos relacionales DEBEN cumplir la **tercera forma normal (3FN)** como línea base por defecto.

* **1FN (valores atómicos):** cada columna debe contener valores atómicos; sin grupos repetidos ni arreglos dentro de una celda.
* **2FN (dependencia funcional):** debe estar en 1FN y todos los atributos que no son clave deben depender por completo de la clave primaria.
* **3FN (dependencia transitiva):** debe estar en 2FN y ningún atributo que no sea clave debe depender de otro atributo que tampoco lo sea.
* **Desnormalización pragmática:** solo se permite para vistas analíticas con lectura intensiva o para cuellos de botella de rendimiento demostrados, y siempre gobernada por un ADR.
* **Integridad:** el uso estricto de claves foráneas (FK), restricciones Not-Null e índices únicos es OBLIGATORIO.

### 3.2 Diseño no relacional (MongoDB)
El modelado DEBE seguir patrones de **Design-for-Access** en lugar de la normalización.

* **Embebido (atomicidad):** conviene embeber los datos que siempre se leen juntos y que tienen una relación 1 a 1 o 1 a N pequeña.
* **Referencia (escalado):** hay que usar referencias para relaciones 1 a N grandes (más de 1000 subelementos) o cuando el dato se comparte entre varias entidades.
* **Advertencia de antipatrón:** queda estrictamente PROHIBIDO usar "arreglos infinitos" (arreglos que crecen sin límite). En su lugar se usa el "Bucket Pattern" o una referencia.

### 3.3 Convenciones de nomenclatura
| Componente | .NET / SQL Server | Node.js / Postgres / Mongo |
| :--- | :--- | :--- |
| **Tablas / colecciones** | PascalCase (p. ej., `UserProfiles`) | snake_case (p. ej., `user_profiles`) |
| **Columnas / campos** | PascalCase (p. ej., `FirstName`) | snake_case (p. ej., `first_name`) |
| **Claves primarias** | `Id` | `id` (o `_id` en Mongo) |

---

## 4. Matriz de decisión: SQL frente a NoSQL
| Factor | A favor de SQL | A favor de NoSQL |
| :--- | :--- | :--- |
| **Esquema** | Rígido, predefinido. | Flexible, dinámico. |
| **Transacciones** | Se exige ACID fuerte. | Se acepta consistencia eventual. |
| **Relaciones** | Joins complejos entre muchas tablas. | Los datos son jerárquicos o aislados. |
| **Escalado** | Vertical (por lo general). | Horizontal (sharding). |
| **Velocidad de datos** | Moderada. | Alta (escritura intensiva). |

---

## 5. Consecuencias

### Positivas:
* **Consistencia:** un lenguaje universal de modelado de datos para toda la organización.
* **Integridad:** menor riesgo de corrupción de datos o de registros huérfanos.
* **Predictibilidad:** el rendimiento de la base de datos es más fácil de ajustar cuando las estructuras están estandarizadas.

### Negativas:
* **Esfuerzo de diseño:** exige más reflexión inicial que el desarrollo ad hoc "sin esquema".
* **Complejidad:** mantener la 3FN puede derivar en más joins, lo que obliga a estrategias de indexación eficientes.

---

## Conclusión estratégica
Una base de datos bien diseñada es el cimiento de un sistema resiliente. Al imponer la 3FN para los datos relacionales y los patrones optimizados por acceso en NoSQL, aseguramos que nuestros datos sigan siendo un activo estratégico y no un pasivo de deuda técnica.




## Objetivo y Alcance

Backfill histórico: abordar la tensión arquitectónica en la que el contexto no está disponible, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Estándares de diseño y normalización de bases de datos
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como la mantenibilidad y la confiabilidad).

## Decisiones y Estándares Relacionados

Ninguna explícitamente enlazada.

---
[Volver al índice](../../../control-center/taxonomy/MASTER_INDEX.es.md)
> **Agent Signature:** Architect Agent
