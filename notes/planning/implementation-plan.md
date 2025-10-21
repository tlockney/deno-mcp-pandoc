# Deno MCP-Pandoc Implementation Plan

## Project Overview

This project will create a Deno/TypeScript clone of the Python-based mcp-pandoc server with
HTTP-based MCP transport support for use with the Claude web app.

**Source Project**: `/Users/tlockney/src/personal/mcp-pandoc` **Target Project**:
`/Users/tlockney/src/personal/deno-mcp-pandoc`

## Key Differences from Original

1. **Language/Runtime**: Deno + TypeScript (instead of Python + uv)
2. **Transport**: HTTP-based MCP server (instead of stdio)
3. **Pandoc Interaction**: DAX library for CLI interaction (instead of pypandoc)
4. **Testing**: Deno built-in test framework (instead of pytest)

## Original Project Capabilities

The mcp-pandoc server provides a single powerful tool (`convert-contents`) that enables:

- **10 Format Support**: markdown, html, txt, ipynb, odt, pdf, docx, rst, latex, epub
- **Bidirectional Conversion**: All formats except PDF (output-only)
- **Advanced Features**:
  - DOCX styling via reference documents
  - YAML defaults files for configuration
  - Pandoc filters support
  - Content or file-based conversion
  - Automatic path resolution for filters and reference docs

## Implementation Phases

### Phase 1: Project Setup & Core Infrastructure

#### 1.1 Project Initialization

- [ ] Create `deno.json` configuration
  - Enable TypeScript strict mode
  - Configure import maps for dependencies
  - Set up tasks for dev/test/build
- [ ] Create `.gitignore` for Deno projects
- [ ] Set up directory structure:
  ```
  /deno-mcp-pandoc/
  ├── src/
  │   ├── server.ts        # Main HTTP MCP server
  │   ├── converter.ts     # Pandoc interaction via DAX
  │   ├── validation.ts    # Input validation
  │   ├── filters.ts       # Filter path resolution
  │   └── defaults.ts      # YAML defaults handling
  ├── tests/
  │   ├── fixtures/        # Test input files (10 formats)
  │   ├── converter_test.ts
  │   ├── filters_test.ts
  │   └── integration_test.ts
  ├── examples/
  │   └── defaults/        # Example YAML configurations
  ├── deno.json
  ├── deno.lock
  └── README.md
  ```

#### 1.2 Dependencies Setup

Add to `deno.json` imports:

- `@std/path`: Path manipulation
- `@std/fs`: File operations
- `@std/yaml`: YAML parsing for defaults files
- `@std/testing`: Testing utilities
- `@modelcontextprotocol/sdk`: MCP SDK for TypeScript
- `dax-sh`: Shell operations for Pandoc CLI interaction
- `hono`: HTTP server framework (lightweight, fast)

### Phase 2: Core Conversion Engine

#### 2.1 Pandoc CLI Wrapper (`converter.ts`)

- [ ] Create `PandocConverter` class
- [ ] Implement `convertText()` method
  - Accept content string, input format, output format
  - Use DAX to invoke `pandoc` with appropriate arguments
  - Return converted content
- [ ] Implement `convertFile()` method
  - Accept input file path, output file path
  - Support all format combinations
  - Handle output file creation
- [ ] Add format validation
  - Define supported formats enum
  - Validate format combinations (no PDF input)
- [ ] Implement extra arguments builder
  - `--pdf-engine=xelatex` for PDF
  - `-V geometry:margin=1in` for PDF margins
  - `--reference-doc` for DOCX styling
  - `--defaults` for YAML config
  - `--filter` for Pandoc filters

#### 2.2 Error Handling

- [ ] Create custom error types:
  - `PandocNotFoundError`
  - `UnsupportedFormatError`
  - `ConversionError`
  - `FilterNotFoundError`
  - `DefaultsFileError`
- [ ] Add descriptive error messages matching Python version
- [ ] Include troubleshooting hints in errors

