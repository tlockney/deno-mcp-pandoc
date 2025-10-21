/**
 * HTTP MCP Server for Pandoc conversions.
 * Uses Streamable HTTP transport for MCP.
 */

import { createServer } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { PandocConverter } from "./converter.ts";
import { validateConversionParams } from "./validation.ts";
import { resolveFilterPaths } from "./filters.ts";
import { validateDefaultsFile } from "./defaults.ts";
import { dirname } from "@std/path";

/**
 * Creates the MCP server instance.
 */
function createMCPServer(): Server {
  const server = new Server(
    {
      name: "deno-mcp-pandoc",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Register the convert-contents tool
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "convert-contents",
          description: "Convert document contents between formats using Pandoc. " +
            "Supports: markdown, html, txt, ipynb, odt, pdf, docx, rst, latex, epub. " +
            "PDF can only be used as output format. Binary formats (PDF, DOCX, EPUB, ODT) require output_file.",
          inputSchema: {
            type: "object",
            properties: {
              contents: {
                type: "string",
                description: "The content to convert (use this OR input_file, not both)",
              },
              input_file: {
                type: "string",
                description: "Path to input file (use this OR contents, not both)",
              },
              input_format: {
                type: "string",
                description: "Input format (default: markdown)",
                default: "markdown",
              },
              output_format: {
                type: "string",
                description: "Output format (default: markdown)",
                default: "markdown",
              },
              output_file: {
                type: "string",
                description: "Path to output file (required for PDF, DOCX, EPUB, ODT)",
              },
              reference_doc: {
                type: "string",
                description: "Path to reference document for styling (DOCX only)",
              },
              defaults_file: {
                type: "string",
                description: "Path to Pandoc defaults YAML file",
              },
              filters: {
                type: "array",
                items: { type: "string" },
                description: "List of Pandoc filter names or paths",
              },
            },
            required: [],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== "convert-contents") {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    const args = request.params.arguments as Record<string, unknown>;

    // Validate parameters
    const { inputFormat, outputFormat } = validateConversionParams({
      contents: args.contents as string | undefined,
      inputFile: args.input_file as string | undefined,
      inputFormat: (args.input_format as string) || "markdown",
      outputFormat: (args.output_format as string) || "markdown",
      outputFile: args.output_file as string | undefined,
      referenceDoc: args.reference_doc as string | undefined,
      defaultsFile: args.defaults_file as string | undefined,
      filters: args.filters as string[] | undefined,
    });

    // Validate defaults file if provided
    let defaultsFileDir: string | undefined;
    if (args.defaults_file) {
      await validateDefaultsFile(args.defaults_file as string);
      defaultsFileDir = dirname(args.defaults_file as string);
    }

    // Resolve filter paths if provided
    let resolvedFilters: string[] | undefined;
    if (args.filters && Array.isArray(args.filters)) {
      resolvedFilters = await resolveFilterPaths(
        args.filters as string[],
        defaultsFileDir,
      );
    }

    // Create converter and perform conversion
    const converter = new PandocConverter();

    if (args.contents) {
      // Convert text content
      const result = await converter.convertText(
        args.contents as string,
        inputFormat,
        outputFormat,
        {
          referenceDoc: args.reference_doc as string | undefined,
          defaultsFile: args.defaults_file as string | undefined,
          filters: resolvedFilters,
        },
      );

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } else if (args.input_file && args.output_file) {
      // Convert file
      await converter.convertFile(
        args.input_file as string,
        args.output_file as string,
        inputFormat,
        outputFormat,
        {
          referenceDoc: args.reference_doc as string | undefined,
          defaultsFile: args.defaults_file as string | undefined,
          filters: resolvedFilters,
        },
      );

      return {
        content: [
          {
            type: "text",
            text: `Successfully converted ${args.input_file} to ${args.output_file}`,
          },
        ],
      };
    } else {
      throw new Error(
        "Invalid arguments: must provide contents or both input_file and output_file",
      );
    }
  });

  return server;
}

/**
 * Main HTTP server entry point.
 */
async function main() {
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

// Run the server if this is the main module
if (import.meta.main) {
  main().catch((error) => {
    console.error("Server error:", error);
    Deno.exit(1);
  });
}
