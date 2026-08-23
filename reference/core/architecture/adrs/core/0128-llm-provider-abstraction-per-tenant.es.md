# ADR-0128: Los proveedores de LLM son un catálogo que publica el Core y una elección que hace el tenant

> **Navegación bilingüe:** [English version](./0128-llm-provider-abstraction-per-tenant.md) · Español (este documento)

| Campo | Valor |
|---|---|
| **Estado** | Aceptado |
| **Fecha** | 2026-08-22 |
| **Decisores** | Product Owner (decisión del propietario) · Comité de Arquitectura |
| **Historia técnica** | El asistente funciona con un stub determinista porque no hay ningún proveedor de razonamiento conectado, y conectarlo sin más metería una dependencia de pago dentro de un motor de código abierto |

<!-- implementation-status: src/packages/agent-runtime/src/providers/assistant-transport.registry.ts, src/packages/agent-runtime/src/providers/ClaudeProvider.ts, src/packages/agent-runtime/src/domain/ports/assistant-invocation.port.ts, src/apps/agent-runtime-api/src/agent-runtime/runtime.factory.ts -->
> **Estado de implementación en este repositorio: parcial** (2026-08-22). Esta línea decía
> «ninguna» cuando el ADR se fusionó como decisión; el código llegó justo detrás. El registro de
> proveedores y su primer proveedor entraron en #647, y #648 llevó la resolución del proveedor a
> la petición e hizo que cada llamada reportara lo que gastó. Los ficheros nombrados en la
> directiva de arriba son lo que sostiene eso hoy. La mitad contable que este ADR asigna al
> Tracker vive en aquel repositorio, no aquí.

## Estado

Aceptado — 2026-08-22. En vigor.

## Contexto

El asistente del Tracker responde con una coincidencia heurística y sin texto redactado, porque
`runtime.factory.ts` conserva `StubAgentEngineAdapter` mientras `AGENT_RUNTIME_ENGINE` esté sin
definir. No es un descuido: el comentario que hay al lado dice que el motor real está sujeto a una
decisión, para que producción no falle ruidosamente por él. Este ADR es esa decisión.

**Lo que ya existe, y condiciona la respuesta más que cualquier diseño nuevo:**

| Costura | Estado | Por qué importa aquí |
|---|---|---|
| `IAssistantTransport` | Publicada, **neutral de proveedor a propósito** | La frontera del proveedor ya está trazada; no hay nada que inventar |
| `SupervisedAssistantClient` | Publicada, **apagada por defecto** | Una persona aprueba antes de que se abra un socket; se niega sin supervisión concedida |
| `llm-egress` (GT-575) | Publicada | Redacción, techo de bytes/tokens que falla cerrado, validación de esquema, registro auditable sin contenido |
| `CoworkAgentEngineAdapter` | Publicada | Consume el cliente supervisado sin cambiar nada del runtime |
| `PolicyBasedEngineRouter` | Publicada | Enruta por `risk_assessment`, `privacy_classification` y `cost_budget` — el vocabulario que necesita una elección de proveedor |

Es decir: la cadena del motor al proveedor está completa salvo su último eslabón — **no se publica
ningún transporte concreto en el paquete**. Solo existe Gemini, y vive en `providers/` en lugar de
como una opción registrada y seleccionable.

**Tres restricciones vienen del producto, no del código:**

1. **Evolith Core es de código abierto y debe seguir siendo gratis de ejecutar.** Todo apoyo externo
   que ofrece es abierto y sin coste. Un LLM de pago es la primera dependencia que rompe esa
   propiedad si el motor lo invoca por su cuenta.
2. **El Core no guarda estado (ADR-0101).** Tenant, producto e iniciativa son *contexto* de una
   petición, nunca entidades que el Core posea. Por tanto no puede guardar ni la elección de
   proveedor de un tenant ni su credencial.
3. **El mercado tiene varios proveedores fuertes y va a seguir teniéndolos.** Anthropic, Google,
   OpenAI y quien venga después. Un diseño que nombre uno dentro del motor nace equivocado.