### Phase 3: Advanced Features

#### 3.1 YAML Defaults File Support (`defaults.ts`)

- [ ] Implement `validateDefaultsFile()` function
  - Read and parse YAML using `@std/yaml`
  - Validate structure (must be object/dictionary)
  - Check for format conflicts
  - Return validation result
- [ ] Add secure YAML parsing (no code execution)
- [ ] Path resolution for defaults files

#### 3.2 Filter Support (`filters.ts`)

- [ ] Implement `resolveFilterPath()` function
  - Try absolute path first
  - Try relative to CWD
  - Try relative to defaults file directory
  - Try `~/.pandoc/filters/`
  - Throw error if not found
- [ ] Add executable permission checking
- [ ] Implement permission fixing (`chmod +x`) if needed
- [ ] Support multiple filters

#### 3.3 Reference Document Support

- [ ] Implement `validateReferencDoc()` function
- [ ] Path resolution for reference docs
- [ ] File existence validation

### Phase 4: HTTP MCP Server

#### 4.1 Server Setup (`server.ts`)

- [ ] Create Hono app instance
- [ ] Configure CORS for Claude web app
- [ ] Set up JSON body parsing middleware
- [ ] Add error handling middleware
- [ ] Implement health check endpoint (`GET /health`)

#### 4.2 MCP Protocol Implementation

- [ ] Initialize MCP Server from `@modelcontextprotocol/sdk`
- [ ] Implement HTTP transport adapter (SSE or long-polling)
- [ ] Register MCP tool: `convert-contents`
  - Define tool schema matching Python version
  - Implement tool handler
- [ ] Handle MCP lifecycle messages
- [ ] Implement proper MCP error responses

#### 4.3 Tool Implementation

- [ ] Create `handleConvertContents()` async function
- [ ] Parameter extraction and validation:
  - `contents?: string`
  - `input_file?: string`
  - `input_format: string = "markdown"`
  - `output_format: string = "markdown"`
  - `output_file?: string`
  - `reference_doc?: string`
  - `defaults_file?: string`
  - `filters?: string[]`
- [ ] Input validation (exactly one of contents/input_file)
- [ ] Advanced format handling (require output_file for pdf/docx/epub/latex/rst)
- [ ] Invoke converter with all parameters
- [ ] Return results in MCP format

### Phase 5: Testing

#### 5.1 Unit Tests

- [ ] `converter_test.ts`: Test all format conversions
  - Create fixtures for each format
  - Test bidirectional conversions (skip PDF input)
  - Test error cases
- [ ] `filters_test.ts`: Test filter resolution
  - Test absolute paths
  - Test relative paths
  - Test multiple search locations
  - Test permission handling
- [ ] `defaults_test.ts`: Test YAML defaults
  - Valid YAML parsing
  - Invalid YAML rejection
  - Format conflict detection
- [ ] `validation_test.ts`: Test input validation
  - Parameter combinations
  - Format validation
  - Path validation

#### 5.2 Integration Tests

- [ ] `integration_test.ts`: Test complete workflows
  - End-to-end conversion with defaults file
  - Multiple filters application
  - Reference document styling
  - File and content conversions
- [ ] Test HTTP server endpoints
- [ ] Test MCP protocol compliance

#### 5.3 Test Coverage

- [ ] Aim for 90%+ coverage on new code
- [ ] Ensure all format combinations tested
- [ ] Test all error paths

### Phase 6: Documentation

#### 6.1 Code Documentation

- [ ] Add TSDoc comments to all public functions
- [ ] Document parameter types and return types
- [ ] Add usage examples in comments

#### 6.2 User Documentation

- [ ] Create `README.md`:
  - Installation instructions
  - Usage examples
  - Configuration guide
  - Troubleshooting section
- [ ] Create `EXAMPLES.md`:
  - Example defaults files
  - Common conversion patterns
  - Filter usage examples
- [ ] Document HTTP transport setup for Claude web app

