# Taxonomía de Documentación Evolith

> **Navegación bilingüe:** [English version](./documentation-taxonomy.md)

**Estado:** Estándar Documental Activo  
**Propietario:** Evolith Architecture Board  
**Última Actualización:** 2026-06-10

---

## 1. Propósito

Este estándar separa arquitectura universal, gobernanza SDLC, estrategia de la suite, diseño específico de productos y guías específicas de proveedores. Evita que ideas comerciales o selecciones tecnológicas temporales se conviertan en reglas universales del Core.

---

## 2. Dominios Canónicos

| Dominio | Pregunta que Responde | Ubicación Canónica |
|---|---|---|
| **Core Architecture** | ¿Qué principios, patrones, contratos y decisiones aplican universalmente? | `reference/core/architecture/` |
| **SDLC Governance** | ¿Cómo se gobiernan fases, gates, artefactos, evidencias, roles, excepciones y métricas? | `reference/core/sdlc/` |
| **Evolith Product Suite** | ¿Qué productos componen Evolith, por qué existen y cómo se posicionan? | `product/suite/` |
| **Product-Specific Design** | ¿Cómo implementa un producto sus responsabilidades? | `product/products/<product>/` |
| **Platform and Provider Guidance** | ¿Cómo se implementa una capacidad con una tecnología o proveedor específico? | `product/infra/<category>/<provider>/` |
| **Operations and Infrastructure** | ¿Cómo se operan runtime, despliegue, soporte e infraestructura? | `product/operations/` y `product/infra/` |
| **Applied Knowledge** | ¿Qué evidencias y lecciones aportan los productos satélite? | `product/research/` |

---

## 3. Reglas de Clasificación

### Core Architecture

Un documento pertenece a Core Architecture cuando sigue siendo válido aunque desaparezcan Tracker, Jira, Langfuse, Claude, Superset u otro proveedor.

Incluye principios, patrones, contratos canónicos, ADRs Core, abstracción de proveedores, seguridad, aislamiento e integridad de evidencia.

### SDLC Governance

Pertenece a SDLC Governance cuando define cómo todos los productos satélite recorren fases y gates.

Incluye las cinco fases, Phase Gates, artefactos, evidencias, Evidence Graph, responsabilidades, aprobaciones, excepciones, métricas y Build-versus-Compose.

### Product Suite

Pertenece a Product Suite cuando explica Evolith como portafolio y propuesta de negocio.

Incluye visión, posicionamiento, mapa de productos, estrategia Open-Core, roadmap de suite, comunicación ejecutiva y arquitectura transversal de la suite.

### Product-Specific Design

Pertenece a un producto cuando define su modelo de dominio, interfaces, UX, persistencia, despliegue o decisiones internas.

### Platform or Provider Specific

Pertenece a Platforms cuando evalúa o configura una tecnología, vendor o producto nombrado.

---

## 4. Límites de ADRs

| Tipo de ADR | Alcance | Contenido Permitido |
|---|---|---|
| **Core ADR** | Universal y neutral respecto de proveedores | Patrones, contratos, restricciones generales y reglas reutilizables |
| **Product ADR** | Un producto Evolith | Arquitectura interna, persistencia, APIs, UX y despliegue |
| **Platform-Specific ADR** | Un proveedor o plataforma | Selección tecnológica, adapter, licencia, despliegue y riesgos específicos |

Un ADR Core no selecciona vendors. Puede exigir un contrato neutral. La selección concreta pertenece al producto o a un ADR específico de plataforma.

---

## 5. Dirección de Dependencias

```text
Core Architecture
        ↓
SDLC Governance
        ↓
Product Suite Vision
        ↓
Product-Specific Designs
        ↓
Platform / Provider Implementations
```

Los niveles inferiores cumplen los superiores. Un documento de producto o proveedor no puede redefinir Core Architecture ni SDLC Governance.

Las lecciones validadas solo ascienden mediante revisión del Architecture Board y modificación explícita del documento autoritativo.

---

## 6. Metadata Obligatoria

Todo documento estratégico o de diseño debe declarar:

- `Classification` / `Clasificación`;
- estado;
- propietario;
- documento padre o gobernante;
- alcance;
- par bilingüe;
- carácter normativo, informativo o específico de implementación.

Clasificaciones recomendadas:

```text
Core Architecture Principle
Core ADR
SDLC Governance Standard
Product Suite Vision
Product Suite Strategy
Product-Specific Design
Product ADR
Platform-Specific Guidance
Platform-Specific ADR
Applied Reference
```

---

## 7. Regla de Migración Transitoria

Durante la migración, las rutas existentes pueden mantenerse como ubicaciones de compatibilidad. Cada documento transitorio debe declarar su dominio objetivo y enlazar al hub canónico.

Secuencia:

1. crear el hub canónico;
2. clasificar e indexar documentos;
3. actualizar enlaces entrantes;
4. crear la ruta canónica;
5. reemplazar el archivo heredado por un aviso bilingüe de reubicación;
6. validar enlaces y paridad bilingüe;
7. retirar el aviso solo después del periodo de deprecación aprobado.

No se elimina documentación solo para mejorar la estructura si se rompen enlaces históricos o evidencias de auditoría.

---

## 8. Clasificación de los Documentos de la Nueva Visión

| Documento | Clasificación | Dominio Objetivo |
|---|---|---|
| Visión Maestra del Producto | Product Suite Vision | `product/suite/vision/` |
| Framework de Validación y Composición | Product Suite Strategy | `product/suite/strategy/` |
| Panorama Comparativo | Product Suite Positioning | `product/suite/positioning/` |
| Workflow de Validación Asistida | Product Suite Method | `product/suite/methods/` |
| Diseño Objetivo de Composición Gobernada | Debe dividirse | Arquitectura de suite + principios Core + diseño Tracker |
| Modelo de Abstracción y Plugins | Core Architecture Principle | `reference/core/foundations/principles/` |
| Interfaces Técnicas de Tracker | Product-Specific Design | `product/products/evolith-tracker/architecture/` |
| Trazabilidad y Evidence Graph | SDLC Governance Standard | `reference/core/sdlc/traceability/` |
| One-Pager Ejecutivo | Product Suite Communication | `product/suite/communication/` |

---

## 9. Gobernanza

El Architecture Board es propietario de esta taxonomía. Toda documentación nueva debe clasificarse antes de aprobarse. Las reglas universales permanecen en Core; las reglas del proceso en SDLC Governance; las narrativas de portafolio en Product Suite; los detalles de implementación con el producto; y las tecnologías nombradas en Platforms.

---

[Volver al Hub de Referencia](./README.es.md)
