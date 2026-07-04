# Model Context Protocol (MCP) Overview


---

## What is MCP?
El **Protocolo de contexto modelo (MCP)** es un estándar abierto lanzado en 2024 (inicialmente defendido por Anthropic) que resuelve el problema de la conectividad caótica en el mundo agente.

Históricamente, cada marco de IA (LangChain, LlamaIndex, Semantic Kernel) tenía su propia forma de definir conectores a bases de datos o API. MCP estandariza esto a través de una arquitectura cliente-servidor universal, desvinculando completamente la fuente de datos del modelo de lenguaje consumidor.
## Relevance to our Architecture
La adopción de MCP nos permite convertir nuestros microservicios existentes (TMS, WMS, ERP, CRM) en **Contexto universal y fuentes de herramientas** para CUALQUIER agente corporativo.

En lugar de crear un chatbot que consuma nuestra API REST directamente con código personalizado, creamos un **Servidor MCP de inventario**. Ese servidor puede conectarse instantáneamente a Claude Code, Cursor, un agente Python o una solución .NET, sin escribir código de integración adicional.
## Protocol Analogy
> **MCP es para los Agentes de IA lo que REST/OpenAPI fue para los Microservicios en 2010.** Es el estándar canónico de interoperabilidad que unifica la comunicación.
## Basic MCP Architecture
El ecosistema se basa en tres roles bien definidos:

1. **Host (aplicación host):** El software que opera el usuario (IDE como Cursor, Claude Desktop App, nuestra propia aplicación web).
2. **Cliente (Cliente MCP):** El software integrado en el Host que inicia la conexión bidireccional.
3. **Servidor (servidor MCP):** Un proceso local o remoto que expone capacidades a través de stdio o HTTP/SSE.
### Capabilities Exposed by an MCP Server
* **Recursos:** Equivalente a una operación GET. Lecturas de archivos, registros de bases de datos, logs.
* **Herramientas:** Equivalente a una operación POST/PUT/DELETE. Funciones ejecutables con efectos secundarios (por ejemplo, enviar un correo electrónico, cancelar un pedido).
* **Mensajes:** Plantillas de mensajes predefinidos que simplifican tareas complejas y repetibles.
## Official Reference
Para leer las especificaciones técnicas detalladas, visite: [https://modelcontextprotocol.io](https://modelcontextprotocol.io)

---
[Volver al índice](./README.md)