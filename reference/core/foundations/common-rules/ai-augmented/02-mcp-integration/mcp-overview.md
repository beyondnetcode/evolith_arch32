# Model Context Protocol (MCP) Overview

## What is MCP?
The **Model Context Protocol (MCP)** is an open standard launched in 2024 (initially championed by Anthropic) resolving the problem of chaotic connectivity in the agentic world.

Historically, each AI framework (LangChain, LlamaIndex, Semantic Kernel) had its own way of defining connectors to databases or APIs. MCP standardizes this via a universal Client-Server architecture, completely decoupling the data source from the consuming language model.

## Relevance to our Architecture
Adopting MCP allows us to convert our existing microservices (TMS, WMS, ERP, CRM) into **Universal Context and Tooling Sources** for ANY corporate agent.

Instead of building a chatbot consuming our REST API directly with custom code, we create an **Inventory MCP Server**. That server can instantly connect to Claude Code, Cursor, a Python agent, or a .NET solution, without writing additional integration code.

## Protocol Analogy
> **MCP is for AI Agents what REST/OpenAPI was for Microservices in 2010.** It is the canonical interoperability standard unifying communication.

## Basic MCP Architecture

The ecosystem relies on three well-defined roles:

1. **Host (Host application):** The software the user operates (IDE like Cursor, Claude Desktop App, our own Web App).
2. **Client (MCP Client):** The software embedded in the Host initiating bidirectional connection.
3. **Server (MCP Server):** A local or remote process exposing capabilities through stdio or HTTP/SSE.

### Capabilities Exposed by an MCP Server
* **Resources:** Equivalent to a GET operation. File reads, database records, logs.
* **Tools:** Equivalent to a POST/PUT/DELETE operation. Executable functions with side effects (e.g., Send an email, cancel an order).
* **Prompts:** Predefined prompt templates simplifying complex, repeatable tasks.

## Official Reference
To read the deep technical spec, visit: [https://modelcontextprotocol.io](https://modelcontextprotocol.io)

---
[Back to Index](./README.md)
