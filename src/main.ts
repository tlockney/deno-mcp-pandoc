/**
 * Unified entry point for MCP Pandoc server.
 * Supports both stdio (default) and HTTP transports.
 */

import { parseArgs } from "@std/cli/parse-args";
import { createServer } from "node:http";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMCPServer } from "./mcp.ts";

/**
 * Starts the server with stdio transport (for Claude Desktop).
 */
async function startStdioServer() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Deno MCP-Pandoc server running on stdio");
}

/**
 * Starts the server with HTTP transport (for web applications).
 */
async function startHttpServer() {
  const port = parseInt(Deno.env.get("PORT") || "3000");
  const host = Deno.env.get("HOST") || "localhost";

  // Create a single MCP server instance
  const mcpServer = createMCPServer();

  // Create HTTP server using Node.js compatibility
  const httpServer = createServer(async (req, res) => {
    const url = req.url || "/";

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
    };

    // Add CORS headers to all responses
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check endpoint
    if (url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          service: "deno-mcp-pandoc",
          version: "1.0.0",
        }),
      );
      return;
    }

    // MCP SSE endpoint - handles both SSE streams and direct requests
    if (url.startsWith("/sse") || url.startsWith("/mcp")) {
      try {
        // Create a new transport for this connection
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // Stateless mode
        });

        // Connect the server to this transport
        await mcpServer.connect(transport);

        // Handle the request
        await transport.handleRequest(req, res);
      } catch (error) {
        console.error("MCP request error:", error);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
      }
      return;
    }

    // 404 for unknown routes
    res.writeHead(404);
    res.end("Not Found");
  });

  httpServer.listen(port, host, () => {
    console.log(`🚀 Deno MCP-Pandoc HTTP server running on http://${host}:${port}`);
    console.log(`   Health check: http://${host}:${port}/health`);
    console.log(`   SSE endpoint: http://${host}:${port}/sse`);
    console.log(`   MCP endpoint: http://${host}:${port}/mcp`);
  });
}

/**
 * Main entry point - parses CLI args and starts appropriate server.
 */
async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["http", "help"],
    alias: {
      h: "help",
    },
  });

  if (args.help) {
    console.log(`
Deno MCP-Pandoc Server

Usage:
  mcp-pandoc              Start server with stdio transport (default)
  mcp-pandoc --http       Start server with HTTP transport

Options:
  --http                  Use HTTP/SSE transport instead of stdio
  -h, --help             Show this help message

Environment variables (HTTP mode only):
  PORT                    HTTP server port (default: 3000)
  HOST                    HTTP server host (default: localhost)

Examples:
  mcp-pandoc                           # Stdio mode for Claude Desktop
  mcp-pandoc --http                    # HTTP mode on localhost:3000
  PORT=8080 mcp-pandoc --http          # HTTP mode on localhost:8080
  HOST=0.0.0.0 PORT=3000 mcp-pandoc --http  # HTTP mode on all interfaces
`);
    Deno.exit(0);
  }

  if (args.http) {
    await startHttpServer();
  } else {
    await startStdioServer();
  }
}

// Run the server if this is the main module
if (import.meta.main) {
  main().catch((error) => {
    console.error("Server error:", error);
    Deno.exit(1);
  });
}
