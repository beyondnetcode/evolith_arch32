# Patrones y Anti-Patrones de IA Agentica

> **Navegacion bilingue:** [Version en ingles](./patterns.md)

## Patrones Aprobados

| Patron | Aplicacion |
|---|---|
| Ensamblaje explicito de contexto | Construye un sobre de contexto tipado con procedencia antes de invocar el agente. |
| Despliegue primero de capacidades de lectura | Prueba seguridad y utilidad con herramientas de solo lectura antes de introducir mutaciones. |
| Gateway de herramientas acotado por capacidad | Enruta herramientas mediante un gateway que comprueba identidad, capacidad, aprobacion y politica de sandbox. |
| Adaptador de accion determinista | Mantiene escrituras de dominio en adaptadores de aplicacion deterministas detras del contrato de herramienta. |
| Evidencia append-only correlacionada | Une solicitud, aprobacion, accion de herramienta y resultado por un identificador de correlacion. |
| Aprobacion humana o de politica | Requiere una aprobacion evaluada independientemente para cada accion mutativa. |

## Anti-Patrones

| Anti-patron | Por que esta prohibido | Correccion requerida |
|---|---|---|
| Prompt como autorizacion | Las instrucciones pueden manipularse y no tienen autoridad de ejecucion. | Aplica capacidad y aprobacion en el gateway de herramientas. |
| Acceso directo a dominio o base de datos | Omite contratos de bounded context, auditoria y minimo privilegio. | Usa un adaptador de aplicacion determinista con propietario. |
| Runtime de agente compartido y de larga vida | Estado o credenciales pueden filtrarse entre ejecuciones. | Usa ejecucion aislada efimera con recursos acotados. |
| Texto recuperado como politica | La inyeccion indirecta de prompt puede alterar el comportamiento. | Tratalo como dato y valida procedencia y schema. |
| Reintento autonomo sin limites | Puede amplificar un fallo inseguro o mutativo. | Usa reintentos finitos conscientes de idempotencia solo para lecturas. |
| Expansion oculta de herramientas | Un cambio de prompt o dependencia aumenta autoridad silenciosamente. | Declara y valida cada herramienta, capacidad y destino de red. |

## Regla de Limite

Un agente puede proponer o invocar una accion gobernada, pero nunca posee invariantes de negocio. El bounded context y su capa de aplicacion determinista validan el comando, aplican su propia autorizacion y emiten su evidencia normal de auditoria y dominio.

---
[Volver al Perfil de IA Agentica](./README.es.md)
