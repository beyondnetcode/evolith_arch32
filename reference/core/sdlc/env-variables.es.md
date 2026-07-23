# Evolith Core — Variables de Entorno de Referencia

> **Navegación Bilingüe:** [English Version](./env-variables-reference.md)

**Estado:** Referencia Activa
**Responsable:** Evolith Architecture Board
**Creado:** 2026-07-23
**Última Actualización:** 2026-07-23

Este documento cataloga **todas las variables de entorno** de todos los servicios de Evolith. Cada variable lee de `process.env` con un default sensato, permitiendo a los operadores ajustar el comportamiento por entorno sin redeploy.

**Patrón:** `process.env.VAR ?? defaultValue` (o `||` para fallbacks numéricos)

---

*Documento complementario a [env-variables-reference.md](./env-variables-reference.md). Las secciones de servicios se mantienen en inglés por consistencia técnica.*
