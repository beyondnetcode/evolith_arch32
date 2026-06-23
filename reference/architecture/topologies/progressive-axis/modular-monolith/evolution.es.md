# Guía de Evolución del Monolito Modular

> **Navegación Bilingüe:** [English](./evolution.md) | [Español](./evolution.es.md)

**Propietario:** Junta de Arquitectura
**Topología:** Monolito Modular

---

## Camino de F1 a F2

El monolito modular (F1) está diseñado como un trampolín hacia servicios distribuidos (F2). La evolución es deliberada, no accidental. El camino de F1 a F2 sigue un proceso de extracción estructurado.

- **Estado F1:** Despliegue único, aislamiento de módulos mediante interfaces, infraestructura compartida
- **Estado F2:** Servicios extraídos con despliegue independiente, infraestructura dedicada por servicio
- **Transición:** Extracción módulo por módulo basada en puntuaciones de preparación y justificación de negocio

**Puerta de decisión:** La Junta de Arquitectura debe aprobar cada extracción de módulo. Ningún módulo se mueve a F2 sin aprobación explícita.

## Preparación para Extracción (ADR-0045)

Cada módulo debe alcanzar una puntuación mínima de preparación para extracción antes de que se considere la extracción. La puntuación se calcula a partir de múltiples dimensiones.

**Dimensiones de preparación (ADR-0045):**

| Dimensión | Peso | Umbral |
|-----------|------|--------|
| Limpieza de interfaces | 25% | >= 80% |
| Independencia de base de datos | 25% | >= 90% |
| Sin estado compartido | 20% | 100% |
| Cobertura de emisión de eventos | 15% | >= 70% |
| Cobertura de pruebas | 15% | >= 80% |

**Puntuación mínima general:** >= 70% requerido para candidatura de extracción

**Frecuencia de medición:** Las puntuaciones de preparación se recalculan mensualmente; se rastrean tendencias a lo largo del tiempo

## Criterios de Extracción

Un módulo es elegible para extracción cuando cumple con todos los siguientes criterios.

1. **Puntuación de preparación >= 70%** durante 3 meses consecutivos
2. **Justificación de negocio** — razón operativa o de escalabilidad clara para la extracción
3. **Preparación del equipo** — equipo dedicado capaz de operar el servicio extraído
4. **Preparación de infraestructura** — infraestructura dedicada provisionada y probada
5. **Plan de migración** — plan documentado para migración de datos, corte de tráfico y reversión

**Criterios de exclusión:**
- El módulo tiene menos de 3 consumidores
- El módulo comparte estado con más de 2 otros módulos
- El módulo carece de emisión de eventos para eventos de dominio

## Evolución Progresiva (ADR-0047)

La extracción sigue un patrón progresivo y reversible. Ningún módulo se extrae en un solo paso.

- **Fase 1 — Modo sombra:** El nuevo servicio se ejecuta junto al monolito; el tráfico se refleja, no se cambia
- **Fase 2 — Escritura dual:** Tanto el monolito como el servicio reciben escrituras; se verifica la consistencia
- **Fase 3 — Migración de lectura:** El tráfico de lectura se desvía al nuevo servicio; el monolito retiene las escrituras
- **Fase 4 — Corte completo:** Todo el tráfico se enruta al nuevo servicio; el módulo del monolito se deprecia
- **Fase 5 — Limpieza:** Se elimina el módulo del monolito; se descontinúa la infraestructura compartida

**Reversión en cualquier fase:** Si surgen problemas, volver a la fase anterior. La extracción no es una puerta de un solo sentido.

---

[Volver al Perfil de Monolito Modular](./README.es.md)
