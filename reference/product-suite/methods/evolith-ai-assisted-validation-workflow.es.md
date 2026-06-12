# Evolith — Workflow de Validación de Producto Asistido por IA

> **Navegación Bilingüe:** [English Version](./evolith-ai-assisted-validation-workflow.md)

**Estado:** Workflow Estratégico Activo  
**Propietario:** Evolith Architecture Board  
**Documento Padre:** [Visión Maestra del Producto Evolith](../vision/evolith-product-vision-master.es.md)  
**Documento Complementario:** [Posicionamiento Estratégico y Panorama Comparativo](../positioning/evolith-strategic-positioning-comparative-landscape.es.md)  
**Origen:** Sesión de feedback con inversor, 2026-06-09  
**Creado:** 2026-06-10  
**Última Actualización:** 2026-06-10

---

## 1. Propósito

Usar la documentación, ideas, supuestos y preguntas abiertas de Evolith como entrada para un proceso riguroso de validación asistido por IA antes de comprometer una implementación.

Este workflow sirve para discovery, cuestionamiento, comparación y soporte de decisiones. No autoriza a una herramienta de IA a modificar la Visión de Producto ni a crear decisiones obligatorias del Core sin revisión humana.

---

## 2. Workflow Recomendado de Dos Vías

### 2.1 Vía de Investigación de Producto — Claude Desktop, Chat, Research o Cowork

Usar el modelo Claude de propósito general más potente disponible al momento de la ejecución, con el mayor esfuerzo de razonamiento que se justifique. El inversor recomendó específicamente Claude Opus 4.8 con esfuerzo máximo según la fecha del feedback.

Cargar un paquete de evidencia curado que contenga:

- Visión Maestra del Producto;
- directivas arquitectónicas y roadmap;
- Discovery Canvas, PRD y objetivos del producto;
- análisis comparativos y de mercado;
- gaps abiertos, riesgos, supuestos y feedback de inversores;
- documentación de módulos y ADRs relevantes.

Solicitar al modelo que:

1. cuestione el problema y el cliente objetivo;
2. identifique supuestos ocultos y contradicciones;
3. determine qué capacidades deben adoptarse, integrarse, extenderse o construirse;
4. compare alternativas open source, free-tier y comerciales;
5. identifique el diferenciador irreducible de Evolith;
6. proponga experimentos falsables y el corte de producto valioso más pequeño;
7. produzca evidencias, enlaces de fuentes, incertidumbres y contraargumentos.

Usar Claude Chat o Research para análisis. Usar Cowork cuando la tarea requiera trabajo controlado sobre archivos, carpetas, documentos, hojas de cálculo o aplicaciones conectadas.

### 2.2 Vía de Cuestionamiento de Ingeniería — Claude Code con Skills Estructuradas

Después de revisar la hipótesis del producto, usar Claude Code sobre una rama controlada del repositorio. No comenzar generando código.

Dos sistemas recomendados son:

- **Superpowers `brainstorming`**: refinamiento socrático, alternativas, aprobación de diseño, planificación, TDD, implementación y revisión.
- **gstack `/office-hours`**: cuestionamiento del producto, desafío de premisas, reformulación, alternativas y creación de un documento de diseño que alimenta revisiones posteriores.

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
    -> Evidencias y Lecciones Promovidas a Evolith
```

---

## 3. Salvaguardas

- Tratar la salida de IA como análisis, no como autoridad.
- Preservar enlaces a fuentes y separar hechos de inferencias.
- No exponer credenciales, secretos de producción ni datos de clientes sin restricciones.
- Usar una rama o worktree dedicado para acciones sobre el repositorio.
- Exigir aprobación humana antes de cambiar visión, rulesets, ADRs o Phase Gates.
- Registrar alternativas rechazadas e incertidumbres no resueltas.
- No convertir el modelo o skill seleccionado en una dependencia del Core.
- Revalidar nombres de modelos, precios, planes y capacidades al ejecutar el workflow.

---

## 4. Resultados Obligatorios

| Resultado | Propósito |
|---|---|
| **Reformulación del Problema** | Expresar el problema real del cliente y el resultado deseado |
| **Registro de Supuestos** | Listar supuestos, confianza, evidencia y método de validación |
| **Matriz de Disposición de Capacidades** | Clasificar capacidades como Adoptar, Embeber, Integrar, Extender, Construir o Rechazar |
| **Contraargumento Competitivo** | Explicar cómo una composición de herramientas podría reemplazar Evolith |
| **Prueba de Diferenciación** | Identificar qué posee Evolith de forma única y cómo se medirá |
| **Plan de Experimentos** | Definir pruebas mínimas que puedan refutar o respaldar la tesis |
| **Registro de Decisión** | Capturar la conclusión aprobada por humanos y la siguiente acción |

---

## 5. Criterios de Aceptación

El workflow tiene éxito solo cuando:

- los principales supuestos tienen evidencia o experimentos explícitos;
- se evalúan herramientas existentes antes de construir de forma nativa;
- el corte de producto recomendado es más pequeño y comprobable que la idea original;
- los riesgos y contraargumentos permanecen visibles;
- las decisiones son aprobadas por humanos responsables;
- toda lección reusable se propone upstream según la gobernanza de Evolith.

---

## 6. Relación y Navegación

- [Visión Maestra del Producto Evolith](../vision/evolith-product-vision-master.es.md)
- [Posicionamiento Estratégico y Panorama Comparativo](../positioning/evolith-strategic-positioning-comparative-landscape.es.md)
- [Directivas Arquitectónicas](../architecture/architectural-directives.es.md)
- [Roadmap de Estrategia Evolutiva](../strategy/evolutionary-strategy-roadmap.es.md)
- [Índice de Visión](./README.es.md)

---

*Este workflow convierte el consejo del inversor en un mecanismo repetible de validación, preservando la gobernanza humana y la neutralidad de proveedores de Evolith.*