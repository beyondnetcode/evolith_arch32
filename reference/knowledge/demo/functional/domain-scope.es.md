# Alcance del Dominio Funcional - Aplicación Sandbox To-Do

## 1. Alcance de la Demostración
La aplicación To-Do provee gestión atómica de tareas con alcance a usuarios aislados, utilizada exclusivamente para validar físicamente los patrones arquitectónicos subyacentes.

### A. Simulación SaaS Multi-Tenant
- Aislamiento absoluto de datos usando esquemas de base de datos compartidos delimitados por **Row-Level Security (RLS)** de PostgreSQL.
- Enrutamiento multicanal a través de **BFF Gateways** dedicados para proteger el núcleo interno.

### B. Autenticación de Usuarios y Propiedad
- Soporte para inicio de sesión básico vía email/contraseña.
- Retorno de JWTs firmados para autorización.
- Asociación relacional estricta: los usuarios solo ven las tareas pertenecientes a su clave de base de datos específica.

### C. Dominio de Tareas Principal (CRUD)
- **Creación**: Permite la validación de títulos y descripciones.
- **Categorización**: Agrupación de tareas en carpetas/contenedores definidos de forma personalizada.
- **Etiquetado**: Asociación de múltiples palabras clave de etiqueta compartidas por tarea.
- **Filtrado**: Recuperación de listas filtradas por estado de ejecución, categoría o etiquetas aplicadas.
- **Completado**: Alternancia del estado discreto de una tarea.

### D. Observabilidad y Auditoría (Implementación)
- Seguimiento automatizado de trazas a través de las capas Controller -> Application -> Persistence.
- Generación de salida JSON estructurada para registro centralizado.
- Captura de registros de estado delta inmutables vía eventos de aplicación que registran la intención explícita del usuario.

---

## 2. Explícitamente Fuera de Alcance (Límite de la Demo)
Para evitar contaminar la arquitectura de referencia pura:
- **Colaboración en Equipo**: Las tareas no pueden compartirse entre usuarios.
- **Motores de Búsqueda Avanzada**: No se incluyen integraciones con Elasticsearch.
- **Tareas Recurrentes**: Los bucles de recurrencia temporal están omitidos.

---
[Volver al Índice](./README.md)