#### 6.3 API Documentation

- [ ] Document MCP tool schema
- [ ] Document HTTP endpoints
- [ ] Provide example requests/responses

### Phase 7: Development Tools

#### 7.1 Deno Tasks

Add to `deno.json` tasks:

```json
{
  "tasks": {
    "dev": "deno run --allow-all --watch src/server.ts",
    "test": "deno test --allow-all",
    "coverage": "deno test --allow-all --coverage=coverage/",
    "check": "deno check src/**/*.ts",
    "fmt": "deno fmt",
    "lint": "deno lint"
  }
}
```

#### 7.2 Development Workflow

- [ ] Set up file watching for development
- [ ] Configure test watching
- [ ] Add pre-commit hooks (optional)

### Phase 8: Deployment & Configuration

#### 8.1 Server Configuration

- [ ] Environment variables:
  - `PORT`: HTTP server port (default: 3000)
  - `HOST`: Server host (default: localhost)
  - `PANDOC_PATH`: Custom pandoc binary path (optional)
- [ ] Create example `.env` file

#### 8.2 Claude Web App Integration

- [ ] Document HTTP MCP server URL configuration
- [ ] Provide example Claude configuration
- [ ] Test with actual Claude web app

#### 8.3 Distribution

- [ ] Consider publishing to JSR (JavaScript Registry)
- [ ] Provide standalone executable via `deno compile`
- [ ] Document installation methods

## Technical Design Decisions

### HTTP Transport vs stdio

**Rationale**: Claude web app requires HTTP-based MCP servers (stdio not available in browser
context)

**Implementation Options**:

1. **Server-Sent Events (SSE)**: Preferred for streaming responses
2. **Long-polling**: Fallback for compatibility
3. **WebSocket**: Possible alternative (check MCP SDK support)

**Recommendation**: Implement SSE first, add fallbacks if needed

### DAX for Pandoc Interaction

**Rationale**: DAX provides:

- Type-safe shell command construction
- Automatic error handling
- Cross-platform compatibility
- Better testing support than raw `Deno.Command`

**Example Usage**:

```typescript
import $ from "dax-sh";

const result = await $`pandoc -f markdown -t html`.text(input);
```

### TypeScript Strict Mode

**Rationale**: Aligns with project requirements (no `any` types)

**Configuration** (`deno.json`):

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## Testing Strategy

### Test-Driven Development

Follow TDD for all new code:

1. Write failing test
2. Implement minimal code to pass
3. Refactor while keeping tests green

### Test Organization

```
tests/
├── unit/
│   ├── converter_test.ts
│   ├── filters_test.ts
│   ├── defaults_test.ts
│   └── validation_test.ts
├── integration/
│   ├── server_test.ts
│   └── mcp_protocol_test.ts
└── fixtures/
    ├── input/
    │   ├── sample.md
    │   ├── sample.html
    │   ├── sample.docx
    │   └── ...
    └── defaults/
        ├── academic-pdf.yaml
        └── basic-html.yaml
```

### Coverage Goals

- **Unit tests**: 95%+ coverage
- **Integration tests**: All critical paths
- **E2E tests**: Complete conversion workflows

## Migration Checklist: Python → Deno

### Direct Equivalents

