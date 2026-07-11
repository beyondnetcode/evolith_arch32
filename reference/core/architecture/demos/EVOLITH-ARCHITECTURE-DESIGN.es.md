# Evolith Architecture Design [DEPRECATED]

> **Aviso de deprecación:** este documento se conserva solo como contraparte bilingüe
> y referencia histórica. La fuente arquitectónica vigente es
> [C4-MASTER-ARCHITECTURE.es.md](./C4-MASTER-ARCHITECTURE.es.md).

**Versión:** 2.3.0  
**Fecha:** 2026-06-30  
**Estado:** Deprecado; reemplazado por el hub C4 maestro.

---

## 1. Visión General

El diseño operativo vigente debe leerse desde el hub C4. Esta vista histórica queda
solo para continuidad de enlaces y paridad bilingüe.

### 1.1 Diagrama de sistema (canónico)

El diagrama canónico vive ahora en el nivel 1 del modelo C4.

## 2. Principios Arquitectónicos Aplicados

Los principios siguen siendo fuente estructurada, gobernanza ejecutable,
trazabilidad, aislamiento por límites de dominio y evolución progresiva.

## 3. Fuente de Verdad Operativa

La fuente operativa se expresa en rulesets, schemas, paquetes ejecutables,
perfiles de runtime y artefactos de referencia versionados.

## 4. Relación Markdown ↔ Rulesets ↔ Schemas ↔ OPA

La relación vigente se documenta en el hub C4 y en los módulos de código de nivel 4:
Markdown explica, rulesets/schemas formalizan y los evaluadores Native/OPA ejecutan.

## 5. Arquitectura de Alta Disponibilidad 24/7

Las decisiones de disponibilidad deben interpretarse por producto y runtime; el core
de referencia evita asumir infraestructura única.

### 5.1 Puntos de Falla Identificados y Mitigaciones

Los riesgos principales son degradación de dependencias, cache, transporte MCP/HTTP,
ejecución de agentes y drift documental frente al código.

### 5.2 Health Checks (implementado)

El código vigente expone health checks en las superficies implementadas y mantiene
validadores documentales como controles de salud del corpus.

### 5.3 Probes en Docker / k8s

Las probes concretas pertenecen al runtime o producto aplicado; el baseline no fuerza
un proveedor de despliegue.

### 5.4 Degradación Controlada

El diseño favorece degradación explícita: cache opcional, adaptadores desacoplados y
contratos que permiten fallar rápido cuando falta evidencia o configuración.

## 6. Estrategia de Performance

La performance se trata como propiedad verificable por superficie: API, MCP, CLI,
runtime de agentes y evaluadores.

### 6.1 Cache

El cache es opcional y debe ser reemplazable; Redis puede actuar como optimización,
no como fuente primaria de verdad.

### 6.2 Rate Limiting

El rate limiting pertenece a la frontera de API, gateway o transporte según el
producto que consuma el core.

### 6.3 Pendientes de Implementar

Los pendientes vivos se siguen en el Gap Tracking Board, no en este documento
deprecado.

## 7. Estrategia de Resiliencia

La resiliencia se basa en contratos claros, validación temprana, separación de
adaptadores y recuperación observable.

### 7.1 Implementado

El baseline implementado ya incluye validadores CI, evaluadores ejecutables,
contratos de API y documentación de superficies.

### 7.2 Pendiente

Los elementos pendientes se mantienen en el catálogo de gaps y en ADRs aceptadas.

## 8. Estrategia de Observabilidad

La observabilidad debe cubrir decisiones, evidencia, trazas de agente, auditoría MCP
y métricas operativas.

### 8.1 Implementado

Existen endpoints, reportes y validaciones que producen evidencia auditable para el
corpus y las superficies principales.

### 8.2 Gaps Pendientes

Los gaps de observabilidad no se gobiernan aquí; se rastrean en la matriz y catálogo
de gaps vigentes.

## 9. Estrategia de Seguridad y Gobernanza

La seguridad se expresa como contratos, ABAC donde aplica, auditoría, políticas de
aprobación y aislamiento del core respecto de estado tenant canónico.

### 9.1 Implementado

Las superficies implementadas incluyen controles de validación, guards/adaptadores y
reglas documentadas de gobernanza.

### 9.2 Pendiente (requiere decisión arquitectónica)

Las decisiones pendientes requieren ADR o gap formal; no deben resolverse desde este
documento histórico.

## 10. Modelo de Integración entre Componentes

El modelo vigente integra Core API, MCP Server, Agent Runtime, Evolith CLI, paquetes de
dominio/evaluación y corpus de rulesets/schemas.

## 11. Modelo de Tenant (Core tenant-agnóstico, ADR-0101)

El core es stateless y tenant-agnóstico para estado canónico de producto. Tracker u
otro producto externo es responsable de tenant, producto, iniciativa, aprobaciones y
experiencia humana.

### Artefactos legacy (diseño tenant-aware superado)

Los artefactos tenant-aware previos son históricos o transicionales y no redefinen la
responsabilidad canónica del core.

## 12. Recomendaciones Finales

Usar el hub C4 como contrato arquitectónico vigente, mantener el código como fuente
de verdad verificable y registrar cualquier evolución como ADR, gap o actualización
bilingüe.
