/**
 * Input validation and format handling for Pandoc conversions.
 */

import { UnsupportedFormatError, ValidationError } from "./errors.ts";

/**
 * Supported Pandoc formats.
 */
export enum PandocFormat {
  Markdown = "markdown",
  HTML = "html",
  Text = "plain",
  Jupyter = "ipynb",
  ODT = "odt",
  PDF = "pdf",
  DOCX = "docx",
  ReStructuredText = "rst",
  LaTeX = "latex",
  EPUB = "epub",
}

/**
 * Formats that can be used as input.
 */
const INPUT_FORMATS: readonly PandocFormat[] = [
  PandocFormat.Markdown,
  PandocFormat.HTML,
  PandocFormat.Text,
  PandocFormat.Jupyter,
  PandocFormat.ODT,
  PandocFormat.DOCX,
  PandocFormat.ReStructuredText,
  PandocFormat.LaTeX,
  PandocFormat.EPUB,
] as const;

/**
 * All supported formats (input and output).
 */
const ALL_FORMATS: readonly PandocFormat[] = [
  ...INPUT_FORMATS,
  PandocFormat.PDF,
] as const;

/**
 * Formats that require an output file (cannot be returned as text).
 */
const FILE_OUTPUT_REQUIRED_FORMATS: readonly PandocFormat[] = [
  PandocFormat.PDF,
  PandocFormat.DOCX,
  PandocFormat.EPUB,
  PandocFormat.ODT,
] as const;

/**
 * Validates that a format string is supported.
 */
export function validateFormat(format: string, allowedFormats: readonly PandocFormat[]): PandocFormat {
  let normalized = format.toLowerCase();

  // Map "txt" to "plain" for backward compatibility
  if (normalized === "txt") {
    normalized = "plain";
  }

  if (!ALL_FORMATS.some((f) => f === normalized)) {
    throw new UnsupportedFormatError(format);
  }

  const pandocFormat = normalized as PandocFormat;

  if (!allowedFormats.includes(pandocFormat)) {
    const context = allowedFormats === INPUT_FORMATS ? "for input" : "";
    throw new UnsupportedFormatError(format, context);
  }

  return pandocFormat;
}

/**
 * Validates input format.
 */
export function validateInputFormat(format: string): PandocFormat {
  return validateFormat(format, INPUT_FORMATS);
}

/**
 * Validates output format.
 */
export function validateOutputFormat(format: string): PandocFormat {
  return validateFormat(format, ALL_FORMATS);
}

/**
 * Checks if a format requires a file output.
 */
export function requiresFileOutput(format: PandocFormat): boolean {
  return FILE_OUTPUT_REQUIRED_FORMATS.includes(format);
}

/**
 * Validates conversion parameters.
 */
export interface ConversionParams {
  contents?: string;
  inputFile?: string;
  inputFormat: string;
  outputFormat: string;
  outputFile?: string;
  referenceDoc?: string;
  defaultsFile?: string;
  filters?: string[];
}

/**
 * Validates conversion parameters and returns validated formats.
 */
export function validateConversionParams(
  params: ConversionParams,
): { inputFormat: PandocFormat; outputFormat: PandocFormat } {
  // Validate that exactly one of contents or inputFile is provided
  if (params.contents && params.inputFile) {
    throw new ValidationError(
      "Cannot specify both 'contents' and 'input_file'. Please provide only one.",
    );
  }

  if (!params.contents && !params.inputFile) {
    throw new ValidationError(
      "Must specify either 'contents' or 'input_file' for conversion.",
    );
  }

  // Validate formats
  const inputFormat = validateInputFormat(params.inputFormat);
  const outputFormat = validateOutputFormat(params.outputFormat);

  // Check if output file is required but not provided
  if (requiresFileOutput(outputFormat) && !params.outputFile) {
    throw new ValidationError(
      `Output format '${outputFormat}' requires 'output_file' to be specified.`,
    );
  }

  return { inputFormat, outputFormat };
}

/**
 * Gets all supported formats as a list.
 */
export function getSupportedFormats(): string[] {
  return Array.from(ALL_FORMATS);
}

/**
 * Gets input-capable formats as a list.
 */
export function getInputFormats(): string[] {
  return Array.from(INPUT_FORMATS);
}
