# Domain-Driven Design (DDD) Hub

Evolith aprovecha Domain-Driven Design (Diseño Guiado por el Dominio) para abordar la complejidad en el corazón de nuestro software. Este hub describe nuestros patrones canónicos de DDD que guían los límites y la estructura interna de nuestros microservicios y monolitos modulares.

## Nivel 1: El Directorio Referencial (La Fuente de Verdad)

Evolith reconoce oficialmente la metodología **Domain-Driven Design (DDD)** de Eric Evans como el estándar de la industria. Esto abarca tanto el diseño estratégico (límites, mapas) como el diseño táctico (bloques de construcción).

## Nivel 2: Patrones Canónicos Core (Just-in-Time)

Para soportar los límites de nuestros microservicios y monolitos modulares, hemos adoptado formalmente los siguientes tres patrones esenciales de DDD.

### 1. Bounded Context (Contexto Delimitado)
**Problema:** En una gran empresa, un solo concepto (ej. "Cliente") significa cosas diferentes en distintos departamentos (Facturación vs. Envíos). Usar un único modelo unificado conduce a un acoplamiento fuerte y confusión.
**Solución:** Definir explícitamente el contexto dentro del cual se aplica un modelo. Establecer límites explícitos en términos de organización del equipo, uso dentro de partes específicas de la aplicación y manifestaciones físicas como bases de código y esquemas de base de datos.

### 2. Aggregate & Aggregate Root (Agregado y Raíz del Agregado)
**Problema:** Los dominios complejos tienen muchos objetos interconectados. Asegurar la consistencia a través de cambios en múltiples objetos es difícil sin límites transaccionales estrictos.
**Solución:** Agrupar los objetos asociados en una sola unidad (el Agregado) para propósitos de cambios de datos. Cada Agregado tiene una entidad "Raíz" (Root). Los objetos externos solo pueden mantener referencias a la Raíz, y todos los cambios a los objetos internos deben pasar por la Raíz, garantizando el cumplimiento de los invariantes.

### 3. Domain Event (Evento de Dominio)
**Problema:** Ocurre algo significativo en un dominio a lo que otros dominios necesitan reaccionar, pero queremos evitar un acoplamiento fuerte entre estos dominios.
**Solución:** Modelar la ocurrencia como un Evento de Dominio. El agregado que experimenta el cambio publica el evento, y otros contextos delimitados (o componentes) pueden suscribirse y manejarlo asíncronamente.

## Nivel 3: Crecimiento Orgánico mediante ADRs (Gobernanza)

Evitamos el "Big Design Up Front" (BDUF). Si un equipo satélite necesita un patrón del Nivel 1 que aún no está documentado en el Nivel 2 (ej. CQRS, Event Sourcing, o Capas Anticorrupción específicas), deben seguir el flujo de crecimiento orgánico gobernado por el **Loop Engineer**:

1. **Identificar la Necesidad:** El equipo identifica un patrón faltante requerido para su contexto delimitado.
2. **Prueba de Concepto (PoC):** El Loop Engineer implementa una PoC en el perímetro de UMS (Referencia Aplicada).
3. **Redactar un ADR:** El Loop Engineer propone un Architectural Decision Record (ADR).
4. **Revisión de la Junta de Arquitectura:** El ADR se somete a la Junta de Arquitectura.
5. **Promoción:** Una vez aprobado, el patrón "asciende" al corpus principal de Evolith.
