# Politica de Taxonomia y Estructuracion del Repositorio

> **Estado:** Aceptado | **Version:** 4.2.0 | **Framework:** Docs-as-Code y Spec-driven AI-DD

Este documento establece la taxonomia oficial y los limites de autoridad de este repositorio de referencia arquitectonica.

## 1. Estructura Estandar de Directorios

```text
/ (raiz del repositorio)
 README.md                     # Portal publico y navegacion inicial
 MASTER_INDEX.md               # Ruteo exhaustivo por rol e intencion
 .bmad-core/                   # Implementacion opcional del metodo spec-driven AI-DD
 .github/                      # Workflows CI y plantillas de colaboracion
 .harness/                     # Reglas de validacion documental y de agentes
 reference/                    # Corpus de referencia arquitectonica
   getting-started/            # Rutas cortas de lectura
   architecture/               # Autoridad arquitectonica y guia de implementacion
     README.es.md              # Hub de arquitectura y orden de lectura
     blueprints/            # Baselines, topologia y perfiles de stack
     adrs/                  # Registros de decision y matriz de decisiones
     canonical-patterns/    # Patrones por runtime mapeados a ADRs
   governance/                 # Politicas, SDLC, terminologia y onboarding
   knowledge/                  # Evidencia aplicada, investigacion y aprendizaje
     demo/                     # Limite de referencia UMS y registro de migracion
   operations/                 # Guia operativa y activos de observabilidad
   infrastructure/             # Activos de referencia de plataforma e infraestructura
```

El repositorio contiene artefactos arquitectonicos, no una aplicacion local de producto. La evidencia ejecutable de producto se mantiene externamente en [UMS](https://github.com/beyondnetcode/ums).

## 2. Convenciones de Naming y Artefactos

- Los directorios y archivos base usan `kebab-case`.
- Los ADRs usan `[id-4-digitos]-[titulo-descriptivo].md`.
- Un documento especifico de runtime debe identificar el runtime en su carpeta propietaria, titulo o declaracion de alcance.
- Los patrones canonicos son artefactos de implementacion mapeados a ADRs aceptados y permanecen condicionados por su alcance de runtime.
- No se deben crear carpetas sin alcance como `utils`, `misc`, `temp`, `common` o `shared`.

## 3. Estrategia de Navegacion

1. `README.es.md` explica la vision y enruta las intenciones comunes.
2. `reference/getting-started/README.es.md` ofrece rutas cortas por rol; `MASTER_INDEX.es.md` es el mapa de navegacion completo.
3. `reference/architecture/README.es.md` ordena la lectura de baseline, ADR, patrones canonicos y evidencia UMS.
4. `reference/governance/glossary.es.md` controla la terminologia, incluyendo referencia de arquitectura progresiva, Evolith, BMAD-METHOD, modelo aplicado UMS, ADR y patron canonico.
5. `reference/architecture/adrs/adr-matrix.es.md` relaciona necesidades con decisiones controladoras.
6. Los documentos profundos enlazan a un hub propietario o al indice maestro.

## 4. Capas de Autoridad Documental

| Capa | Proposito | Ubicaciones canonicas | Autoridad |
|---|---|---|---|
| Orientacion | Ayudar al lector a navegar el corpus | `README.es.md`, `MASTER_INDEX.es.md`, `reference/getting-started/` | Navegacional |
| Referencia canonica | Definir politica reutilizable, criterios de decision y trade-offs aceptados | `reference/architecture/blueprints/`, `reference/architecture/adrs/`, `reference/governance/` | Normativa o decisoria segun estado del documento |
| Guia de implementacion por runtime | Materializar decisiones aceptadas para un runtime declarado | `reference/architecture/canonical-patterns/`, blueprints y ADRs especificos | Reutilizable solo dentro del alcance declarado de runtime y ADR |
| Evidencia aplicada de producto | Demostrar adopcion y especializacion en un producto empresarial | `reference/knowledge/demo/`, codigo y docs externos de `beyondnetcode/ums` | Ilustrativa hasta su promocion a un artefacto canonico |

Reglas obligatorias de interpretacion:

- Una tecnologia seleccionada por UMS no constituye un mandato universal.
- UMS es la referencia aplicada ejecutable oficial; este repositorio no duplica su codigo de producto ni sus comandos de setup.
- Un aprendizaje de UMS solo se convierte en autoridad reutilizable mediante un ADR, estandar, blueprint o patron canonico aceptado.
- El corpus documental canonico vive en `reference/`; no se debe crear una jerarquia paralela `docs/` en la raiz.

## 5. Separacion entre Producto y Upstream

Este repositorio es propietario de la linea base arquitectonica y el mecanismo de promocion. Un repositorio de producto es propietario de su dominio, codigo, restricciones operativas y decisiones locales. UMS demuestra esa relacion como modelo aplicado oficial y puede aportar decisiones candidatas a este corpus.

## 6. Politica de la Raiz del Repositorio

La raiz debe mantenerse pequena y navegable. Las categorias permitidas son:

- Archivos publicos de navegacion y legales: `README.md`, `README.es.md`, `MASTER_INDEX.md`, `MASTER_INDEX.es.md` y `LICENSE`.
- Dot-folders de tooling y plataforma: `.github/`, `.harness/`, `.bmad-core/` y configuracion de editores o automatizacion.
- `reference/` para el corpus documental y arquitectonico.

No se mantienen directorios `src/` de aplicaciones en este repositorio; la implementacion ejecutable pertenece a UMS o a otro repositorio de producto con alcance explicito.

---
[Volver al Hub de Referencia](../../../README.es.md)
