# [ADR 0075](0075-application-gateway-bff-nestjs.es.md): Gateway de Aplicación (BFF) con NestJS

## Estado
Accepted

## Fecha
2026-06-12

## Contexto y Problema
El [Core ADR-0030: Modelo de Gateway Distribuido de Dos Capas](../core/0030-two-tier-distributed-gateway-model.es.md) exige un Gateway de Aplicación de Capa 2 desplegado dentro del clúster seguro. Este gateway debe ser capaz de componer respuestas de datos heterogéneos, eliminar PII, adaptar cargas útiles de dispositivos y gestionar la mecánica de cookies del usuario para el ecosistema Node.js.

## Objetivo y Alcance
Seleccionar el runtime y framework específico para implementar el Gateway de Aplicación de Capa 2 (BFF) para la plataforma Node.js.

## Opciones Consideradas
- **Seleccionada:** NestJS BFF
- **Otras:** Express.js (rechazada debido a la falta de estructura arquitectónica), Apollo Federation (rechazada ya que fuerza GraphQL en todas partes, mientras que necesitamos flexibilidad REST/gRPC).

## Decisión y Justificación
Adoptar **NestJS** como el framework del Gateway de Aplicación (BFF).
NestJS proporciona un contenedor de inyección de dependencias robusto, soporte nativo gRPC y REST, y modularidad forzada. Se despliega de forma segura detrás del Edge Gateway de Capa 1.

## Evidencias y Criterios de Evaluación
NestJS se alinea con el [Node.js ADR-0002: Arquitectura Hexagonal Limpia](./0002-clean-architecture-nestjs.es.md). Soporta nativamente tanto clientes asíncronos de microservicios (para comunicación con el backend) como lógica de controladores robusta (para consumo desde el frontend).

## Consecuencias, Riesgos y Trade-offs

### Positivas
- Tipado estricto y límites arquitectónicos evitan que el BFF se convierta en una "gran bola de lodo".
- Integración perfecta con el ecosistema monorepo existente de Node.js.

### Negativas
- Curva de aprendizaje más pronunciada en comparación con aplicaciones Express simples.

## Vigilancia Tecnológica (Technology Watch)
- **Dirección del Mercado:** NestJS sigue siendo el estándar para aplicaciones Node.js empresariales.
- **Etapa de Madurez:** Madura.
- **Gatillo de Revisión (Review Trigger):** Reevaluar si el ecosistema Node.js cambia hacia un framework estándar de mayor rendimiento para orquestación BFF.

## Fuentes Actuales
- [Documentación de NestJS](https://docs.nestjs.com/) (Consultada 2026-06-12)

## Referencias
- [Documentación de NestJS](https://docs.nestjs.com/)

## Decisiones y Estándares Relacionados
- [Core ADR-0030: Modelo de Gateway Distribuido de Dos Capas](../core/0030-two-tier-distributed-gateway-model.es.md)
- [Node.js ADR-0002: Arquitectura Hexagonal Limpia](./0002-clean-architecture-nestjs.es.md)

---
[Volver al Índice](./README.es.md)
