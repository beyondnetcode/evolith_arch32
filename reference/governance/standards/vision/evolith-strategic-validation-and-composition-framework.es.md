# Evolith — Framework Estratégico de Validación y Composición

> **Navegación Bilingüe:** [English Version](./evolith-strategic-validation-and-composition-framework.md)

**Estado:** Referencia Estratégica Activa  
**Propietario:** Evolith Architecture Board  
**Documento Padre:** [Visión Maestra del Producto Evolith](./evolith-product-vision-master.es.md)  
**Origen:** Sesión de feedback con inversor, 2026-06-09  
**Creado:** 2026-06-10  
**Última Actualización:** 2026-06-10

---

## 1. Tesis Ejecutiva

El cuestionamiento del inversor es válido:

> Una composición de productos existentes puede reproducir una parte sustancial de las capacidades visibles de Evolith. Langfuse, agentes autónomos, Apache Superset, Jira o herramientas abiertas de gestión de trabajo, plataformas CI/CD, repositorios, herramientas de pruebas y otros componentes pueden aportar conjuntamente observabilidad, ejecución, dashboards, gestión de tareas, automatización e informes.

Por ello, Evolith no debe competir reconstruyendo cada herramienta. Debe demostrar que su capa de gobernanza genera más valor que los mismos productos utilizados de manera independiente.

Posicionamiento recomendado:

> **Jira administra el trabajo. Claude ejecuta trabajo. Langfuse observa la IA. Superset visualiza los datos. Evolith gobierna todo el proceso de ingeniería.**

La categoría defendible de Evolith es:

> **El plano de control de gobernanza para la ingeniería de software AI-Native.**

---

## 2. Posición en el Mercado

| Plataforma | Rol Principal | Superposición con Evolith | Relación Recomendada |
|---|---|---:|---|
| **Langfuse** | Observabilidad de LLM y agentes, gestión de prompts, evaluación, costos y latencia | 25-35% | Integrar como proveedor de observabilidad y evaluación |
| **Claude Cowork** | Trabajo autónomo de conocimiento sobre archivos, aplicaciones y conectores | 20-30% | Usar como proveedor de ejecución gobernada |
| **Apache Superset** | Analítica open source, dashboards y exploración de datos | 10-20% | Embeber o integrar como capa de visualización |
| **Atlassian Enterprise Stack** | Ideas, portafolio, proyectos, tareas, conocimiento, servicios y experiencia del desarrollador | 60-70% | Integrar mediante ACLs y competir en gobernanza |
| **Evolith** | Gobernanza de ingeniería ejecutable desde la idea hasta producción | 100% de la visión objetivo | Poseer el núcleo de gobernanza y componer el ecosistema |

Los porcentajes son estimaciones arquitectónicas orientativas, no métricas externas de mercado.

---

## 3. Nota de Precisión

El stack potencialmente sustituto no es completamente open source:

- Langfuse y Apache Superset son open source y self-hostable.
- Claude Cowork es propietario y actualmente está asociado a planes de pago de Claude, no al plan Free.
- Jira y varios componentes empresariales son propietarios.
- Pueden existir alternativas open source para capacidades seleccionadas.

La hipótesis correcta es:

> **Un stack que combine productos open source, free-tier y comerciales puede reemplazar una gran parte de la superficie de implementación prevista para Evolith.**

---

## 4. Opciones Estratégicas

### 4.1 Construir Capacidad por Capacidad

Estudiar cada producto maduro, adoptar sus mejores patrones e implementar nativamente en Evolith el comportamiento requerido.

**Beneficios:** experiencia coherente, control del dominio, mayor cumplimiento por tenant y menor dependencia de largo plazo.

**Riesgos:** entrega más lenta, mayor costo, superficie de mantenimiento más grande y duplicación de funciones maduras.

### 4.2 Componer Productos Existentes

Usar productos existentes dentro o detrás de los módulos de Evolith y gobernarlos mediante contratos Evolith.

**Beneficios:** menor time-to-market, menor costo inicial, reutilización de productos probados y experimentación más rápida.

**Riesgos:** experiencia fragmentada, carga operativa, restricciones de licenciamiento, lock-in de schemas y riesgo de que Evolith sea solo una capa delgada de integración.

### 4.3 Decisión — Composición Gobernada

Evolith adopta una estrategia híbrida:

