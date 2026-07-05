# Estándar de Revisión Documental Evolutiva

> **Navegación bilingüe:** [English](./evolutionary-documentation-review-standard.md)  
> **Propietario:** Evolith Architecture Board  
> **Estado:** Estándar activo  
> **Padre:** [Estándares de Documentación SDLC](./README.es.md)

---

## 1. Propósito

Todo cambio evolutivo fuerte en Evolith debe activar una revisión documental antes de considerarse completo.

Un cambio evolutivo fuerte es cualquier cambio que afecte dirección arquitectónica, SDLC, artefactos, ADRs, runtimes, topología del repositorio, diagramas, assets descargables, navegación pública o la relación de referencia con UMS.

---

## 2. Regla Obligatoria

> Ninguna evolución mayor de Evolith está completa hasta que documentación, diagramas, referencias ADR, menús, índices y equivalentes bilingües hayan sido revisados y actualizados.

Esta regla aplica a documentación en inglés y español.

---

## 3. Disparadores de Revisión

| Disparador | Ejemplos |
|---|---|
| Modelo arquitectónico | Monolito modular, extracción a microservicios, bounded contexts, topología. |
| Baseline de runtime | Versión .NET, versión Node.js, frontend, base de datos, observabilidad. |
| Registro ADR | Nuevo ADR, ADR renombrado, ADR deprecado, índice ADR o matriz ADR. |
| Modelo SDLC | Fases, gates, artefactos, scorecard, RACI, workbook, presentación ejecutiva. |
| Plantillas | PRD, ADR, Historia Funcional, Historia Técnica, Test Summary Report, Release Notes, Scorecard. |
| Comunicación visual | Diagramas Mermaid, visuales ejecutivos, mapas de capacidades, onboarding. |
| Navegación | README, índice maestro, hub de navegación, menús, enlaces, centro de descargas. |
| Referencia UMS | Runtime, bounded contexts, modelo de datos, testing, evidencia, trazabilidad. |
| Assets | PPT, workbook, scorecard, PDFs, diagramas o enlaces de descarga directa. |

---

## 4. Checklist Obligatoria

| Área | Acción requerida |
|---|---|
| READMEs | Actualizar READMEs raíz, sección y hub afectados en ambos idiomas. |
| Índices | Actualizar índices maestros, locales, catálogos y hubs. |
| ADRs | Agregar, actualizar, deprecar o enlazar ADRs. |
| Diagramas | Refrescar Mermaid y verificar etiquetas vigentes. |
| Menús | Confirmar entradas, catálogos visuales y centros de descarga. |
| Paridad bilingüe | Actualizar `.md` y `.es.md` juntos salvo excepción explícita. |
| Trazabilidad | Confirmar enlaces hacia SDLC, ADRs, plantillas, UMS e índices. |
| Assets | Confirmar nombres vigentes y enlaces de descarga directa. |
| Vigencia | Agregar o actualizar metadata de revisión cuando aplique. |

---

## 5. Definition of Done

Un cambio evolutivo está terminado solo cuando:

- [ ] El cambio técnico o arquitectónico está implementado o documentado.
- [ ] Los ADRs afectados están actualizados o justificados.
- [ ] Los diagramas afectados fueron revisados y actualizados.
- [ ] Menús, índices, READMEs y hubs están actualizados.
- [ ] Los enlaces de descarga apuntan a assets vigentes.
- [ ] Las versiones inglés y español fueron actualizadas juntas.
- [ ] Los enlaces antiguos siguen usables mediante stubs cuando se mueven rutas.
- [ ] El cambio puede descubrirse desde el README principal o el path maestro de navegación.

---

## 6. Patrón de Commit Recomendado

```text
docs(scope): update documentation after evolutionary change
```

Ejemplos:

```text
docs(sdlc): refresh executive materials and download center
docs(visuals): refresh executive one pager after SDLC v3 simplification
docs(navigation): move master index to navigation hub with root stubs
docs(architecture): update ADR and diagram references after runtime baseline change
```

---

## 7. Gobernanza

El Architecture Board es propietario de esta regla. Toda evolución aceptada debe preservar navegabilidad, paridad bilingüe y trazabilidad.

---

[Volver a Estándares de Documentación](./README.es.md)
