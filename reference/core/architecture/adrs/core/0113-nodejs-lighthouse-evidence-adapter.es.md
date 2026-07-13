> **Navegación bilingüe:** [Read English version](./0113-nodejs-lighthouse-evidence-adapter.md)

# ADR-0113: Plataforma Node.js — Lighthouse (Apache-2.0) como adaptador de evidencia de referencia

> **Firma del Agente:** Agente Arquitecto (Winston)

## Estado
Propuesto (2026-07-13 — Comité de Arquitectura)

## Fecha
2026-07-13

## Contexto y Problema

La [ADR-0111](./0111-quality-signal-provider-port.es.md) estableció la costura de
Proveedores de Señales de Calidad: las herramientas externas de calidad/evidencia
alimentan a Evolith Core a través de un único puerto guiado `IQualitySignalProvider`
y un modelo `Evidence` canónico con procedencia obligatoria, y el Core nunca
ejecuta un proveedor. Esa ADR dejó deliberadamente las implementaciones concretas
de adaptadores y sus elecciones de proveedor/runtime a una **ADR de Plataforma
acompañante** — esta.

Para probar la costura de extremo a extremo (GT-534) necesitamos un primer
proveedor concreto. Esa elección es una decisión de plataforma: fija un runtime
(Chrome headless), un lenguaje/sistema de módulos (un módulo Node.js) y una
herramienta de terceros con su propia licencia. Esas consecuencias merecen su
propia decisión registrada en vez de quedar enterradas en un archivo de adaptador.

El problema: **¿qué herramienta y runtime concretos adoptamos para el primer
adaptador de evidencia, de modo que valide el puerto sin volverse dependencia dura
de la suite, sin riesgo de licencia y produciendo salida determinista y
normalizable?**

## Objetivo y Alcance

Registrar la elección concreta de proveedor/runtime para el primer adaptador
detrás de `IQualitySignalProvider`. En alcance: la herramienta (Lighthouse), su
licencia (Apache-2.0), el runtime que implica (Node.js + Chrome headless), el
límite de módulo que la mantiene opcional y el contrato de normalización que debe
respetar. Fuera de alcance: el diseño del puerto/registro (propiedad de la
ADR-0111) y los adaptadores futuros (TestSprite, rúbrica de revisión estructural,
scorecards GEO — cada uno con su propio registro si introduce un nuevo compromiso
de plataforma).

## Opciones Consideradas

### Opción A: Lighthouse como módulo Node embebido (elegida)

Ejecutar Google Lighthouse vía su API programática de Node contra una URL
desplegada, consumir su resultado JSON (LHR) y mapearlo a `Evidence` canónica.
Elegida: Lighthouse es **Apache-2.0** (permisiva, sin copyleft, sin puerta
comercial), un auditor maduro y ampliamente confiable, con un módulo Node
embebible de salida JSON pura, y es **determinista** — el mejor encaje con la
clase `determinism: 'deterministic'` de la costura y la forma de menor riesgo de
probar el puerto.

### Opción B: Ejecutar Lighthouse vía su CLI / la API alojada PageSpeed Insights

Invocar el CLI `lighthouse`, o llamar a la API alojada de PageSpeed Insights.
Rechazada: el CLI añade gestión de procesos y parseo sin ganancia frente al módulo
Node; la API alojada introduce dependencia de red, cuotas/llaves y egreso de datos
a un tercero — justo el acoplamiento que la ADR-0111 existe para evitar.

### Opción C: Otro auditor (WebPageTest, Sitespeed.io, un SaaS)

Rechazada para el adaptador *de referencia*: mayor superficie de runtime/licencia
o una nube propietaria. Siguen siendo válidos como adaptadores *adicionales*
detrás del mismo puerto más adelante — el punto de la ADR-0111 es que la elección
es descartable.

## Decisión y Justificación

1. **Herramienta y licencia.** Adoptar **Lighthouse (Apache-2.0)** como proveedor
   de evidencia de referencia. La licencia permisiva no impone copyleft ni riesgo
   de re-licenciamiento comercial (contrasta con la situación de MassTransit v9 en
   la ADR-0110); Lighthouse es ilustrativo, no estructural (prueba de fuego de la
   ADR-0111).

2. **Runtime.** El adaptador corre sobre **Node.js** y requiere **Chrome
   headless** en tiempo de ejecución. Es un compromiso de *runtime* (el paso de
   recolección en la capa de orquestación), nunca una dependencia de diseño ni del
   Core.

3. **Límite de módulo — opcional, importado perezosamente.** El adaptador vive en
   `@beyondnet/evolith-infra-providers` e importa SOLO las formas canónicas de
   `Evidence` desde `core-domain`. `lighthouse` y `chrome-launcher` **no** son
   dependencias declaradas del paquete; el runner por defecto las importa
   *dinámicamente* para que el paquete compile e instale sin ninguna presente
   (ADR-0111 §5 — ninguna herramienta externa es jamás dependencia dura).

