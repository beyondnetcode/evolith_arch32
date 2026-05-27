# Evolith: Base de Referencia de Arquitectura Progresiva

[![Status](https://img.shields.io/badge/Status-Activo-brightgreen?style=for-the-badge)]()

[![Method](https://img.shields.io/badge/Metodo-Spec--driven_AI--DD-blueviolet?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-informational?style=for-the-badge)]()

**Evolith** es el **upstream arquitectónico corporativo** — la fuente autoritativa de decisiones, estándares y patrones para los repositorios de producto de la organización. No es un framework que se instala; es un contrato empresarial vivo que los equipos de producto heredan, extienden y al que contribuyen de vuelta con el tiempo.

**Evolith** es la plataforma de arquitectura progresiva de nivel empresarial que define cómo las organizaciones evolucionan de Monolitos Modulares a sistemas distribuidos — gobernada, trazable y asistida por IA desde el diseño. Es el ADN técnico evolutivo para todos los repositorios satélites.

> Separar conceptualmente antes de separar físicamente.

[English](./README.md) | [Español](./README.es.md)

---

## ¿Para Qué Sirve Este Repositorio?

Este repositorio sirve tres propósitos distintos según quién lo lea.

**Estás evaluando el modelo arquitectónico de Evolith.**
Lee el [Blueprint de Referencia](./reference/architecture/blueprints-es/reference-blueprint.md) y el [Registro ADR](./reference/architecture/adrs-es/README.md). Cada decisión está documentada con su justificación, trade-offs y nivel de gobernanza Evolith.

**Estás iniciando un nuevo repositorio de producto.**
Esta base es tu punto de partida. Heredas su corpus completo de decisiones, estructuras tu repositorio usando su taxonomía y documentas cada punto donde el contexto de tu producto diverge. La mecánica de este proceso está definida en la **[Guía de Herencia para Repositorios Hijos](./reference/governance/standards/onboarding/child-repository-inheritance-guide.es.md)** — léela antes de escribir una sola línea de código.

**Estás contribuyendo una nueva decisión arquitectónica.**
Si la decisión es universal, pertenece aquí. Si es específica del producto, pertenece en el repositorio hijo. El [Camino de Promoción](./reference/governance/standards/onboarding/child-repository-inheritance-guide.es.md#7-camino-de-promoción) define cómo las decisiones viajan desde los repositorios de producto de vuelta a esta base.

**Estás configurando desarrollo asistido por IA (AI-DD).**
Este repositorio puede usar BMAD-METHOD como método de soporte spec-driven AI-DD. No es el nombre ni la visión de este corpus documental. La configuración local de agentes, las reglas del harness y la guía de replicación están documentadas en la [Referencia de Adopción de Frameworks AI-DD](./reference/governance/standards/ai-augmented/frameworks/README.md).

---

## Contenidos

- [¿Para Qué Sirve Este Repositorio?](#para-qué-sirve-este-repositorio)
- [Empieza Aquí](#empieza-aquí)
- [Prerrequisitos](#prerrequisitos)
- [El Viaje Arquitectónico](#el-viaje-arquitectónico)
- [Mapa del Repositorio](#mapa-del-repositorio)
- [Primeras Lecturas Recomendadas](#primeras-lecturas-recomendadas)
- [Referencia Aplicada Oficial: UMS](#referencia-aplicada-oficial-ums)
- [Contribución](#contribución)
- [Licencia](#licencia)

---

## Empieza Aquí

| Si quieres... | Ve a |
|---|---|
| Entender todo el repositorio | [Índice Maestro Global](./MASTER_INDEX.es.md) |
| **Iniciar un nuevo producto desde esta base** | **[Guía de Herencia para Repositorios Hijos](./reference/governance/standards/onboarding/child-repository-inheritance-guide.es.md)** |
| Elegir una ruta de lectura según tu rol | [Primeros Pasos por Rol](./reference/getting-started/README.es.md) |
| Aprender el modelo arquitectónico | [Blueprint de Referencia](./reference/architecture/blueprints-es/reference-blueprint.md) |
| Revisar las reglas universales | [Línea Base Arquitectónica Agnóstica](./reference/architecture/blueprints-es/authoritative-tech-stack-agnostic.md) |
| Explorar decisiones y trade-offs | [Registro ADR](./reference/architecture/adrs-es/README.md) |
| Aclarar la terminología del proyecto | [Glosario Arquitectónico](./reference/governance/glossary.es.md) |
| Inspeccionar la referencia ejecutable de producto | [Modelo Aplicado UMS](./reference/knowledge/demo/README.es.md) |
| Entender cómo deben operar aquí los agentes de IA | [AGENTS.es.md](./AGENTS.es.md) |
| **Explicar el estándar a cualquier audiencia** | **[Estrategia de Comunicación Arquitectónica](./reference/governance/standards/communication/architecture-communication-strategy.es.md)** |
| **Explorar los diagramas visuales de arquitectura** | **[Backlog Visual de Arquitectura](./reference/governance/standards/communication/visuals/README.md)** |

---

## Prerrequisitos

Este repositorio es un corpus documental y arquitectónico. Para prerrequisitos ejecutables del producto, sigue el [README vigente de UMS](https://github.com/beyondnetcode/ums/blob/main/README.md), propietario del setup oficial de la demo.

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
| [reference/architecture/](./reference/architecture/README.es.md) | Hub arquitectónico: blueprints, ADRs, perfiles de stack y patrones canónicos |
| [reference/governance/](./reference/governance/standards-es/README.md) | Estándares de ingeniería, SDLC, onboarding y reglas de arquitectura |
| [reference/operations/](./reference/operations/README.es.md) | Observabilidad, soporte runtime y documentación operacional |
| [reference/infrastructure/](./reference/infrastructure/README.es.md) | Plataforma local, gateway, contenedores y activos de infraestructura |
| [reference/knowledge/](./reference/knowledge/demo/README.es.md) | Límite del modelo aplicado UMS, registro de migración, investigación y aprendizaje |
| [Repositorio UMS](https://github.com/beyondnetcode/ums) | Referencia oficial ejecutable de producto e instrucciones de setup |

Para navegación por rol, usa el [Índice Maestro Global](./MASTER_INDEX.es.md).

---

## Primeras Lecturas Recomendadas

1. [Primeros Pasos por Rol](./reference/getting-started/README.es.md)
2. [Directivas Arquitectónicas](./reference/governance/standards-es/vision/architectural-directives.md)
3. [Blueprint de Referencia](./reference/architecture/blueprints-es/reference-blueprint.md)
4. [Línea Base Arquitectónica Agnóstica](./reference/architecture/blueprints-es/authoritative-tech-stack-agnostic.md)
5. [Matriz ADR](./reference/architecture/adrs-es/adr-matrix.es.md)
6. [Referencia Canónica vs Modelo Aplicado UMS](./reference/knowledge/demo/demo-vs-reference.es.md)

---

## Referencia Aplicada Oficial: UMS

```bash
git clone https://github.com/beyondnetcode/ums.git
cd ums
```

Sigue las [instrucciones vigentes de UMS](https://github.com/beyondnetcode/ums/blob/main/README.md) para ejecutar el producto. UMS aporta evidencia de implementación empresarial; las reglas y políticas generales permanecen en `reference/architecture/` y `reference/governance/`.

---

## Contribución

Contribuir a Evolith significa fortalecer el estándar empresarial. Las contribuciones son bienvenidas mediante issues, mejoras documentales, revisión de ADRs, ejemplos, pruebas y aprendizajes promovidos desde UMS u otros repositorios satélites.

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
 <sub>Evolith — Plataforma de Arquitectura Empresarial | Corpus de Referencia Progresiva | Spec-driven AI-DD</sub>
</div>