## Decisión

**El Core publica un catálogo de proveedores soportados. El tenant elige uno, aporta su propia
credencial y asume el coste.** El motor nunca elige proveedor y nunca guarda una clave.

### 1. Los transportes son un registro, no un condicional

Cada proveedor es una clase que implementa `IAssistantTransport` — `invoke(request) → propuesta` —
más una entrada en un registro indexado por nombre. Añadir OpenAI, o el proveedor que todavía no
existe, es una clase y una entrada: sin tocar el motor, ni la aprobación humana, ni los controles de
salida.

Sigue el patrón que este repositorio ya usa para identidad (ADR-0020) y feature flags (ADR-0025): la
abstracción es el puerto, y los proveedores son intercambiables detrás.

### 2. La elección y la credencial viajan en la petición, no en el Core

El Core expone *con qué proveedores sabe hablar*. El Tracker guarda, por tenant, *cuál está
seleccionado y con qué credencial*, y mete ambos en el contexto de evaluación. El runtime usa lo que
le llega y no conserva nada.

Es la única forma compatible con el ADR-0101. Y además significa que un tenant que no configure nada
obtiene exactamente lo de hoy: el stub determinista, sin red y sin coste.

### 3. Nada medido se ejecuta si un tenant no lo ha encendido

El cliente supervisado sigue apagado por defecto y el transporte sigue negándose sin supervisión
concedida. Un Evolith Core sin configurar no hace **ninguna** llamada de pago. Eso es lo que
mantiene el "abierto y gratis de ejecutar" como un hecho y no como una aspiración.

### 4. El consumo lo reporta el runtime y lo contabiliza el Tracker

Cada invocación devuelve lo que gastó: tokens de entrada, de salida, proveedor y modelo. El runtime
reporta; el Tracker acumula por tenant. El Core, al no guardar estado, no hace ninguna de las dos.

`PolicyBasedEngineRouter` ya habla de `cost_budget` con `remaining_tokens` y `max_cost_usd`. La
selección de proveedor podrá leer ese mismo vocabulario más adelante —enviar datos confidenciales a
un proveedor concreto, cambiar cuando se agote un presupuesto— sin un segundo mecanismo.

## Consecuencias

**Lo que mejora**

- El asistente puede responder de verdad, sobre el proveedor que cada cliente ya paga.
- Un proveedor nuevo es una clase, no una migración.
- El coste queda atribuido por tenant por construcción, no reconstruido después desde los logs.
- La promesa de código abierto la garantiza el comportamiento por defecto, no la documentación.

**Lo que cuesta**

- Las credenciales por tenant son secretos: cifrado en reposo, rotación, y no aparecer nunca en un
  log ni devueltas dentro de un resultado de evaluación. La redacción de salida ya existe; el
  almacenamiento no.
- Se mueven tres repositorios: catálogo en el Core, configuración y contabilidad en el Tracker,
  transportes en el agent-runtime.
- Las respuestas de cada proveedor tienen formas distintas. Normalizarlas a un único
  `AssistantProposal` es el trabajo que justifica el registro, y es donde estarán los fallos.
- Un tenant con una clave mal configurada debe recibir un error que se lea como *"tu proveedor
  rechazó la llamada"*, nunca como *"el asistente está roto"*.

**Lo que a propósito NO se decide aquí**

- Cuál es el proveedor por defecto. No hay ninguno, y ese es justamente el punto.
- El enrutado entre proveedores por política. El vocabulario existe; usarlo es una decisión
  posterior.
- Si Evolith opera un proveedor por cuenta del tenant. Fuera de alcance: convertiría el motor en
  algo medido, lo que contradice el §3.

## ADRs relacionados

- [ADR-0101](./0101-core-stateless-evaluation-engine.es.md) — el Core no guarda estado; el tenant es contexto
- [ADR-0020](./0020-identity-provider-abstraction-strategy.es.md) — mismo patrón de abstracción, identidad
- [ADR-0025](./0025-feature-flag-provider-abstraction.es.md) — mismo patrón de abstracción, feature flags