4. **Costura de testeabilidad.** La corrida real de Chrome headless queda detrás
   de un puerto `LighthouseRunner` inyectado. Los tests unitarios inyectan un LHR
   simulado, así la suite corre sin Chrome y sin red. Una corrida real necesita
   Chrome + una URL desplegada y es un asunto de runtime.

5. **Contrato de normalización.** El adaptador mapea cada categoría de Lighthouse
   (`performance` → `performance`, `accessibility` → `a11y`, `best-practices`,
   `seo`) a una métrica `0..100` Y a un `EvidenceFinding` cuya severidad se deriva
   deterministamente del puntaje de la categoría. Emite
   `determinism: 'deterministic'` y **procedencia completa y obligatoria**
   (`collectedBy: 'lighthouse'`, `adapterVersion`, un `artifactHash` SHA-256 del
   LHR y un `timestamp` tomado del `fetchTime` del LHR), vía `normalizeEvidence`.

6. **Sin inversión de dependencia.** El puerto `IQualitySignalProvider` es
   propiedad de la capa de orquestación (agent-runtime). Importarlo en un paquete
   de borde de infraestructura invertiría la dirección de dependencia (infra →
   orquestación), por lo que el adaptador conforma al puerto **estructuralmente**
   (una interfaz espejada en el paquete) y el runtime registra la instancia. La
   conformidad estructural con el puerto real se verifica en tiempo de build.

## Evidencia y Criterios de Evaluación

- **Chequeo de licencia**: Lighthouse es Apache-2.0 — permisiva, sublicenciable,
  sin puerta comercial (verificar contra el `LICENSE` upstream).
- **Determinismo**: el adaptador emite `determinism: 'deterministic'`; un LHR fijo
  produce `Evidence` idéntica (mismas métricas, findings y `artifactHash`).
- **Procedencia**: toda `Evidence` emitida lleva una `Provenance` completa
  (obligatoria por ADR-0111 §6), impuesta por `normalizeEvidence`.
- **Pureza del borde**: `grep` no muestra `lighthouse`/`chrome-launcher` en las
  dependencias declaradas del paquete; solo se importan dinámicamente.
- **Statelessness preservado**: el Core importa solo `Evidence`; ningún import de
  adaptador o proveedor alcanza `core-domain` (criterio de límite ADR-0101 /
  ADR-0111).

## Consecuencias, Riesgos y Compromisos

Positivo: prueba la costura de la ADR-0111 de extremo a extremo con una dimensión
de evidencia real y determinista; la licencia permisiva elimina el riesgo legal;
la costura del runner inyectado mantiene herméticos los tests unitarios; el
proveedor queda descartable y seleccionable por tenant.

Negativo / compromisos: una corrida real necesita una imagen de runtime con Chrome
headless y una URL desplegada (un costo operativo, no de diseño); los puntajes de
Lighthouse pueden variar de corrida a corrida en un objetivo vivo por varianza de
red/CPU aunque la clase de herramienta sea determinista — los consumidores deben
tratar una corrida única como una muestra puntual y pueden promediar entre
corridas. Riesgo: deriva de versión de Chrome/Lighthouse cambiando ids de
categoría o semántica de puntaje (mitigado por el adaptador versionado y el
`artifactHash` de procedencia).

## Referencias

- Lighthouse — motor de auditoría de runtime (Apache-2.0), API programática de
  Node con salida JSON (LHR): <https://github.com/GoogleChrome/lighthouse>
- Licencia de Lighthouse (Apache-2.0):
  <https://github.com/GoogleChrome/lighthouse/blob/main/LICENSE>
- `chrome-launcher` — lanzador de Chrome headless usado por el runner por defecto:
  <https://github.com/GoogleChrome/chrome-launcher>

## Decisiones y Estándares Relacionados

- [ADR-0111](./0111-quality-signal-provider-port.es.md) — el puerto de Proveedores
  de Señales de Calidad + la `Evidence` canónica que este adaptador implementa
  (decisión padre).
- [ADR-0101](./0101-core-stateless-evaluation-engine.es.md) — Core stateless; el
  adaptador corre en orquestación, nunca dentro del evaluador.
- [ADR-0110](./0110-masstransit-v8-apache-license-pin.es.md) — precedente de
  tratar la licencia de una dependencia estructural como asunto arquitectónico
  (aquí lo opuesto: una dependencia *opcional* con licencia permisiva).
- [ADR-0104](./0104-topology-driven-advisory-design-governance.es.md) — deriva los
  criterios que esta evidencia de runtime confirma o refuta (el lazo de
  conformidad).
