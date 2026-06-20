# Guia de Operacion de IA Agentica

> **Navegacion bilingue:** [Version en ingles](./operations.md)

## Modelo Operativo

Opera cada agente como una carga de trabajo identificable con configuracion declarada, implementacion determinista versionada, conjunto de capacidades acotado y propietario de herramienta responsable. Despliega configuracion e implementacion juntas para que el contrato evaluado identifique el codigo y las herramientas que realmente se ejecutan.

## Observabilidad y Evidencia

Registra un identificador de correlacion para cada solicitud, adquisicion de contexto, decision de politica, decision de aprobacion, llamada de herramienta, resultado, cancelacion y denegacion. La evidencia debe ser append-only y suficiente para reconstruir que identidad, capacidad, politica y aprobador autorizaron una accion sin registrar secretos ni datos personales innecesarios.

## Gestion de Cambios

Trata una herramienta, capacidad, fuente de contexto, destino de red o comportamiento mutativo nuevo como un cambio controlado. Revalida politica Native y OPA, ejecuta fixtures negativos, revisa los ADR afectados y obten aprobacion del propietario de la herramienta antes de promoverlo. Un cambio solo de prompt no puede omitir esta revision cuando modifica la autoridad solicitada.

## Manejo de Incidentes

Deshabilita primero la capacidad o herramienta afectada, preservando sandbox y evidencia. Investiga mediante evidencia de correlacion, revoca credenciales delegadas y rehabilita solo despues de revisar la causa raiz y la actualizacion relevante de contrato, politica, prueba o ADR.

## Objetivos de Servicio

Define un timeout de ejecucion y presupuesto de recursos explicitos por capacidad. Monitorea acciones denegadas, latencia de aprobacion, salidas de sandbox, fallos de herramienta, contexto invalido y fallos de evaluacion de politica. Alerta ante solicitudes de autoridad inesperadas y denegaciones repetidas; indican un desajuste de limite, no una invitacion a debilitar controles.

---
[Volver al Perfil de IA Agentica](./README.es.md)
