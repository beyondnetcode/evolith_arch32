# Evolith: Narrativa Comercial y Estrategia de Producto

> **Visión Central:** Evolith es un framework ejecutable de gobernanza arquitectónica. Democratizamos el *cómo* se estructura el software (Open Source), pero comercializamos la *observabilidad y control* empresarial (Evolith Tracker).

---

## 1. El Problema (El Dolor del Mercado)

Las empresas invierten miles de dólares en arquitectos de software para diseñar sistemas robustos y escribir Documentos de Decisión Arquitectónica (ADRs). Sin embargo, la realidad operativa es otra:
* **La documentación muere:** Los ADRs viven en wikis estáticas que nadie consulta durante el desarrollo.
* **Degradación silenciosa:** Con la rotación de personal y la presión por entregar rápido (y ahora, con agentes de IA generando código a gran velocidad), la arquitectura se desvía del diseño original (Architecture Drift).
* **Deuda Técnica incontrolable:** Cuando la gerencia se da cuenta del desorden, refactorizar el sistema es costoso y paraliza el negocio.

## 2. La Solución Base: Evolith Core (Open Source)

**Evolith Core** transforma las reglas de arquitectura de simples "documentos de texto" a **código ejecutable**. 

* **Para el Desarrollador:** Funciona como un linter arquitectónico. Con un simple `evolith validate` en su CLI, sabe en segundos si su código cumple las reglas.
* **Para los Agentes de IA:** A través del Servidor MCP, agentes como Claude o Cursor entienden instantáneamente los estándares de la empresa antes de escribir una sola línea de código.
* **Para el Pipeline (CI/CD):** Funciona como un guardia de seguridad automatizado, bloqueando cualquier *Pull Request* que intente introducir violaciones a la arquitectura (Phase Gates).

> [!TIP]
> **La estrategia de adopción (El Caballo de Troya):** Evolith Core es **gratuito y Open Source**. El objetivo es que los desarrolladores y líderes técnicos lo adopten masivamente porque reduce la fricción, acelera los code-reviews y mejora la calidad de su trabajo diario. 

---

## 3. Arquitectura del Despliegue en el Cliente (Modelo Hub & Spoke)

Cuando vendemos e instalamos Evolith en una corporación, la arquitectura de gobierno funciona bajo un modelo centralizado de "Hub y Satélites", separando claramente dónde *nacen* las reglas y dónde se *ejecutan*.

### A. La Fuente de la Verdad (El Repositorio Central)
Se crea un único repositorio en la empresa, por convención llamado **`[empresa]-evolith-core`** o **`architecture-baseline`**. 
* Este repositorio actúa como la "Constitución" técnica. Aquí viven todos los ADRs (Markdown), Rulesets (JSON/YAML) y Políticas OPA (`.rego`). 
* Estas reglas se empaquetan en el contenedor del motor (Core API) y se ejecutan centralmente a velocidad de milisegundos gracias a la compilación a `policy.wasm`.
* Solo los Arquitectos Empresariales tienen permisos para aprobar cambios en este repositorio.

### B. Los Consumidores (Repositorios Satélites)
Los cientos de repositorios de producto o microservicios que tienen los desarrolladores se denominan **satélites**.
* Estos repositorios **no contienen las reglas**. 
* Cuando el programador en un satélite ejecuta `evolith validate`, el CLI consulta remotamente el motor del repositorio central.
* **Ventaja competitiva:** Si la empresa actualiza un estándar de seguridad en el repositorio `[empresa]-evolith-core`, automáticamente todos los repositorios satélites de la organización comienzan a ser auditados bajo la nueva regla, sin tener que hacer actualizaciones manuales en 500 proyectos distintos.

---

## 4. Evolución y Adaptabilidad (Future-Proofing)

La tecnología cambia rápido. Lo que hoy es un estándar, mañana queda obsoleto. ¿Cómo sobrevive Evolith a la aparición de nuevas topologías (ej. Agentic AI, Data Mesh)?

