# ADR 0070: Taxonomía Lean del Directorio Raíz del Repositorio

## Estado

Aceptado

## Fecha

2026-06-07

## Alcance

Universal — Todos los repositorios satélite de Evolith

> **Origen en satélite:** Validado originalmente en el satélite UMS (UMS ADR-0064). Promovido a línea base corporativa de Evolith.

---

## Contexto y Enunciado del Problema

Los monorepos empresariales suelen sufrir de saturación del directorio raíz. Con el tiempo, directorios de pruebas, scripts, archivos de configuración y artículos de conocimiento dispersos se acumulan en la raíz del repositorio. Esto genera:

- **Sobrecarga cognitiva** para los nuevos ingenieros que no pueden identificar rápidamente los puntos de entrada principales.
- **Degradación de la descubribilidad** — la documentación queda fuera de la vista en las plataformas de control de versiones, reduciendo su visibilidad.
- **Ambigüedad estructural** — las preocupaciones técnicas y de gobernanza se mezclan en el nivel superior, haciendo que el propósito del repositorio sea poco claro.

Sin un estándar explícito de taxonomía raíz, los repositorios satélite desarrollan estructuras inconsistentes que dificultan las herramientas entre repositorios, las convenciones de agentes de IA y el proceso de incorporación.

---

## Decisión

Adoptar el patrón arquitectónico **Lean Root** (también llamado Clean Root) para todos los repositorios satélite de Evolith, aplicando una dicotomía binaria estricta en la raíz del repositorio.

### Dicotomía Binaria

| Directorio | Propósito | Contiene |
|---|---|---|
| `src/` | Motor Técnico | Todo el código ejecutable, pruebas, scripts de pruebas de carga, migraciones de base de datos, scripts utilitarios de CI/CD, configuraciones específicas del lenguaje |
| `docs/` | Centro de Conocimiento | Toda la documentación empresarial, planos arquitectónicos, requisitos, READMEs traducidos, ADRs específicos del satélite |

### Excepciones a Nivel Raíz

Los siguientes archivos son los **únicos** elementos permitidos en la raíz del repositorio, en cumplimiento de los estándares estructurales de la metodología BMAD y las convenciones de las plataformas de control de versiones:

| Archivo | Justificación |
|---|---|
| `README.md` | Punto de entrada renderizado por la plataforma |
| `README.es.md` (u otras variantes de idioma) | Punto de entrada bilingüe |
| `AGENTS.md` | Instrucciones para agentes de IA (requisito BMAD) |
| `CHANGELOG.md` | Historial de releases estándar de código abierto |
| `LICENSE` | Requisito legal |
| `MASTER_INDEX.md` | Navegación opcional entre repositorios |
| `.gitignore`, `.editorconfig`, `.markdownlint.json` | Archivos de configuración de herramientas sin ubicación válida en subdirectorios |
| Archivos de configuración raíz de build y CI | Solo cuando la herramienta requiere ubicación raíz y no puede reubicarse |

Cualquier directorio o archivo que no coincida con lo anterior es una entrada raíz no autorizada y debe reubicarse.

### Reglas

1. Todo el código ejecutable, pruebas, scripts, migraciones y archivos de configuración de runtime **deben** residir dentro de `src/` o sus subdirectorios.
2. Toda la documentación, planos arquitectónicos, requisitos y artefactos de gobernanza **deben** residir dentro de `docs/` o sus subdirectorios.
3. No se pueden crear nuevos directorios de nivel superior sin una justificación arquitectónica y una actualización de la especificación de taxonomía raíz.
4. Los linters estructurales de CI y los agentes de IA deben aplicar esta dicotomía marcando cualquier entrada de nivel superior no autorizada.

---

## Consecuencias

### Positivas

- El directorio raíz es inmediatamente escaneable. Los ingenieros saben exactamente dónde buscar código (`src/`) frente a documentación y teoría (`docs/`).
- `README.md` y los enlaces de navegación clave se muestran prominentemente en las plataformas de control de versiones sin necesidad de desplazarse por muchas carpetas.
- La claridad estructural refuerza la disciplina de contextos acotados no solo en el código, sino en la organización del repositorio.
- Los agentes de codificación con IA pueden navegar por el repositorio de forma fiable con una convención estructural consistente.

### Negativas / Concesiones

- Los desarrolladores que anteriormente ejecutaban scripts o pruebas desde la raíz deben actualizar su directorio de trabajo a `src/` o ajustar las rutas de comandos.
- Ciertos archivos de configuración de herramientas (p. ej., `NuGet.Config`) deben ser referenciados explícitamente o depender de mecanismos de herencia estándar desde dentro de `src/`.
- La migración inicial de repositorios existentes que no cumplen requiere un esfuerzo de reubicación único.

---

## Cumplimiento

Los repositorios satélite deben:

1. Mantener la separación binaria `src/` vs. `docs/`.
2. Restringir las entradas de nivel raíz a la lista blanca aprobada.
3. Configurar linters estructurales de CI para rechazar entradas raíz no autorizadas en pull requests.
4. Actualizar `AGENTS.md` para documentar la estructura del repositorio para los agentes de codificación con IA.

---

## Referencias

- [ADR-0048: Taxonomía Empresarial y Diseño de Referencia](./0048-enterprise-taxonomy-reference-layout.es.md)
- [ADR-0049: Semántica de Nomenclatura y Política de Código Limpio](./0049-naming-semantics-clean-code-policy.es.md)




## Opciones Consideradas

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Evidencias y Criterios de Evaluación

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

## Decisiones y Estándares Relacionados

> Backfill pendiente — trazado como [GT-20](../../../governance/standards/vision/gap-tracking.es.md#gt-20) (estandarización de ADRs 2026-06-10).

---
[Volver al Índice](./README.es.md)
