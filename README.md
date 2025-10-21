# Deno MCP-Pandoc

A Deno/TypeScript implementation of an [MCP](https://modelcontextprotocol.io) server for document
conversion using Pandoc.

> **Attribution**: This project is a Deno/TypeScript port inspired by
> [mcp-pandoc](https://github.com/vivekVells/mcp-pandoc) by
> [@vivekVells](https://github.com/vivekVells). The original Python implementation provided the
> foundation and design for this project.

## Features

- **Dual Transport Modes**: Stdio (for Claude Desktop) and HTTP/SSE (for web applications)
- **10 Format Support**: markdown, html, txt (plain), ipynb, odt, pdf, docx, rst, latex, epub
- **Bidirectional Conversion**: Convert between all formats (except PDF as input)
- **Advanced Features**:
  - DOCX styling via reference documents
  - YAML defaults files for configuration
  - Pandoc filters support
  - Content or file-based conversion
  - Automatic filter path resolution

## Prerequisites

- [Deno](https://deno.land/) v1.40 or later
- [Pandoc](https://pandoc.org/installing.html) installed and available in PATH
- For PDF output: XeLaTeX (included in [TeX Live](https://www.tug.org/texlive/))

## Installation

### Using Deno

```bash
# Clone the repository
git clone https://github.com/yourusername/deno-mcp-pandoc.git
cd deno-mcp-pandoc

# Run directly with Deno
deno run --allow-all src/server.ts

# Or install globally
deno install --allow-all -n mcp-pandoc src/server.ts
```

### Verify Pandoc Installation

```bash
pandoc --version
```

If Pandoc is not found, install it:

- **macOS**: `brew install pandoc`
- **Ubuntu/Debian**: `sudo apt install pandoc`
- **Windows**: Download from [pandoc.org](https://pandoc.org/installing.html)

## Usage

This server supports two transport modes:

### 1. Stdio Transport (for Claude Desktop)

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json` **Windows**:
`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pandoc": {
      "command": "deno",
      "args": [
        "run",
        "--allow-all",
        "/absolute/path/to/deno-mcp-pandoc/src/server.ts"
      ]
    }
  }
}
```

Restart Claude Desktop after making changes.

### 2. HTTP Transport (for Web Applications)

Start the HTTP server:

```bash
# Start with default port (3000)
deno task start:http

# Or specify custom port and host
PORT=8080 HOST=0.0.0.0 deno task start:http
```

The server provides the following endpoints:

- **Health Check**: `GET http://localhost:3000/health`
- **SSE Endpoint**: `GET http://localhost:3000/sse` (Server-Sent Events for MCP)
- **Messages**: `POST http://localhost:3000/messages` (MCP message handling)

Configure your web application to connect to the SSE endpoint for MCP communication.

## MCP Tool: convert-contents

The server provides a single powerful tool for document conversion.

### Parameters

- **contents** (string, optional): Content to convert (use this OR input_file)
- **input_file** (string, optional): Path to input file (use this OR contents)
- **input_format** (string, default: "markdown"): Input format
- **output_format** (string, default: "markdown"): Output format
- **output_file** (string, optional): Path to output file (required for PDF, DOCX, EPUB, ODT)
- **reference_doc** (string, optional): Path to reference document for styling
- **defaults_file** (string, optional): Path to Pandoc defaults YAML file
- **filters** (array, optional): List of Pandoc filter names or paths

### Supported Formats

| Format           | Input | Output | Extension | Notes                    |
| ---------------- | ----- | ------ | --------- | ------------------------ |
| Markdown         | ✓     | ✓      | .md       | GitHub Flavored Markdown |
| HTML             | ✓     | ✓      | .html     | HTML5                    |
| Plain Text       | ✓     | ✓      | .txt      | Plain text               |
| Jupyter          | ✓     | ✓      | .ipynb    | Jupyter notebooks        |
| ODT              | ✓     | ✓      | .odt      | OpenDocument Text        |
| PDF              | ✗     | ✓      | .pdf      | Requires output_file     |
| DOCX             | ✓     | ✓      | .docx     | Microsoft Word           |
| reStructuredText | ✓     | ✓      | .rst      | reStructuredText         |
| LaTeX            | ✓     | ✓      | .tex      | LaTeX                    |
| EPUB             | ✓     | ✓      | .epub     | EPUB ebook               |

## Examples

### Convert Markdown to HTML

```
User: "Convert this markdown to HTML: # Hello World\n\nThis is **bold** text."

Claude uses the convert-contents tool:
{
  "contents": "# Hello World\n\nThis is **bold** text.",
  "input_format": "markdown",
  "output_format": "html"
}
```

### Convert File to PDF

```
User: "Convert my document.md to a PDF"

Claude uses the convert-contents tool:
{
  "input_file": "document.md",
  "output_file": "document.pdf",
  "input_format": "markdown",
  "output_format": "pdf"
}
```

### Using Defaults File

```
User: "Convert my essay to PDF using academic formatting"

Claude uses the convert-contents tool:
{
  "input_file": "essay.md",
  "output_file": "essay.pdf",
  "input_format": "markdown",
  "output_format": "pdf",
  "defaults_file": "examples/defaults/academic-pdf.yaml"
}
```

### Using Reference Document for DOCX Styling

```
User: "Convert this to DOCX using my company template"

Claude uses the convert-contents tool:
{
  "input_file": "report.md",
  "output_file": "report.docx",
  "input_format": "markdown",
  "output_format": "docx",
  "reference_doc": "templates/company-template.docx"
}
```

## YAML Defaults Files

Defaults files allow you to configure Pandoc options in YAML format.

Example (`examples/defaults/academic-pdf.yaml`):

```yaml
pdf-engine: xelatex
variables:
  geometry: margin=1in
  fontsize: 12pt
toc: true
number-sections: true
```

See the `examples/defaults/` directory for more examples.

## Pandoc Filters

Filters allow you to transform the document AST. Place filters in `~/.pandoc/filters/` or specify
full paths.

```
{
  "contents": "...",
  "filters": ["my-filter.lua", "/path/to/another-filter.py"]
}
```

The server automatically resolves filter paths in this order:

1. Absolute path
2. Relative to current working directory
3. Relative to defaults file directory
4. `~/.pandoc/filters/`

## Development

### Running the Server

```bash
# Stdio server (for Claude Desktop)
deno task start

# HTTP server (for web applications)
deno task start:http

# Development mode with file watching
deno task dev         # stdio server
deno task dev:http    # HTTP server
```

### Running Tests

```bash
# Run all tests
deno task test

# Run specific test file
deno task test tests/unit/converter_test.ts

# Run with coverage
deno task coverage
```

### Code Quality

```bash
# Format code
deno task fmt

# Lint code
deno task lint

# Type check
deno task check
```

### Project Structure

```
deno-mcp-pandoc/
├── src/
│   ├── server.ts        # Stdio MCP server (Claude Desktop)
│   ├── http-server.ts   # HTTP/SSE MCP server (web apps)
│   ├── converter.ts     # Pandoc conversion logic
│   ├── validation.ts    # Input validation
│   ├── filters.ts       # Filter path resolution
│   ├── defaults.ts      # YAML defaults handling
│   └── errors.ts        # Custom error types
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests (if any)
│   └── fixtures/       # Test fixtures
├── examples/
│   └── defaults/       # Example YAML configurations
├── deno.json           # Deno configuration
└── README.md           # This file
```

## Troubleshooting

### Pandoc not found

**Error**: `PandocNotFoundError: Pandoc not found`

**Solution**: Install Pandoc and ensure it's in your PATH, or set the `PANDOC_PATH` environment
variable:

```bash
export PANDOC_PATH=/path/to/pandoc
```

### PDF conversion fails

**Error**: `xelatex not found`

**Solution**: Install a LaTeX distribution (TeX Live, MiKTeX, etc.):

- **macOS**: `brew install --cask mactex`
- **Ubuntu/Debian**: `sudo apt install texlive-xetex`
- **Windows**: Install [MiKTeX](https://miktex.org/)

### Filter not found

**Error**: `FilterNotFoundError: Filter "my-filter.lua" not found`

**Solution**:

1. Verify the filter file exists
2. Check file permissions (should be executable on Unix-like systems)
3. Use full path to the filter
4. Place filter in `~/.pandoc/filters/`

### Invalid defaults file

**Error**: `DefaultsFileError: Failed to parse YAML`

**Solution**:

1. Validate YAML syntax using a YAML validator
2. Ensure the file contains a YAML object (not a list or primitive)
3. Don't specify both `from` and `to` in defaults file (use parameters instead)

## Contributing

Contributions are welcome! Please ensure:

1. All tests pass: `deno task test`
2. Code is formatted: `deno task fmt`
3. Code passes linting: `deno task lint`
4. Type checking succeeds: `deno task check`
5. Test coverage remains above 90%

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built on [Pandoc](https://pandoc.org/) by John MacFarlane
- Uses the [Model Context Protocol](https://modelcontextprotocol.io) by Anthropic
- Inspired by and ported from [mcp-pandoc](https://github.com/vivekVells/mcp-pandoc) by
  [@vivekVells](https://github.com/vivekVells)