> **Construir el núcleo irreducible de gobernanza y componer capacidades maduras mediante puertos, adaptadores y Anti-Corruption Layers reemplazables.**

---

## 5. Lo que Evolith Debe Poseer

Evolith debe implementar y controlar:

1. el SDLC canónico de cinco fases y la máquina de estados de Phase Gates;
2. rulesets, schemas, estándares, taxonomía y herencia del Core;
3. el modelo canónico de artefactos y evidencias;
4. evaluación de gates, excepciones, aprobaciones e historial inmutable;
5. trazabilidad desde la intención de negocio hasta arquitectura, código, QA y release;
6. Architecture Drift y score de adherencia;
7. reglas, skills, políticas de modelos y autorización por tenant;
8. contratos neutrales para agentes, analítica, sistemas de trabajo, repositorios, CI/CD y testing;
9. autoridad final sobre cada transición de fase;
10. promoción upstream de lecciones comprobadas hacia Evolith Core.

---

## 6. Lo que Evolith Debe Componer Normalmente

Evolith debería integrar o embeber normalmente:

- telemetría de LLM y agentes;
- experimentación y evaluación de prompts;
- dashboards analíticos y exploración de datos;
- mecánicas genéricas de backlog y tableros;
- control de fuentes y ejecución CI/CD;
- runners de pruebas, contract testing y escáneres de seguridad;
- plataformas de despliegue y release;
- motores de generación documental;
- agentes autónomos de propósito general;
- canales de colaboración y notificación.

Una capacidad debe convertirse en nativa solo cuando la evidencia demuestre que el componente externo bloquea la gobernanza, genera costos o riesgos inaceptables, impide el aislamiento por tenant, perjudica materialmente la experiencia o se convierte en un diferenciador competitivo real.

---

## 7. Modelo de Decisión de Capacidades

Cada capacidad debe recibir una disposición:

| Disposición | Significado |
|---|---|
| **Adoptar** | Usar el producto externo prácticamente como se entrega |
| **Embeber** | Presentar su capacidad dentro de la experiencia Evolith |
| **Integrar** | Mantenerlo externo e intercambiar comandos, eventos y evidencias |
| **Extender** | Añadir adaptadores, plugins o controles de política Evolith |
| **Construir** | Implementar nativamente por ser diferenciador o requisito no cubierto |
| **Rechazar** | Excluirlo por seguridad, licencia, lock-in o incompatibilidad arquitectónica |

Cada decisión debe evaluar diferenciación estratégica, cobertura funcional, compatibilidad con la gobernanza, reemplazabilidad, propiedad de datos, aislamiento por tenant, seguridad, licenciamiento, carga operativa, experiencia de usuario y costo total de propiedad.

---

## 8. Estrategia Preliminar por Módulo

| Área Evolith | Productos Candidatos | Responsabilidad Propia de Evolith | Dirección Inicial |
|---|---|---|---|
| **Discovery e Ideación** | Claude Research, Chat, Cowork, conectores de investigación y documentos colaborativos | Discovery Canvas, gate ROI/KPI, supuestos, evidencias y aprobación | Integrar + construir gobernanza |
| **Architecture Spec-Driven** | Claude Code, generadores de contratos, diagramación y repositorios | Gobernanza ADR, Spec-as-Source, baseline de diseño y trazabilidad | Integrar + construir gobernanza |
| **Construction Tracking** | Jira, herramientas abiertas, GitHub y Azure DevOps | Modelo canónico de trabajo, drift, estado de gates y linaje de evidencia | Integrar mediante ACL |
| **Automated QA e Integration** | CI, frameworks de pruebas, escáneres y contract testing | Política de evidencias, umbrales, excepciones y gate RC | Integrar productores de evidencia |
| **Dynamic Release Planner** | Plataformas de despliegue, feature flags, calendarios y sistemas de incidentes | Elegibilidad de release, regression score, contingencia y gate Production Live | Integrar + construir lógica de decisión |
| **Observabilidad de Agentes** | Langfuse | Identidad AgentRun, mapeo de traces, aceptación de evaluaciones y auditoría | Integrar o self-host |
| **Analítica Ejecutiva** | Apache Superset | Métricas canónicas, modelo semántico por tenant y definición confiable de scores | Embeber o integrar |
| **Trabajo Autónomo** | Claude Cowork y proveedores alternativos | Contrato de actividad, límite de contexto, permisos, evidencia y aprobación | Integrar detrás de un puerto de proveedor |

