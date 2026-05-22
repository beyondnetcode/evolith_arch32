# Referencia de Arquitectura de Monolito Progresivo

[![Status](https://img.shields.io/badge/Status-Activo-brightgreen?style=for-the-badge)]()

[![Method](https://img.shields.io/badge/Metodo-Spec--driven_AI--DD-blueviolet?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-informational?style=for-the-badge)]()

Este repositorio es el **upstream arquitectónico corporativo** — la fuente autoritativa de decisiones, estándares y patrones para todos los repositorios de producto de la organización. No es un framework que se instala. Es un contrato vivo que los equipos de producto heredan, extienden y al que contribuyen de vuelta con el tiempo.

**arc32** identifica el toolset y la implementación del repositorio. No es la visión del producto. La visión es la referencia de arquitectura progresiva documentada aquí.

> Separar conceptualmente antes de separar físicamente.

[English](./README.md) | [Español](./README.es.md)

---

## ¿Para Qué Sirve Este Repositorio?

Este repositorio sirve tres propósitos distintos según quién lo lea.

**Estás evaluando el modelo arquitectónico.**
Lee el [Blueprint de Referencia](./reference/architecture/blueprints-es/reference-blueprint.md) y el [Registro ADR](./reference/architecture/adrs-es/README.md). Todo está documentado con su justificación y trade-offs.

**Estás iniciando un nuevo repositorio de producto.**
Esta base es tu punto de partida. Heredas su corpus completo de decisiones, estructuras tu repositorio usando su taxonomía y documentas cada punto donde el contexto de tu producto diverge. La mecánica de este proceso está definida en la **[Guía de Herencia para Repositorios Hijos](./reference/governance/standards/onboarding/child-repository-inheritance-guide.es.md)** — léela antes de escribir una sola línea de código.

**Estás contribuyendo una nueva decisión arquitectónica.**
Si la decisión es universal, pertenece aquí. Si es específica del producto, pertenece en el repositorio hijo. El [Camino de Promoción](./reference/governance/standards/onboarding/child-repository-inheritance-guide.es.md#7-camino-de-promoción) define cómo las decisiones viajan desde los repositorios de producto de vuelta a esta base.

**Estás configurando desarrollo asistido por IA (AI-DD).**
Este repositorio usa BMAD-METHOD como framework AI-DD. La configuración local de agentes, las reglas del harness y la guía de replicación están documentadas en la [Referencia de Adopción de Frameworks AI-DD](./reference/governance/standards/ai-augmented/frameworks/README.md).

---

## Contenidos

- [¿Para Qué Sirve Este Repositorio?](#para-qué-sirve-este-repositorio)
- [Empieza Aquí](#empieza-aquí)
- [Prerrequisitos](#prerrequisitos)
- [El Viaje Arquitectónico](#el-viaje-arquitectónico)
- [Mapa del Repositorio](#mapa-del-repositorio)
- [Primeras Lecturas Recomendadas](#primeras-lecturas-recomendadas)
- [Inicio Rápido: Demo Sandbox](#inicio-rápido-demo-sandbox)
- [Contribución](#contribución)
- [Licencia](#licencia)

---

## Empieza Aquí

| Si quieres... | Ve a |
|---|---|
| Entender todo el repositorio | [Índice Maestro Global](./MASTER_INDEX.es.md) |
| **Iniciar un nuevo producto desde esta base** | **[Guía de Herencia para Repositorios Hijos](./reference/governance/standards/onboarding/child-repository-inheritance-guide.es.md)** |
| Aprender el modelo arquitectónico | [Blueprint de Referencia](./reference/architecture/blueprints-es/reference-blueprint.md) |
| Revisar las reglas universales | [Línea Base Arquitectónica Agnóstica](./reference/architecture/blueprints-es/authoritative-tech-stack-agnostic.md) |
| Explorar decisiones y trade-offs | [Registro ADR](./reference/architecture/adrs-es/README.md) |
| Inspeccionar el ejemplo ejecutable | [Demo Sandbox](./reference/knowledge/demo/README.md) |
| Entender cómo deben operar aquí los agentes de IA | [AGENTS.es.md](./AGENTS.es.md) |

---

## Prerrequisitos

| Requisito | Versión Mínima |
|---|---|
| Node.js | 20+ |
| npm | 10+ |
| Docker + Docker Compose | Última estable |

---

## El Viaje Arquitectónico

La referencia arquitectónica es intencionalmente progresiva. No trata los microservicios como punto de partida por defecto.

```text
Monolito Simple
  -> Monolito Modular
    -> Módulos Distribuidos
      -> Microservicios
```

El repositorio ayuda a decidir **cuándo mantenerse simple**, **cuándo modularizar** y **cuándo la distribución justifica su costo operacional**.

---

## Mapa del Repositorio

| Área | Qué encontrarás |
|---|---|
| [reference/architecture/](./reference/architecture/blueprints-es/README.md) | Blueprints, topología, perfiles de stack y decisiones arquitectónicas |
| [reference/governance/](./reference/governance/standards-es/README.md) | Estándares de ingeniería, SDLC, onboarding y reglas de arquitectura |
| [reference/operations/](./reference/operations/README.es.md) | Observabilidad, soporte runtime y documentación operacional |
| [reference/infrastructure/](./reference/infrastructure/README.es.md) | Plataforma local, gateway, contenedores y activos de infraestructura |
| [reference/knowledge/](./reference/knowledge/demo/README.md) | Documentación demo, investigación, ejemplos y material de aprendizaje |
| [src/](./src/apps/todo-web/README.md) | Implementación de referencia y sandbox ejecutable |

Para navegación por rol, usa el [Índice Maestro Global](./MASTER_INDEX.es.md).

---

## Primeras Lecturas Recomendadas

1. [Directivas Arquitectónicas](./reference/governance/standards-es/vision/architectural-directives.md)
2. [Blueprint de Referencia](./reference/architecture/blueprints-es/reference-blueprint.md)
3. [Línea Base Arquitectónica Agnóstica](./reference/architecture/blueprints-es/authoritative-tech-stack-agnostic.md)
4. [Registro ADR](./reference/architecture/adrs-es/README.md)
5. [Demo Sandbox](./reference/knowledge/demo/README.md)

---

## Inicio Rápido: Demo Sandbox

```bash
git clone https://github.com/beyondnetcode/arc32_nodejs_progresive_monolith.git
cd arc32_nodejs_progresive_monolith/src
npm install

docker-compose -f ../reference/infrastructure/docker-compose.yml up -d
npm run dev
```

La demo existe para mostrar patrones arquitectónicos en código. Las reglas y políticas generales permanecen en `reference/architecture/` y `reference/governance/`.

---

## Contribución

Las contribuciones son bienvenidas mediante issues, mejoras documentales, revisión de ADRs, ejemplos, pruebas y refinamientos de la demo.

Antes de contribuir, revisa:

- [AGENTS.es.md](./AGENTS.es.md)
- [Taxonomía del Repositorio](./reference/governance/standards-es/repository-taxonomy.es.md)
- [Manifiesto de Ingeniería](./reference/governance/standards-es/engineering/engineering-manifesto.md)
- [ADR Gitflow](./reference/architecture/adrs-es/core/0050-estrategia-ramas-gitflow.md)

---

## Licencia

Este proyecto se publica bajo la [Licencia MIT](./LICENSE). Eres libre de usar, copiar, modificar, fusionar, publicar y distribuirlo. Se agradece la atribución, aunque no es obligatoria.

---

<div align="center">
 <sub>2026 Referencia de Arquitectura Progresiva | toolset arc32 | Spec-driven AI-DD</sub>
</div>
