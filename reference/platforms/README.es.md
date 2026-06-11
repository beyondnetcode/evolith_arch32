# Guías de Plataformas y Proveedores

> **Navegación bilingüe:** [English version](./README.md)

Este dominio contiene guías, evaluaciones, diseños de adapters, perfiles de despliegue, análisis de licencias y ADRs que mencionan una plataforma, vendor, tecnología o producto específico.

Los documentos de plataforma implementan contratos Core y requisitos de productos. No redefinen Evolith Core ni SDLC Governance.

## Meta y Objetivos

> **Meta:** aislar cada decisión sobre tecnologías, vendors y proveedores con nombre detrás de contratos reemplazables y neutrales respecto de proveedores.

**Objetivos:**

- Mantener las evaluaciones de vendors, diseños de adapters, análisis de licencias y perfiles de despliegue fuera del corpus Core.
- Exigir que cada perfil de proveedor documente capacidades, límites, aislamiento y rutas de migración antes de su adopción.
- Garantizar que cualquier proveedor por defecto pueda reemplazarse sin reescribir los contratos de Core ni de producto.

## Categorías

- `work-management/` — Jira, Azure DevOps, GitHub Issues, Linear y alternativas
- `agents/` — Claude, OpenAI, Gemini, modelos locales y futuros proveedores
- `observability/` — Langfuse, OpenTelemetry y alternativas
- `analytics/` — Apache Superset, Grafana, Power BI y alternativas
- `scm/` — GitHub, GitLab, Azure Repos y Bitbucket
- `ci-cd/` — GitHub Actions, Azure Pipelines, GitLab CI, Jenkins y Tekton
- `testing/` — proveedores específicos de frameworks de pruebas
- `security/` — CodeQL, Trivy, Snyk, Semgrep y alternativas
- `deployment/` — Kubernetes, cloud, serverless, VM y perfiles on-premise
- `collaboration/` — email, Teams, Slack y alternativas

## Contenido Requerido en Perfiles de Proveedor

Todo perfil debe incluir:

- cobertura de capacidades;
- limitaciones y gaps;
- modos de despliegue;
- licencias y restricciones de redistribución;
- aislamiento por tenant y residencia de datos;
- seguridad y compliance;
- mapeo de adapter y ACL;
- evidencias producidas;
- reemplazabilidad y migración;
- fuentes oficiales vigentes;
- ADRs específicos cuando correspondan.

## Límite

Los vendors nombrados nunca se convierten en requisitos universales del Core. Un proveedor puede ser default de onboarding, pero debe seguir siendo reemplazable mediante un contrato neutral de capacidad.

[Volver al Hub de Referencia](../README.es.md)
