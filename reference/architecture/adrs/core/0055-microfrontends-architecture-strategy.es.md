# ADR-0055: Estrategia de Arquitectura de Microfrontends

## Estado

Propuesto (Preparacion para Fase 3)

## Contexto

La arquitectura de Monolito Progresivo prioriza primero la modularidad y luego la distribucion. El mismo principio aplica al frontend web: los productos Evolith DEBERIAN iniciar con una **UI monolitica modular**, no con microfrontends distribuidos.

Empezar con microfrontends demasiado pronto introduce complejidad operativa y arquitectonica evitable:
* configuracion de shell/orquestador antes de que exista una necesidad real de escala,
* multiples pipelines CI/CD frontend antes de requerir despliegue independiente,
* coordinacion de dependencias compartidas y versiones runtime,
* complejidad de routing y gestion de estado entre MFEs,
* mayor riesgo de inconsistencia visual si se omite el sistema de diseno.

A medida que el sistema alcanza la Fase 3 (Servicios Distribuidos), la aplicacion frontend puede enfrentar desafios similares:
* **Contencion de Despliegue**: Multiples equipos necesitando desplegar cambios en la misma UI monolitica.
* **Bloqueo Tecnologico**: Dificultad para actualizar partes de la UI a versiones mas recientes de frameworks.
* **Complejidad de Escala**: Un solo bundle grande se vuelve dificil de gestionar y optimizar.

## Decision

Adoptaremos una estrategia de **Microfrontends (MFE)** solo como **estrategia de extraccion de Fase 3+**, no como linea base inicial del frontend.

Los productos Evolith DEBEN seguir esta progresion:

| Fase | Modelo de entrega UI | Guia |
|---|---|---|
| Fase 1 | Aplicacion web monolitica modular | Usar una sola aplicacion React desplegable con limites internos claros por feature, ruta y bounded context. |
| Fase 2 | UI modular con mayor ownership de dominio | Mantener una sola UI desplegable mientras se fortalece lazy loading por ruta, gobierno del sistema de diseno, fronteras API y mapeo de referencia aplicada. |
| Fase 3+ | Microfrontends por excepcion | Extraer MFEs solo cuando la escala de equipos, la contencion de despliegues o los ciclos de vida independientes justifiquen la complejidad adicional. |

Los microfrontends NO DEBEN usarse como arquitectura inicial por defecto, decision por moda o sustituto de un buen diseno frontend modular.

### Principios Clave:

1. **Empezar Modular, No Distribuido**: Construir primero una sola aplicacion React modular. La distribucion es una decision de extraccion, no un default.
2. **Propiedad Vertical**: Los equipos que poseen un servicio de dominio backend pueden poseer el fragmento UI correspondiente cuando la extraccion de Fase 3 este justificada.
3. **Integracion en Tiempo de Ejecucion**: Usar **Module Federation** (Vite o Webpack 5) como mecanismo principal solo despues de aprobar la extraccion MFE.
4. **Sistema de Diseno Compartido**: Todos los MFEs DEBEN utilizar el sistema de diseno corporativo (Variables CSS, Componentes Compartidos) para asegurar consistencia visual.
5. **Alineacion con BFF**: Cada MFE de cara al cliente debe comunicarse a traves de su BFF (Backend-for-Frontend) especifico o un Gateway unificado.

### Disparadores de Extraccion (Cuando pasar a MFEs):

* El tamano del equipo supera los 15-20 desarrolladores frontend.
* La frecuencia de despliegue de modulos especificos supera la tolerancia del ciclo de lanzamiento principal.
* Requisito de ciclos de vida tecnologicos independientes en secciones aisladas de la UI.
* Un area UI acotada tiene ownership claro, contratos estables y necesidades medibles de independencia de release.

## Consecuencias

* **Positivo**: Desplegabilidad independiente, opciones tecnologicas localizadas y mayor autonomia del equipo cuando la organizacion alcanza escala de Fase 3.
* **Negativo**: Mayor complejidad de infraestructura (pipelines CI/CD por MFE), riesgo de inconsistencia visual si se ignora el sistema de diseno y sobrecarga inicial en la configuracion del orquestador.
* **Neutral**: Requiere una aplicacion "Shell" u "Orquestador" centralizada para gestionar routing y estado compartido.
* **Gobernanza**: Cualquier producto que introduzca MFEs antes de Fase 3 DEBE documentar una desviacion ADR explicita con evidencia de negocio, escala de equipo y despliegue.

## Objetivo y Alcance

Backfill histórico: Abordar la tensión arquitectónica donde la arquitectura de Monolito Progresivo prioriza primero la modularidad y luego la distribucion, estableciendo un límite estándar.

## Opciones Consideradas

- **Seleccionada:** Estrategia de Arquitectura de Microfrontends
- **Otras:** Desconocido (el registro histórico no enumera explícitamente alternativas rechazadas).

## Evidencias y Criterios de Evaluación

Desconocido (registro histórico; evaluado contra principios generales de arquitectura como mantenibilidad y confiabilidad).

## Decisiones y Estándares Relacionados

Ninguna explícitamente enlazada.

> **Agent Signature:** Architect Agent
