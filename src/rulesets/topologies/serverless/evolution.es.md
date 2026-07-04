# Guía de Evolución Sin Servidor

> **Navegación Bilingüe:** [English](./evolution.md) | [Español](./evolution.es.md)

**Propietario:** Ingeniería de Plataforma
**Topología:** Sin Servidor

---

## Migración de Contenedores a Funciones

Migrar cargas de trabajo contenedorizadas a funciones descomponiendo manejadores monolíticos en funciones discretas y de propósito único. Identificar primero las rutas ligadas a I/O — se benefician más de la concurrencia sin servidor. Mantener tareas síncronas y de larga ejecución en contenedores. Usar patrones strangler-fig para migrar incrementalmente.

## Evolución de la Gestión de Estado

Transitar de estado local a almacenes externos gestionados al adoptar serverless. Implementar estado de sesión en bases de datos o cachés, no en memoria de funciones. Migrar estado de sistema de archivos a almacenamiento de objetos. Auditar patrones de gestión de estado después de cada transición de topología.

## Sin Servidor vs Contenedores

Elegir serverless para cargas de trabajo orientadas a eventos, esporádicas o con picos. Elegir contenedores para cargas sostenidas, de alto rendimiento o críticas en latencia que excedan los presupuestos serverless. Usar topologías híbridas donde serverless maneja la ingesta y contenedores el procesamiento. Documentar compensaciones explícitamente por carga de trabajo.

## Organización de Funciones

Organizar funciones por contexto acotado, no por capa técnica. Agrupar funciones relacionadas en unidades de despliegue con infraestructura compartida. Mantener un catálogo de funciones con metadatos de propiedad, SLA y costo. Evitar un único espacio de nombres plano para todas las funciones.

## Neutralidad con el Proveedor (ADR-0095)

Diseñar interfaces de funciones para ser portables entre proveedores de nube. Abstract los formatos de eventos específicos del proveedor detrás de esquemas internos. Usar runtimes y herramientas de código abierto donde sea posible. Aceptar optimizaciones específicas del proveedor como decisiones deliberadas y documentadas — nunca acoplamientos accidentales.

## Transiciones de Topología

Seguir la ruta de arquitectura progresiva: monolito simple → monolito modular → módulos distribuidos → serverless. Validar criterios de preparación antes de cada transición. Revertir si la carga operativa excede el valor del producto. Tratar la topología como una decisión de producto, no una preferencia de ingeniería.

---

[Volver al Perfil Sin Servidor](./README.es.md)