Esta tabla es una hipótesis estratégica, no una selección tecnológica.

---

## 9. Tesis No Reemplazable de Evolith

Una colección de herramientas puede reproducir muchas funciones visibles:

- tableros de tareas;
- dashboards;
- traces LLM;
- documentos autónomos;
- automatización de workflows;
- informes y alertas;
- integraciones con repositorios y pipelines.

Pero no crea automáticamente:

1. una Constitución de ingeniería autoritativa heredada por cada producto;
2. una taxonomía canónica de fases, artefactos, evidencias y decisiones;
3. un modelo de gates exigible desde la idea hasta producción;
4. una cadena de auditoría que abarque humanos, agentes, herramientas y código fuente;
5. una capa de gobernanza neutral respecto de proveedores para todos los tenants;
6. un mecanismo para promover lecciones validadas de satélites hacia estándares del Core.

> **Si Evolith no convierte estas seis propiedades en capacidades operativas y medibles, el inversor tiene razón: un stack compuesto puede reemplazar gran parte de la idea del producto.**

---

## 10. Workflow de Validación Asistido por IA

Antes de construir, Evolith debe usar su propia documentación como paquete de evidencia para cuestionamiento e investigación estructurada.

### 10.1 Vía de Investigación de Producto

Usar Claude Desktop, Chat, Research o Cowork con el modelo más potente y apropiado disponible al momento de la ejecución, aplicando un nivel alto de razonamiento cuando se justifique.

Paquete de evidencia:

- Visión Maestra del Producto;
- directivas arquitectónicas y roadmap;
- Discovery Canvas, PRD y objetivos;
- documentación de módulos y ADRs relevantes;
- riesgos, gaps, supuestos, feedback de inversores y análisis comparativos.

Análisis requerido:

1. cuestionar el problema del cliente y el usuario objetivo;
2. identificar contradicciones y supuestos sin evidencia;
3. evaluar productos existentes antes del desarrollo nativo;
4. clasificar capacidades como Adoptar, Embeber, Integrar, Extender, Construir o Rechazar;
5. identificar el diferenciador irreducible de Evolith;
6. proponer experimentos falsables y el corte de producto valioso más pequeño;
7. entregar evidencias, fuentes, incertidumbre y contraargumentos.

Usar Chat o Research para análisis. Usar Cowork cuando se requiera trabajo controlado sobre archivos locales, documentos, hojas de cálculo o aplicaciones conectadas.

### 10.2 Vía de Cuestionamiento de Ingeniería

Después de la revisión humana, usar Claude Code sobre una rama o worktree dedicado. No comenzar generando código.

Workflows recomendados:

- **Superpowers `brainstorming`** para refinamiento socrático, alternativas, diseño aprobado, planificación, TDD, ejecución y revisión.
- **gstack `/office-hours`** para cuestionamiento del producto, desafío de premisas, reformulación, alternativas y generación de un documento de diseño que alimenta revisiones posteriores de CEO, ingeniería, diseño, QA y release.

Secuencia preferida:

```text
Paquete de Evidencia
    -> Investigación de Producto
    -> Revisión Humana
    -> Brainstorming u Office Hours
    -> Registro de Decisión de Producto
    -> Revisión de Arquitectura e Ingeniería
    -> Plan Aprobado
    -> Implementación Controlada
    -> Evidencia Operacional
    -> Lecciones Upstream hacia Evolith Core
```

---

## 11. Resultados Obligatorios de la Validación

| Resultado | Propósito |
|---|---|
| **Reformulación del Problema** | Expresar el problema real del cliente y el resultado deseado |
| **Registro de Supuestos** | Registrar supuestos, confianza, evidencia y método de validación |
| **Matriz de Disposición de Capacidades** | Decidir qué adoptar, embeber, integrar, extender, construir o rechazar |
| **Contraargumento Competitivo** | Explicar cómo un stack compuesto podría reemplazar Evolith |
| **Prueba de Diferenciación** | Definir qué posee Evolith de forma única y cómo se medirá |
| **Plan de Experimentos** | Definir las pruebas mínimas que puedan refutar o respaldar la tesis |
| **Registro de Decisión Humana** | Capturar la conclusión aprobada y la siguiente acción |

---

## 12. Salvaguardas

