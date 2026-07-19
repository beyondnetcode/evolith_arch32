# ADR-0001: Principio de Orquestación de Monorepo

## Estado
Accepted

## Fecha
2026-05-08

## Contexto y Problema
Gestionar múltiples aplicaciones relacionadas (API, Web, librerías compartidas) como repositorios aislados causa fricción: configuraciones de CI/CD duplicadas, deriva de versiones entre el código compartido y configuraciones locales complejas. Se requiere una estrategia de monorepo para mantener todos los artefactos en una única base de código coherente.

## Objetivo y Alcance
Establecer un principio arquitectónico central para consolidar aplicaciones relacionadas y librerías compartidas bajo un único límite de repositorio. Este principio dicta la necesidad de un sistema de orquestación inteligente.

## Opciones Consideradas
- **Seleccionada:** Principio de Orquestación de Monorepo
- **Otras:** Multi-repo / Polyrepo (rechazado debido a deriva de versiones y duplicación).

## Decisión y Justificación
Adoptar un **Principio de Orquestación de Monorepo**. Todas las aplicaciones y librerías compartidas dentro de un contexto delimitado estrechamente acoplado deben residir en un único repositorio. El repositorio debe ser gestionado por una herramienta de orquestación de construcción inteligente capaz de realizar:
- Análisis de gráfico de dependencias.
- Caché de computación de tareas.
- Ejecución paralela de builds y pruebas basadas en las rutas de código afectadas.

La selección de la herramienta concreta se delega a ADRs específicos de plataforma (ej., Nx para Node.js).

## Evidencias y Criterios de Evaluación
Evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad. La caché inteligente reduce dramáticamente los tiempos de CI/CD en comparación con estructuras de monorepo ingenuas.

## Consecuencias, Riesgos y Trade-offs

### Positivas
- Pipeline de CI/CD unificada: un solo archivo de bloqueo (lockfile), una configuración de lint y un único ejecutor de pruebas.
- La política obligatoria de versión única para librerías internas evita la deriva de versiones.

### Negativas
- Los desarrolladores deben aprender las convenciones de la CLI de la herramienta de orquestación elegida.
- Los repositorios grandes pueden ser más lentos de clonar sin una configuración de sparse checkout.

## Referencias
- Ninguna

## Decisiones y Estándares Relacionados
- [Node.js ADR-0074: Orquestación de Monorepo con Nx](../nodejs/0074-monorepo-orchestration-nx.es.md)

---
[Volver al Índice](./README.es.md)

> **Agent Signature:** Architect Agent
