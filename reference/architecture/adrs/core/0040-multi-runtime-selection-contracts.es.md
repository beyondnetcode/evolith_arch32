# [ADR 0040](0040-multi-runtime-selection-contracts.md): Matriz de Selección de Multi-Runtime y Contratos Entre Runtimes

## 1. Estado
**Estado**: Aprobado 
**Fecha**: 2026-05-11 
**Alcance**: Gobernanza Corporativa (Obligatorio) 

---

## 2. Contexto
Para cumplir con la **Visión Corporativa Políglota**, nuestra organización autoriza múltiples runtimes de ejecución. Sin embargo, sin una política de selección clara, los equipos pueden seleccionar tecnología basándose en preferencias subjetivas en lugar de en la idoneidad del rendimiento. Además, la comunicación entre runtimes dispares requiere mecanismos explícitos para garantizar la interoperabilidad sin filtrar detalles de implementación del runtime.

---

## 3. Decisión

### A. Matriz de Selección de Runtime
Los equipos DEBEN seleccionar el runtime objetivo basándose exclusivamente en el perfil de carga de trabajo específico:

| Métrica | Runtime Objetivo | Razón Fundamental |
| :--- | :--- | :--- |
| **APIs Web, BFF, Ligado a E/S** | **Node.js / TypeScript** | Alta concurrencia de E/S, entrega rápida, amplio ecosistema comunitario. |
| **Alto Cómputo, ETL, Lotes (Batch)**| **.NET (C#)** | Rendimiento de multi-hilo superior, cómputo en bruto tipado, matemática pesada. |
| **Movilidad Operativa** | **Android (Kotlin)** | Acceso directo a periféricos de hardware (Scanners, GPS), modo offline estricto. |

### B. Regla de Comunicaciones Entre Runtimes
Se prohíbe la dependencia directa del runtime. La comunicación DEBE atravesar límites definidos explícitamente:
1. **Interoperabilidad Síncrona**: Utiliza obligatoriamente **gRPC (Protocol Buffers)** para transmisión segura de tipos y baja latencia entre Node.js y .NET.
2. **Interoperabilidad Asíncrona**: Utiliza **RabbitMQ/Kafka** con validación de contrato vía JSON-Schema o Protobuf.
3. **Registro de Contratos**: Los contratos deben almacenarse y versionarse centralmente utilizando versionado semántico. Los cambios requieren verificación de compatibilidad hacia atrás con **Pact JS/Net**.

---

## 4. Consecuencias

### Positivas
* **Costo/Rendimiento Optimizado**: Cada carga de trabajo corre en el motor más eficiente para su perfil de memoria/CPU.
* **Agnóstico al Talento**: Habilita la contratación simultánea a través de pools de TypeScript, C# y Android.

### Negativas
* **Sobrecarga de Gobernanza**: Requiere mantener plantillas estándar para 3 cadenas de herramientas distintas.

---
[Volver al Índice](./README.es.md)
