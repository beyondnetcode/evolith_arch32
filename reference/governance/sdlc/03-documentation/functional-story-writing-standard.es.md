# Estandar de Redaccion de Historias Funcionales

> **Navegación Bilingüe:** [English Version](./functional-story-writing-standard.md)

Este estandar es obligatorio para repositorios satelite que creen Historias Funcionales, Casos de Uso, flujos de PRD o requisitos bajo el modelo de gobernanza progressive architecture reference and spec-driven AI-DD.

El objetivo es simple: Product Owners y Analistas de Negocio deben poder entender el comportamiento de negocio sin leer detalle de implementacion, mientras que Desarrollo recibe restricciones tecnicas precisas dentro del mismo artefacto.

---

## 1. Estructura Obligatoria

Toda Historia Funcional o artefacto equivalente de requisito funcional DEBE usar esta estructura:

1. **Proposito de Negocio**: que problema resuelve y por que importa.
2. **Actores**: participantes principales y secundarios descritos por responsabilidad de negocio.
3. **Precondiciones de Negocio**: condiciones de negocio requeridas antes de iniciar el flujo.
4. **Flujo Funcional Principal**: narrativa de negocio orientada al usuario.
5. **Flujos Alternativos y Excepciones**: resultados de negocio ante rechazo, duplicidad, estado invalido, informacion faltante o servicio no disponible.
6. **Reglas de Negocio**: reglas de dominio validables por Product Owner.
7. **Criterios de Aceptacion**: resultados observables y verificables por PO/QA.
8. **Requisitos Tecnicos**: restricciones de implementacion para ingenieria.
9. **Trazabilidad**: ADRs, entidades, technical enablers, APIs, integraciones, eventos o artefactos operativos relacionados.

---

## 2. Reglas de Narrativa Funcional

Las secciones funcionales DEBEN ser legibles por Product Owner o Analista de Negocio.

Las secciones funcionales NO DEBEN iniciar con:

- rutas de API o metodos HTTP,
- nombres de protocolos,
- detalles de motor de base de datos,
- detalles de implementacion de cache,
- ejemplos de payload,
- nombres de clases de excepcion,
- frameworks o librerias,
- comportamiento especifico de infraestructura.

Esos detalles pertenecen a **Requisitos Tecnicos**.

---

## 3. Reglas de Requisitos Tecnicos

La seccion de Requisitos Tecnicos DEBE capturar:

- APIs/endpoints,
- entidades y tablas,
- persistencia, cache e invalidacion,
- controles de seguridad,
- eventos de auditoria,
- codigos de error,
- requisitos de protocolos o tokens,
- contratos de integracion,
- restricciones derivadas de ADRs o technical enablers.

Esta seccion existe para que Desarrollo tenga precision sin hacer mas dificil la lectura funcional.

---

## 4. Reglas de Criterios de Aceptacion

Los criterios de aceptacion DEBEN ser observables y validables desde negocio. Describen resultados esperados, no pasos de implementacion.

Correcto:

- "El patrocinador puede ver si la solicitud fue aprobada o rechazada."
- "El sistema evita que usuarios externos reciban perfiles administrativos internos."

Evitar en criterios funcionales:

- "La API retorna `403 Forbidden`."
- "Se invalidan llaves de Redis."
- "La base de datos escribe en `APPROVAL_REQUEST`."

Mover esos detalles a Requisitos Tecnicos.

---

## 5. Cumplimiento en Repositorios Satelite

Los repositorios satelite PUEDEN extender este estandar con ejemplos especificos del dominio, pero NO DEBEN eliminar la estructura obligatoria ni volver a mezclar detalles de implementacion en las secciones de narrativa funcional.

Los repositorios satelite DEBEN referenciar este estandar desde su indice local de historias funcionales o portal de requisitos.
