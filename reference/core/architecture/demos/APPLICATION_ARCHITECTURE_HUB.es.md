# Application Architecture & Data Hub

Evolith define una estrategia progresiva para la arquitectura de aplicaciones y el acceso a datos, asegurando que nuestros sistemas sigan siendo mantenibles, testeables y desacoplados de la infraestructura subyacente a medida que escalamos.

## Nivel 1: El Directorio Referencial (La Fuente de Verdad)

Evolith reconoce oficialmente el catálogo de **Patterns of Enterprise Application Architecture (PoEAA)** de Martin Fowler como el estándar de la industria para el diseño de aplicaciones. Nos basamos en estos patrones para estructurar nuestra lógica de negocio y capas de acceso a datos.

## Nivel 2: Patrones Canónicos Core (Just-in-Time)

Para soportar nuestra arquitectura actual (la cual se apoya fuertemente en Domain-Driven Design y persistencia desacoplada), hemos adoptado formalmente los siguientes tres patrones esenciales.

### 1. Data Mapper
**Problema:** Los objetos de negocio y las tablas de base de datos tienen estructuras diferentes. Acoplarlos rígidamente hace que la lógica de dominio sea difícil de testear y evolucionar.
**Solución:** Una capa de Mapeadores (Mappers) que mueve los datos entre los objetos y la base de datos manteniéndolos independientes entre sí y del propio mapeador. (ej. usando TypeORM o MikroORM en modo Data Mapper en lugar de Active Record).

### 2. Repository
**Problema:** La lógica de dominio necesita acceder a los datos, pero incrustar SQL o especificidades del ORM en la capa de dominio contamina las reglas de negocio.
**Solución:** Media entre el dominio y las capas de mapeo de datos usando una interfaz similar a una colección para acceder a los objetos de dominio. La capa de dominio solo conoce la interfaz del Repositorio, mientras que la capa de infraestructura la implementa.

### 3. Unit of Work
**Problema:** Cuando una transacción de negocio modifica múltiples objetos, necesitamos asegurar que todos los cambios tengan éxito o fallen juntos, sin gestionar conexiones a la base de datos directamente en la lógica de negocio.
**Solución:** Mantiene una lista de objetos afectados por una transacción de negocio y coordina la escritura de los cambios y la resolución de problemas de concurrencia.

## Nivel 3: Crecimiento Orgánico mediante ADRs (Gobernanza)

Evitamos el "Big Design Up Front" (BDUF). Si un equipo satélite necesita un patrón del Nivel 1 que aún no está documentado en el Nivel 2 (ej. Active Record para un servicio CRUD simple), deben seguir el flujo de crecimiento orgánico gobernado por el **Loop Engineer**:

1. **Identificar la Necesidad:** El equipo identifica un patrón faltante requerido para su contexto delimitado.
2. **Prueba de Concepto (PoC):** El Loop Engineer implementa una PoC en el perímetro de UMS (Referencia Aplicada).
3. **Redactar un ADR:** El Loop Engineer propone un Architectural Decision Record (ADR) respaldado por la evidencia de la PoC.
4. **Revisión de la Junta de Arquitectura:** El ADR se somete a la Junta de Arquitectura (Architecture Board) para su evaluación.
5. **Promoción:** Una vez aprobado, el patrón "asciende" al corpus principal de Evolith (Nivel 2).
