const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
console.log('Server:', typeof Server);
console.log('StdioServerTransport:', typeof StdioServerTransport);
console.log('ListToolsRequestSchema:', !!ListToolsRequestSchema);
