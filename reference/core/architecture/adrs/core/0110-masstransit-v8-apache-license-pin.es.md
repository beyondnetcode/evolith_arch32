> **Navegación bilingüe:** [Read English version](./0110-masstransit-v8-apache-license-pin.md)

# ADR-0110: Permanecer en MassTransit v8 (Apache-2.0); v9 es comercial y no sublicenciable

> **Firma del agente:** Architect Agent (Winston)

## Estado
Accepted — **reevaluación programada antes del 2026-12-31** (ver *Disparadores de revisión*)

## Fecha
2026-07-09

## Contexto y problema
El ADR-0108 convirtió a MassTransit en el dueño único de la topología de mensajería del flujo de
proyección de datos maestros (MMS → UMS/Tracker). Eso lo vuelve una **dependencia portante de la
suite**, así que su licenciamiento es una preocupación arquitectónica, no una nota al pie de compras.

En abril de 2025 el proyecto MassTransit anunció que **v9 pasa a licencia comercial** bajo una
empresa nueva, **Massient**, con disponibilidad general en el Q1 de 2026. Hechos verificados contra
el acuerdo de licencia y las páginas de producto, no contra comentarios de terceros:

1. **v8 permanece bajo Apache-2.0.** Recibe parches de seguridad y correcciones críticas **hasta al
   menos fines de 2026**. Apache-2.0 es irrevocable: la concesión sobre los artefactos v8 ya
   publicados no puede retirarse retroactivamente. Lo que vence es el *mantenimiento*, no la
   *licencia*.
2. **v9 requiere un archivo de licencia para ejecutarse** (`MT_LICENSE` / `SetLicense()`); es
   *source-available*, no open source.
3. **La licencia de v9 es `non-exclusive, non-transferable, non-sublicensable`**, y su §5 prohíbe la
   redistribución "salvo embebida en las aplicaciones del Licenciatario". La §2 añade que cuando la
   propiedad de una aplicación pasa a un cliente, "el cliente debe comprar su propia licencia".
4. **Existe un descuento del 100% para organizaciones con ingresos brutos anuales bajo 1 M USD** (y
   sin fines de lucro con gastos bajo 1 M USD): funcionalidad completa, solo soporte comunitario.

La trampa que este ADR existe para desarmar: **«somos un proyecto open source, luego estamos
cubiertos».** No lo estamos. La expresión *"open source"* **no aparece en ninguna parte** del acuerdo
de licencia de v9 como categoría que califique. El descuento del 100% es un criterio **económico**
(ingresos), no filosófico, y está publicado en la **página de precios — no en el acuerdo de
licencia**, lo que lo convierte en una oferta comercial revocable y no en un derecho contractual.

De ahí se siguen dos consecuencias, y son las que de verdad atan a Evolith:

- **El descuento no alcanza a nuestros adoptantes.** MMS, UMS y Tracker son productos open source
  pensados para ser *redistribuidos y autodesplegados*. Como la licencia no es sublicenciable,
  cualquiera que despliegue Evolith sobre v9 debe obtener la suya — y v9 no arranca sin ella.
  Nuestro código seguiría siendo abierto mientras que *ejecutarlo* no lo sería. Eso anula la razón
  por la que la suite es abierta.
- **El descuento está condicionado a nuestro propio fracaso.** Caduca en la renovación en cuanto los
  ingresos brutos superan 1 M USD. Apoyarse en él es apostar contra el éxito de Evolith: el día en
  que el producto funcione es el día en que la dependencia se vuelve un costo.

Esto no es un reproche al modelo de Massient, que es una forma legítima de financiar el
mantenimiento. Es un problema de *encaje*: el modelo está diseñado para productos que se
**despliegan**, y Evolith es un conjunto de librerías y servicios que se **redistribuyen**.

Estado actual, verificado en el monorepo al momento de escribir:

| Producto | MassTransit | Licencia |
| --- | --- | --- |
| MMS (productor) | `8.2.5` | Apache-2.0 |
| UMS (consumidor) | `8.3.1` | Apache-2.0 |
| Tracker (consumidor) | `8.3.1` | Apache-2.0 |

Ningún proyecto referencia v9. (El `9.1.2` presente en la caché local de NuGet no está referenciado
por ningún `.csproj` de este workspace.)

## Decisión
1. **Fijar la suite Evolith a MassTransit v8.x (Apache-2.0).** Ningún proyecto puede depender de
   MassTransit `>= 9.0.0` sin reemplazar este ADR.
2. **Adoptar v9 es una decisión de gobernanza, jamás de mantenimiento.** Una subida rutinaria de
   dependencias (`dotnet outdated`, Dependabot, «es la última versión») explícitamente *no* constituye
   autoridad suficiente.
3. **Hacer la restricción exigible mecánicamente**, no solo documentada: izar la versión de
   MassTransit a Central Package Management (`Directory.Packages.props`) en la raíz del monorepo,
   para que la versión se declare **una sola vez** y cualquier movimiento a v9 aparezca como un diff
   de una línea en la revisión. Hoy está declarada en tres `.csproj` distintos y ya derivó
   (`8.2.5` vs `8.3.1`).
