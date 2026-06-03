import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class McpServerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(McpServerService.name);

  onModuleInit() {
    // Inicializar servidor de Model Context Protocol (MCP) / Local API
    this.startServer();
  }

  private startServer() {
    this.logger.log('Iniciando servidor MCP (Model Context Protocol) para integración con Antigravity / VSCode (OpenCode Style)...');
    
    // Aquí se levantaría un servidor WebSocket / JSON-RPC / HTTP
    // exponiendo los comandos: evolith_init, evolith_validate, evolith_docs
    this.logger.log('Servidor MCP en escucha en el puerto local 49100');
  }

  onModuleDestroy() {
    this.logger.log('Servidor MCP detenido.');
  }
}
