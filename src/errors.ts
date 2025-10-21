/**
 * Custom error types for the Pandoc MCP server.
 */

/**
 * Error thrown when Pandoc binary is not found in the system.
 */
export class PandocNotFoundError extends Error {
  constructor(message?: string) {
    super(
      message ||
        "Pandoc not found. Please install Pandoc from https://pandoc.org/installing.html " +
        "or set the PANDOC_PATH environment variable to the location of the pandoc binary.",
    );
    this.name = "PandocNotFoundError";
  }
}

/**
 * Error thrown when an unsupported format is specified.
 */
export class UnsupportedFormatError extends Error {
  constructor(format: string, context?: string) {
    const ctx = context ? ` ${context}` : "";
    super(
      `Unsupported format: "${format}"${ctx}. ` +
        "Supported formats are: markdown, html, txt, ipynb, odt, pdf, docx, rst, latex, epub. " +
        "Note: PDF cannot be used as an input format.",
    );
    this.name = "UnsupportedFormatError";
  }
}

/**
 * Error thrown when a Pandoc conversion fails.
 */
export class ConversionError extends Error {
  constructor(message: string, public readonly exitCode?: number) {
    super(message);
    this.name = "ConversionError";
  }
}

/**
 * Error thrown when a Pandoc filter is not found.
 */
export class FilterNotFoundError extends Error {
  constructor(filterName: string, searchPaths: string[]) {
    super(
      `Filter "${filterName}" not found. Searched in:\n${searchPaths.map((p) => `  - ${p}`).join("\n")}\n\n` +
        "Troubleshooting:\n" +
        "  1. Ensure the filter file exists and is in one of the searched paths\n" +
        "  2. Make sure the filter is executable (chmod +x)\n" +
        "  3. Try specifying the full path to the filter\n" +
        "  4. Check that ~/.pandoc/filters/ exists if using the default filter directory",
    );
    this.name = "FilterNotFoundError";
  }
}

/**
 * Error thrown when there's an issue with a Pandoc defaults file.
 */
export class DefaultsFileError extends Error {
  constructor(message: string, public readonly filePath?: string) {
    const path = filePath ? ` (${filePath})` : "";
    super(`Defaults file error${path}: ${message}`);
    this.name = "DefaultsFileError";
  }
}

/**
 * Error thrown when invalid parameters are provided.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