4. **Mantener delgada la frontera del framework.** MassTransit queda confinado a la raíz de
   composición (`DependencyInjection`) de cada producto y a sus clases `ConsumerDefinition`. Las
   capas de dominio y aplicación no deben referenciar tipos de MassTransit, de modo que un reemplazo
   futuro sea un cambio contenido.

## Consecuencias
- **Positivas:** costo de licencia cero y obligación de licencia cero, para Evolith **y para cada
  adoptante**, a perpetuidad. La concesión Apache-2.0 sobre v8 no puede revocarse. La historia de
  distribución open source queda intacta.
- **Positivas:** el modo de fallo ahora tiene *nombre*. Lo que nos protege es **la versión**, no
  nuestra condición de open source — así el riesgo es vigilable («nadie sube MassTransit a 9.x») en
  vez de una vaga sensación de inmunidad que una actualización automática de dependencias violaría en
  silencio.
- **Negativas / concesiones:** renunciamos a las funcionalidades, el trabajo de rendimiento y el
  soporte comercial de v9. Aceptamos que, después de fines de 2026, v8 no reciba **ningún parche de
  seguridad**. Ese es el único plazo real que crea este ADR, y queda registrado como disparador de
  revisión en lugar de quedar implícito.
- **Operativas:** el CI debe fallar ante cualquier resolución de MassTransit `9.x` una vez que aterrice
  CPM. Hasta entonces la restricción se exige en revisión de código.

## Disparadores de revisión
Reabrir este ADR cuando ocurra **cualquiera** de estos, lo que suceda primero:
- **2026-10-01** — un punto de control deliberado, un trimestre antes de que caduque el mantenimiento
  de v8, dejando margen para actuar en vez de reaccionar.
- Se publique un **CVE que afecte a MassTransit v8** después del fin de mantenimiento.
- Los ingresos brutos anuales de Evolith se acerquen a **1 M USD** (punto en el que el descuento de v9
  caducaría de todos modos, y en el que pagar por soporte puede volverse racional para *nuestros
  propios* despliegues — cuestión distinta de lo que imponemos a los adoptantes).
- El fork comunitario **OpenTransit** de v8 alcance madurez productiva.

## Alternativas consideradas
- **Adoptar v9 bajo el descuento del 100% por ingresos < 1 M USD.** Rechazada. No compra nada hoy (v8
  ya cuesta cero), no se extiende a los adoptantes (no sublicenciable), es una oferta de página de
  precios y no un derecho contractual, y caduca precisamente cuando Evolith tenga éxito. Costo mañana,
  ningún beneficio hoy, y la historia de distribución abierta perdida en el intermedio.
- **Adoptar v9 y pedir a los adoptantes que la licencien ellos.** Rechazada. Convierte una suite open
  source en una que no puede ejecutarse sin un acuerdo comercial de terceros — que es la definición
  del problema, no su solución.
- **Migrar ahora al fork OpenTransit de v8.** Diferida, no rechazada. El fork es joven y no probado;
  forkear es una opción real *después* de que caduque el mantenimiento de v8, y no perdemos nada
  esperando, ya que v8 es funcionalmente suficiente hoy. Queda registrado como disparador de revisión.
- **Abandonar el framework por `RabbitMQ.Client` crudo.** Diferida. Nuestro uso es estrecho — un
  `Publish`, dos consumidores, outbox transaccional y deduplicación por inbox —, de modo que es
  abordable, pero exigiría reimplementar la semántica de outbox/inbox y reintentos que hoy obtenemos
  gratis. Se conserva como la vía de escape que la decisión 4 (frontera delgada) preserva.
- **No hacer nada y revisarlo cuando se rompa.** Rechazada. El precipicio de mantenimiento de fines de
  2026 es conocido y tiene fecha; descubrirlo mediante un CVE sin parchear sería una elección, no un
  accidente.

## Referencias
- ADR-0108 (MassTransit es dueño de la topología de mensajería) · ADR-0106 (proyecciones de contexto
  del tenant maestro) · ADR-0033 (outbox transaccional).
- [Acuerdo de Licencia Comercial de MassTransit](https://massient.com/license) — §1 (no
  sublicenciable), §2 (el cliente debe comprar su propia licencia), §5 (redistribución).
- [Precios de Massient](https://massient.com/) — descuento del 100% por ingresos < 1 M USD (página de
  precios, no el acuerdo de licencia).
- [Anuncio de MassTransit v9](https://masstransit.massient.com/introduction/v9-announcement) ·
  [Configuración de licencia](https://masstransit.massient.com/configuration/license) — "MassTransit v9
  (and beyond) requires a license to use."
- [OpenTransit](https://dev.to/nakib/introducing-opentransit-a-free-open-source-fork-of-masstransit-v8-2eb3) —
  fork comunitario de v8.
- Versiones verificadas en repo: `beyondnetcode/evolith-products` @ `351ad4ee`.
