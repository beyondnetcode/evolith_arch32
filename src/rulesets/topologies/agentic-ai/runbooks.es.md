# Runbooks de Incidentes de IA Agentica

> **Navegación Bilingüe:** [English Version](./runbooks.md)

Estos runbooks aplican a todo adoptante de la topologia de IA agentica. Conserva evidencia de correlacion sin recopilar prompts, secretos, credenciales ni datos personales innecesarios. No restaures autoridad solo para continuar una tarea interrumpida.

## Bloqueo de Agente

**Disparador:** Una ejecucion excede su timeout declarado, deja de emitir progreso esperado o retiene capacidad MCP sin completarse.

1. Deten nuevo trabajo para la capacidad afectada y cancela sus llamadas pendientes a herramientas.
2. Conserva el identificador de correlacion, decisiones de politica, metadatos de llamadas a herramientas, timeout y contadores de recursos.
3. Revoca la credencial delegada de la ejecucion; no la reutilices para reintentar.
4. Inspecciona la ultima accion acotada y la salud de las dependencias. Corrige la implementacion determinista, el contrato de herramienta o el limite declarado antes de reintentar.
5. Reanuda con una credencial nueva y alcance reducido solo despues de que el propietario de la herramienta apruebe la recuperacion.

## Desborde de Tokens

**Disparador:** El prompt, la finalizacion o el contexto combinado alcanza su limite de tokens declarado, o el calculo previo predice que lo hara.

1. Rechaza o cancela la ejecucion antes de enviar contexto adicional al modelo.
2. Conserva contadores de tokens, evidencia de correlacion e identificadores de fuentes de contexto aprobadas; no registres el contenido de los tokens.
3. Elimina contexto no esencial, no confiable o duplicado y divide el trabajo en pasos acotados e independientes.
4. No eleves un presupuesto durante el incidente. Todo cambio permanente de presupuesto sigue revision de cambio controlado y validacion Native/OPA.
5. Reintenta solo con un nuevo calculo previo que respete todos los limites declarados.

## Accion No Aprobada

**Disparador:** Una herramienta mutativa es invocada, intentada o reportada como completada sin aprobacion humana o de politica registrada.

1. Deshabilita inmediatamente la herramienta y la capacidad afectadas; cancela el trabajo relacionado.
2. Revoca las credenciales delegadas dentro del limite de propagacion configurado y conserva evidencia correlacionada append-only.
3. Determina si la accion se ejecuto. Si fue asi, contenla y reviertela mediante el procedimiento de recuperacion aprobado del sistema propietario.
4. Investiga la ruta de aprobacion, la entrada de politica, la implementacion y el rastro de auditoria de la herramienta. Trata la evidencia faltante como un fallo de autorizacion.
5. Restaura la herramienta solo despues de que el propietario apruebe la remediacion y pasen el contrato modificado, la regla Native, la politica OPA y las pruebas negativas.

## Escape del Sandbox

**Disparador:** El agente alcanza un proceso no declarado, destino de red, limite de filesystem, capacidad del host o nivel de privilegio.

1. Aisla el ejecutor del acceso de red y herramientas; detén todas las capacidades que compartan su imagen de sandbox o limite de host.
2. Revoca todas las credenciales accesibles desde el ejecutor y rota las credenciales que puedan haberse expuesto.
3. Conserva la imagen de sandbox, registros de decisiones de politica, evidencia de correlacion y logs de auditoria de plataforma para investigacion.
4. Reconstruye desde una imagen conocida como buena, elimina la ruta de escape y verifica controles deny o allowlist antes de reconectarlo.
5. Exige aprobacion del responsable de seguridad y validacion exitosa de sandbox, Native, OPA y fixtures negativos antes de rehabilitar el trabajo.

---
[Volver a la Guia de Operacion](./operations.es.md)