| Python                    | Deno/TypeScript                  |
| ------------------------- | -------------------------------- |
| `pypandoc.convert_text()` | `$ pandoc -f ... -t ...`.text()` |
| `pypandoc.convert_file()` | `$ pandoc input -o output`       |
| `yaml.safe_load()`        | `@std/yaml parse()`              |
| `os.path.exists()`        | `@std/fs exists()`               |
| `os.path.join()`          | `@std/path join()`               |
| `os.chmod()`              | `Deno.chmod()`                   |
| `pathlib.Path.home()`     | `@std/path homeDir()`            |
| `subprocess.run()`        | `$` pandoc ...`` (DAX)           |

### Features to Port

From `server.py` (464 lines):

1. ✅ Tool registration (lines 13-147)
2. ✅ Parameter validation (lines 227-244)
3. ✅ Defaults file validation (lines 197-223)
4. ✅ Filter path resolution (lines 246-292)
5. ✅ Extra args builder (lines 294-365)
6. ✅ Conversion logic (lines 367-423)
7. ✅ Error handling (lines 443-462)

## Security Considerations

### YAML Parsing

- Use `@std/yaml` which is safe by default (no code execution)
- Validate structure after parsing
- Handle malformed YAML gracefully

### Path Validation

- Prevent directory traversal attacks
- Validate all file paths before access
- Use `@std/path` for safe path operations

### Input Validation

- Strict type checking for all parameters
- Validate format strings against allow-list
- Sanitize user-provided content before shell execution

### Pandoc Execution

- Use DAX's safe command construction
- Avoid string interpolation in shell commands
- Validate all arguments before execution

## Potential Challenges & Solutions

### Challenge 1: HTTP MCP Transport

**Issue**: Limited documentation for HTTP-based MCP servers **Solution**: Study MCP SDK source code,
check for official examples, consider contributing documentation

### Challenge 2: Pandoc Binary Detection

**Issue**: Pandoc may not be in PATH **Solution**:

- Check `PANDOC_PATH` env var first
- Search common installation locations
- Provide clear installation instructions in errors

### Challenge 3: Cross-Platform Filter Permissions

**Issue**: chmod semantics differ on Windows **Solution**:

- Detect OS using `Deno.build.os`
- Handle Windows separately (no chmod)
- Document platform requirements

### Challenge 4: Large File Handling

**Issue**: HTTP payload size limits **Solution**:

- Implement file-based conversion (no content transfer)
- Add file size limits
- Document recommended usage patterns

## Success Criteria

### Functional Requirements

- ✅ All 10 formats supported
- ✅ Bidirectional conversion (except PDF input)
- ✅ YAML defaults files work
- ✅ Pandoc filters supported
- ✅ Reference docs for DOCX styling
- ✅ HTTP MCP server operational
- ✅ Works with Claude web app

### Quality Requirements

- ✅ 90%+ test coverage
- ✅ No `any` types in codebase
- ✅ All tests passing
- ✅ Comprehensive documentation
- ✅ Clear error messages

### Performance Requirements

- ✅ Conversion time comparable to Python version
- ✅ HTTP response time < 500ms for simple conversions
- ✅ Supports concurrent requests

## Timeline Estimate

| Phase                      | Estimated Time |
| -------------------------- | -------------- |
| Phase 1: Project Setup     | 2 hours        |
| Phase 2: Core Conversion   | 4 hours        |
| Phase 3: Advanced Features | 4 hours        |
| Phase 4: HTTP MCP Server   | 3 hours        |
| Phase 5: Testing           | 6 hours        |
| Phase 6: Documentation     | 2 hours        |
| Phase 7: Development Tools | 1 hour         |
| Phase 8: Deployment        | 2 hours        |
| **Total**                  | **24 hours**   |

## Next Steps

1. Review and approve this plan
2. Set up project structure (Phase 1)
3. Begin TDD cycle with converter module (Phase 2)
4. Iterate through remaining phases
5. Test with Claude web app
6. Refine based on real-world usage

## Open Questions

1. **HTTP Transport Protocol**: Should we use SSE, long-polling, or WebSocket? (Need to check MCP
   SDK support)
2. **Port Configuration**: What's the preferred port for local MCP servers? (Default: 3000?)
3. **Authentication**: Does Claude web app require any auth for HTTP MCP servers?
4. **File Storage**: Should we support temporary file storage for conversions? Where?
5. **Concurrent Requests**: Should we limit concurrent Pandoc processes to avoid resource
   exhaustion?

---

**Plan Status**: Draft - Awaiting Review **Last Updated**: 2025-10-20 **Next Review**: After Phase 1
completion