* **Motor Agnóstico:** La magia de Evolith es que **no tiene arquitecturas específicas quemadas (hardcoded) en su código**. El motor solo sabe procesar reglas abstractas. Si la empresa quiere adoptar un nuevo patrón, solo añade una nueva carpeta con reglas en el repositorio central, y el motor aprende a evaluarlo instantáneamente.
* **El Eje Progresivo (Progressive Axis):** Evolith no asume que todos los proyectos son Microservicios perfectos. Permite mapear reglas evolutivas: desde un MVP rápido, pasando por un Monolito Modular, hasta servicios distribuidos, aplicando las reglas justas según la etapa de madurez del producto.

### Ingesta de Nuevo Conocimiento (Automatización y GitOps)
Actualizar estas reglas no es un trabajo manual y tedioso; está automatizado en las 3 interfaces:
1. **La Vía de la IA (Servidor MCP):** El servidor MCP es bidireccional. Un agente de IA autorizado puede analizar una nueva tendencia en la industria, redactar automáticamente un borrador de ADR y un archivo `.rego`, y proponer un *Pull Request* en el repositorio central.
2. **La Vía del Desarrollador (CLI):** El CLI cuenta con herramientas de *scaffolding* (ej. `evolith adr create`) que generan toda la estructura base para añadir un nuevo estándar en segundos.
3. **La Vía de Infraestructura (GitOps):** Al aprobarse un *Pull Request* en el repositorio central corporativo, la infraestructura se actualiza vía *Webhooks*. El motor Core API descarga las nuevas políticas compiladas y hace un **hot-reload** (recarga en caliente), actualizando el cerebro de la empresa sin interrupciones en el servicio.

---

## 5. El Modelo de Monetización: Evolith Tracker (Enterprise)

Mientras que Evolith Core resuelve el problema del desarrollador individual en su repositorio (visión táctica), el CTO y los Directores de Ingeniería tienen un problema mayor (visión estratégica).

Aquí es donde entra **Evolith Tracker**, nuestro producto comercial.

### El Cierre de la Venta:
Una vez que el cliente tiene Evolith Core corriendo en 50 proyectos distintos (satélites), el CTO se enfrenta a un punto ciego corporativo:
* *"¿Cómo sé cuáles de nuestros 50 proyectos están cumpliendo la arquitectura central y cuáles son un riesgo?"*
* *"¿Cómo administro reglas distintas para la División de Pagos y la División de Logística?"*

**Evolith Tracker se vende como el Centro de Control Corporativo (Control Plane):**
* **Observabilidad Global:** Dashboards ejecutivos con el "Maturity Report" de toda la organización.
* **Multi-Tenancy:** Gestión centralizada de políticas, inquilinos (tenants) y repositorios.
* **Gestión de Excepciones:** Flujos de aprobación visual para cuando un equipo necesita romper una regla por una emergencia de negocio.
* **Trazabilidad del ROI:** Gráficos que demuestran a la gerencia cómo la deuda técnica está disminuyendo a lo largo del tiempo gracias a Evolith Core.

---

## 6. Resumen de la Estrategia (Product-Led Growth)

1. **Atraer (Seed):** Distribuimos Evolith Core gratis. Los equipos técnicos lo instalan por el inmenso valor de automatizar las validaciones de arquitectura y gobernar a sus Agentes de IA vía MCP.
2. **Expandir (Land):** Evolith se vuelve el estándar de facto en los pipelines CI/CD de la empresa. La arquitectura de los satélites se ancla al repositorio central (`[empresa]-evolith-core`), evoluciona dinámicamente y deja de degradarse.
3. **Monetizar (Expand):** Le vendemos **Evolith Tracker** a los tomadores de decisión (CTOs/Enterprise Architects) que necesitan visibilidad, reportes agregados y control centralizado de los cientos de nodos de Evolith Core desplegados en su ecosistema.
