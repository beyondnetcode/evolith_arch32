# Checklist de Autoevaluación de Simplicidad - Arquitectura de Fase 1

Este documento sirve como salvaguarda contra la sobre-ingeniería prematura. Antes de aprobar una línea base de Fase 1, el arquitecto y el equipo de desarrollo deben responder afirmativamente a las siguientes preguntas para validar que no se está introduciendo carga operativa o de desarrollo innecesaria.

> **Principio Rector**: *"Cualquier complejidad que no sea estrictamente necesaria para un monolito inicial DEBE posponerse a fases posteriores."*

---

## Lista de Validación de Simplicidad

- [] **1. Comunicación Intra-Proceso**: ¿Los módulos interactúan mediante llamadas a funciones directas en el mismo hilo/proceso en lugar de invocar APIs REST/gRPC de red internas?
- [] **2. Cómputo de Despliegue Mínimo**: ¿Se ha evitado el uso de orquestadores complejos (Kubernetes, Nomad) en favor de soluciones directas (Docker Compose, App Services o una VM estándar)?
- [] **3. Inyección Asíncrona Simplificada**: ¿Se ha implementado un EventBus "In-Memory" para el desarrollo inicial, posponiendo el levantamiento de clústeres RabbitMQ/Kafka hasta el desacoplamiento real?
- [] **4. Patrones Transaccionales Simples**: ¿Se han evitado patrones distribuidos como **Saga**, **Transactional Outbox** o **CQRS**, confiando en transacciones ACID nativas de la base de datos mientras exista un solo esquema?
- [] **5. Puertos Esenciales Sin Wrappers**: ¿Se han utilizado Puertos (Contratos) y Adaptadores (Implementaciones directas) OBLIGATORIOS para proteger el dominio, evitando wrappers complejos o capas de anti-corrupción redundantes?
- [] **6. Seguridad de Red Local**: ¿Se han pospuesto los requisitos de malla de servicio mTLS o firewall interno, confiando en el aislamiento de la infraestructura del host único?
- [] **7. Observabilidad Suficiente**: ¿La telemetría se enfoca exclusivamente en logs estructurados JSON y métricas base, posponiendo el trazado distribuido complejo hasta que haya múltiples saltos de red?
- [] **8. Documentación Justo a Tiempo**: ¿Se han redactado notas de diseño y diagramas ligeros enfocados en el dominio en lugar de generar blueprints arc42 exhaustivos antes de codificar?
- [] **9. Un Solo DataStore**: ¿Toda la persistencia y estado reside en el motor Postgres/Redis base sin introducir motores especializados o bases de datos de grafos/búsqueda de forma prematura?
- [] **10. Controladores Ligeros**: ¿El API Gateway (ej. Kong) se utiliza solo para enrutamiento externo básico, sin programar lógica de negocio personalizada dentro de sus plugins?

---
 **Nota de Gobernanza**: Si más de 3 ítems en este checklist NO se cumplen, la arquitectura se considera en riesgo de Hipertrofia Prematura y debe ser revisada para su simplificación antes de iniciar la Fase de Construcción.

---
[Volver al Índice](./README.es.md)
