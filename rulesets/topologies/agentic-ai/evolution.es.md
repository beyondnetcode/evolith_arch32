# Guia de Evolucion de IA Agentica

> **Navegacion bilingue:** [Version en ingles](./evolution.md)

## Principio de Evolucion

La IA agentica es transversal y no debe disolver la propiedad de bounded contexts. Mantén orquestacion, ensamblaje de prompts, aplicacion de politicas y enrutamiento de herramientas en shells transversales. Mantén comandos de negocio, invariantes y decisiones de persistencia dentro de sus bounded contexts propietarios mediante contratos de aplicacion existentes.

## Evolucion de Capacidades

Amplia una capacidad a la vez. Agregar una capacidad requiere contrato de herramienta declarado, fuentes de contexto clasificadas, revision de sandbox, diseno de autorizacion y aprobacion, validacion Native y OPA, pruebas positivas y negativas y evidencia operativa. Una capacidad mutativa nueva requiere ademas revision contra ADR-0083.

## Preparacion para Extraccion

No extraigas un servicio orientado a agentes solo porque exista un agente. Sigue los criterios de extraccion del eje progresivo: propiedad distinta, necesidad de despliegue independiente, contrato estable, observabilidad, contencion de fallos y costo operativo justificado. El servicio externo conserva el mismo gateway de herramientas, evidencia y limites de dominio.

## Retiro

Retira una capacidad revocando su delegacion, eliminando su ruta de herramienta, reteniendo su evidencia requerida segun la politica gobernante y actualizando contrato, pruebas, reglas y runbook operativo juntos. No dejes herramientas inactivas alcanzables mediante una identidad general de agente.

## Disparadores de Reevaluacion

Reevalua esta topologia cuando cambie un modelo, herramienta, fuente de contexto, limite de despliegue, clasificacion de datos o metodo de aprobacion; cuando aumente la tendencia de denegaciones o fallos de politica; o cuando un patron satelite pueda ameritar promocion a un estandar reutilizable de Evolith.

---
[Volver al Perfil de IA Agentica](./README.es.md)
