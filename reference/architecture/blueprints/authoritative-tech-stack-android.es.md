# Stack Tecnológico Autorizado: Ecosistema Android & Kotlin

> **Navegación Bilingüe:** [English Version](./authoritative-tech-stack-android.es.md)

**Tipo de Documento:** Apéndice de Runtime 
**Prerrequisito:** DEBE leerse después de la **[Línea Base Agnóstica](./authoritative-tech-stack-agnostic.es.md)**. 

---

## 1. Matriz de Cumplimiento Ejecutiva (Mandatos para Proveedores)

| Categoría | Herramienta / Framework Aprobado | Versión Validada | ¿ADR Requerido para Cambiar? | Alternativas Explícitamente Rechazadas |
| :--- | :--- | :--- | :--- | :--- |
| **Runtime Base** | **Kotlin JVM** | 1.9+ | **Sí** | Java (Android Nativo) |
| **Framework UI** | **Jetpack Compose** | última | **Sí** | XML Views / DataBinding |
| **DB Local** | **Room** | 2.6.x+ | **NO** | Realm, SQLite Raw |
| **Async / Streams**| **Kotlin Coroutines + Flow** | última | **Sí** | RxJava 2/3 |

---
-> Volver al **[índice Maestro Global](../../../MASTER_INDEX.es.md)**

---
[Volver al Índice](./README.md)
