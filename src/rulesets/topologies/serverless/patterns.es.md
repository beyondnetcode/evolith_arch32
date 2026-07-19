# Guía de Patrones Sin Servidor

> **Navegación Bilingüe:** [English](./patterns.md) | [Español](./patterns.es.md)

**Propietario:** Ingeniería de Plataforma
**Topología:** Sin Servidor

---

## Fan-Out / Fan-In

Usar fan-out para distribuir trabajo entre múltiples invocaciones paralelas de funciones. Agregar resultados con una función fan-in o una máquina de estados. Asegurar que cada rama paralela sea idempotente. Monitorear la latencia total del pipeline contra el presupuesto de 1500 ms.

## Funciones de Estado / Workflows

Orquestar procesos de múltiples pasos con máquinas de estados. Ninguna regla serverless gobierna las máquinas de estados — SV-R01 a SV-R04 cubren el contrato declarado, la ejecución sin estado, el tamaño del paquete y el inicio en frío, y SV-SEC-01/02 cubren seguridad; tratar esta sección como orientación, no como requisito ejecutable. Definir estados explícitos, transiciones y manejadores de errores. Persistir el estado del workflow externamente para sobrevivir reinicios de funciones. Usar workflows visuales para lógica de negocio compleja que excede una sola función.

## Filtrado de Eventos

Filtrar eventos en la fuente para reducir invocaciones innecesarias. Usar reglas de bus de eventos o suscripciones de topics para entrega selectiva. Evitar procesar eventos irrelevantes dentro de la lógica de la función. Medir la efectividad del filtrado rastreando la relación invocación-trabajo-útil.

## Composición de Funciones

Componer funciones pequeñas y de propósito único en workflows de orden superior. Mantener los límites de composición limpios: cada función posee una capacidad de dominio. Usar mensajería asíncrona para comunicación entre funciones. Evitar cadenas de llamadas síncronas profundas que aumentan la latencia y la exposición a inicios en frío.

## Backend-for-Frontend (BFF)

Implementar funciones BFF para agregar servicios backend para clientes específicos. Adaptar payloads de respuesta por frontend para reducir sobre-obtención. Mantener funciones BFF delgadas — componen, no transforman lógica de negocio. Almacenar en caché respuestas BFF para patrones con alta carga de lectura.

## Disparadores Programados

Usar disparadores basados en cron para cargas de trabajo periódicas. Alinear la granularidad del calendario con las necesidades de negocio (minuto, hora, día). Implementar lógica de relleno para calendarios perdidos. Monitorear deriva del calendario y alertar sobre invocaciones perdidas.

---

[Volver al Perfil Sin Servidor](./README.es.md)
