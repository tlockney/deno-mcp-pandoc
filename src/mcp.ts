/**
 * Shared MCP server creation logic.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { PandocConverter } from "./converter.ts";
import { validateConversionParams } from "./validation.ts";
import { resolveFilterPaths } from "./filters.ts";
import { validateDefaultsFile } from "./defaults.ts";
import { dirname } from "@std/path";

/**
 * Creates and configures the MCP server with Pandoc conversion capabilities.
 */
export function createMCPServer(): Server {
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
