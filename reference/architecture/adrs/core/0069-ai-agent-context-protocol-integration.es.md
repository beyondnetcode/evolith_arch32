# ADR-0069: Integración de Protocolo de Contexto para Agentes IA

## Estado
Aprobado

## Fecha
2026-06-06

## Contexto y Problema
Evolith Core proporciona conjuntos de reglas de gobernanza (ACL, Open-Core Boundary, Executive Scorecards) que los agentes de IA deben consumir para hacer cumplir las decisiones arquitectónicas. Actualmente, los agentes acceden a la gobernanza a través de comandos CLI manuales o lectura directa de archivos. Esto crea una aplicación inconsistente y obliga a cada agente a implementar lógica personalizada para analizar los artefactos.

## Objetivo y Alcance
Estandarizar cómo los modelos y agentes de IA interactúan con herramientas externas y recursos arquitectónicos para garantizar una única fuente de verdad para el acceso a los conjuntos de reglas.

## Opciones Consideradas
- **Seleccionada:** Integración de Protocolo de Contexto para Agentes IA
- **Otras:** APIs REST personalizadas para agentes (rechazadas por falta de estandarización), Acceso directo a archivos (rechazado por el análisis inconsistente de los agentes).

## Decisión y Justificación
Adoptar una implementación estandarizada de un **Protocolo de Contexto para Agentes IA** para exponer la gobernanza arquitectónica nativamente a los asistentes de IA.

La integración debe proporcionar:
- **Herramientas (Tools)**: Funciones de validación ejecutables que los agentes pueden invocar (ej. validación de repositorio contra conjuntos de reglas).
- **Recursos (Resources)**: Acceso de solo lectura a los artefactos de gobernanza.
- **Prompts**: Plantillas estandarizadas que los agentes pueden solicitar para formatear su salida o análisis.

*(Ejemplo de implementación: Servidor Model Context Protocol (MCP) envolviendo un CLI/SDK subyacente).*

**Actualización de Arquitectura (2026-06-30):** El servidor MCP estaba empaquetado inicialmente dentro del CLI. Para preservar un límite limpio y reducir el tamaño del CLI, el servidor MCP ha sido desacoplado completamente del paquete del CLI y ahora se despliega como un ejecutable independiente.

## Evidencias y Criterios de Evaluación
Evaluado contra el principio de automatización y estandarización. Utilizar un protocolo estandarizado permite que múltiples agentes de IA compatibles (ej. Claude Desktop, bots personalizados) consuman la gobernanza de Evolith de manera consistente sin integraciones a medida.

## Consecuencias, Riesgos y Trade-offs

### Positivas
- Los agentes de IA pueden consumir la gobernanza de Evolith de forma nativa a través de protocolos estandarizados.
- Aplicación de validación consistente en todas las implementaciones de agentes.
- Una única fuente de verdad para el acceso a conjuntos de reglas a través de herramientas, recursos y prompts.

### Negativas
- Carga de mantenimiento adicional para el servidor de protocolo.
- Las pruebas de cumplimiento del protocolo añaden complejidad al CI.

## Referencias
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io)

## Decisiones y Estándares Relacionados
- Ninguna

---
[Volver al Índice](./README.es.md)

> **Agent Signature:** Architect Agent