- La salida de IA es análisis, no autoridad.
- Hechos, inferencias, supuestos e incertidumbre deben permanecer diferenciados.
- No se deben exponer credenciales, secretos de producción ni datos de clientes sin restricciones.
- Las acciones sobre repositorios requieren una rama o worktree controlado.
- La aprobación humana es obligatoria antes de cambiar visión, rulesets, ADRs o gates.
- Las alternativas rechazadas y la incertidumbre no resuelta deben permanecer registradas.
- Ningún modelo, proveedor o skill puede convertirse en dependencia del Core.
- Modelos, precios, planes, licencias y capacidades deben revalidarse al ejecutar el proceso.
- Tracker permanece autoritativo para fases, gates, excepciones y aceptación de evidencia.
- La evidencia externa debe conservar identidad de origen, timestamps, integridad y límites del tenant.

---

## 13. Plan de Prueba de Concepto

Antes de una implementación nativa amplia:

1. conectar una plataforma de gestión de trabajo mediante ACL;
2. conectar un repositorio y pipeline CI como productores de evidencia;
3. trazar un agente autónomo mediante Langfuse;
4. exponer métricas ejecutivas seleccionadas mediante Apache Superset;
5. mapear todos los eventos externos al modelo canónico de evidencia Evolith;
6. ejecutar un corte completo de producto a través de los cinco Phase Gates;
7. medir esfuerzo de integración, gobernanza faltante, costo, experiencia, latencia y reemplazabilidad;
8. convertir solo gaps comprobados en backlog nativo o candidatos ADR.

El éxito exige:

- Tracker conserva autoridad sobre todas las decisiones de gate;
- el linaje de evidencias es completo y seguro por tenant;
- los proveedores son reemplazables sin cambiar el modelo de dominio;
- los usuarios experimentan un proceso coherente;
- la entrega es más rápida que un enfoque completamente nativo;
- la experiencia Evolith compuesta genera valor medible frente a usar las herramientas por separado.

---

## 14. Mensaje de Producto e Inversión

Declaración recomendada de categoría:

> **Evolith es el plano de control de gobernanza para la ingeniería de software AI-Native. Compone sistemas de trabajo, agentes autónomos, observabilidad, analítica, repositorios y herramientas de entrega bajo una sola cadena exigible y auditable desde la idea de negocio hasta producción.**

Mensaje breve recomendado:

> **Jira administra el trabajo. Claude ejecuta trabajo. Langfuse observa la IA. Superset visualiza los datos. Evolith gobierna todo el proceso de ingeniería.**

Mensaje que debe evitarse:

> Evolith es un Jira mejorado con IA.

Ese enfoque elimina la verdadera diferenciación: gobernanza ejecutable, evidencia, herencia, Phase Gates, neutralidad de proveedores, adherencia arquitectónica y auditabilidad E2E.

---

## 15. Decisión Estratégica

Evolith adopta **Composición Gobernada** y **Validación Asistida por IA Antes de Construir** como principios estratégicos:

1. cuestionar las ideas antes de construir;
2. evaluar productos existentes antes del desarrollo nativo;
3. construir únicamente el núcleo irreducible de gobernanza;
4. integrar capacidades commodity mediante contratos reemplazables;
5. preservar control por tenant, linaje de evidencias y autoridad de gates;
6. exigir evidencia medible de que Evolith genera más valor que las mismas herramientas usadas por separado;
7. promover lecciones operacionales reutilizables mediante la gobernanza de Evolith.

Este documento define una dirección estratégica, no un ADR de selección de proveedor.

---

## 16. Evidencia Detallada y Navegación

- [Visión Maestra del Producto Evolith](./evolith-product-vision-master.es.md)
- [Posicionamiento Estratégico y Panorama Comparativo](./evolith-strategic-positioning-comparative-landscape.es.md)
- [Workflow de Validación de Producto Asistido por IA](./evolith-ai-assisted-validation-workflow.es.md)
- [Directivas Arquitectónicas](./architectural-directives.es.md)
- [Roadmap de Estrategia Evolutiva](./evolutionary-strategy-roadmap.es.md)
- [Evaluación de Madurez](./maturity-assessment.es.md)
- [Índice de Visión](./README.es.md)

---

*Este documento consolida el feedback del inversor en una sola estrategia coherente de producto, arquitectura, validación e integración para Evolith.*