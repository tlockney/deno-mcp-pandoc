/**
 * Tests for the validation module.
 */

import { assertEquals, assertThrows } from "@std/assert";
import {
  getInputFormats,
  getSupportedFormats,
  PandocFormat,
  requiresFileOutput,
  validateConversionParams,
  validateInputFormat,
  validateOutputFormat,
} from "../../src/validation.ts";
import { UnsupportedFormatError, ValidationError } from "../../src/errors.ts";

Deno.test("validateInputFormat - accepts valid input formats", () => {
  const validFormats = [
    { input: "markdown", expected: "markdown" },
    { input: "html", expected: "html" },
    { input: "txt", expected: "plain" },
    { input: "ipynb", expected: "ipynb" },
    { input: "odt", expected: "odt" },
    { input: "docx", expected: "docx" },
    { input: "rst", expected: "rst" },
    { input: "latex", expected: "latex" },
    { input: "epub", expected: "epub" },
  ];

  for (const { input, expected } of validFormats) {
    const result = validateInputFormat(input);
    assertEquals(result, expected as PandocFormat);
  }
});

Deno.test("validateInputFormat - rejects PDF as input", () => {
  assertThrows(
    () => validateInputFormat("pdf"),
    UnsupportedFormatError,
    "for input",
  );
});

Deno.test("validateInputFormat - rejects unknown format", () => {
  assertThrows(
    () => validateInputFormat("unknown"),
    UnsupportedFormatError,
    "Unsupported format",
  );
});

Deno.test("validateInputFormat - case insensitive", () => {
  assertEquals(validateInputFormat("MARKDOWN"), PandocFormat.Markdown);
  assertEquals(validateInputFormat("HtMl"), PandocFormat.HTML);
});

Deno.test("validateOutputFormat - accepts all formats including PDF", () => {
  const validFormats = [
    { input: "markdown", expected: "markdown" },
    { input: "html", expected: "html" },
    { input: "txt", expected: "plain" },
    { input: "ipynb", expected: "ipynb" },
    { input: "odt", expected: "odt" },
    { input: "pdf", expected: "pdf" },
    { input: "docx", expected: "docx" },
    { input: "rst", expected: "rst" },
    { input: "latex", expected: "latex" },
    { input: "epub", expected: "epub" },
  ];

  for (const { input, expected } of validFormats) {
    const result = validateOutputFormat(input);
    assertEquals(result, expected as PandocFormat);
  }
});

Deno.test("validateOutputFormat - rejects unknown format", () => {
  assertThrows(
    () => validateOutputFormat("unknown"),
    UnsupportedFormatError,
  );
});

Deno.test("requiresFileOutput - returns true for binary formats", () => {
  assertEquals(requiresFileOutput(PandocFormat.PDF), true);
  assertEquals(requiresFileOutput(PandocFormat.DOCX), true);
  assertEquals(requiresFileOutput(PandocFormat.EPUB), true);
  assertEquals(requiresFileOutput(PandocFormat.ODT), true);
});

Deno.test("requiresFileOutput - returns false for text formats", () => {
  assertEquals(requiresFileOutput(PandocFormat.Markdown), false);
  assertEquals(requiresFileOutput(PandocFormat.HTML), false);
  assertEquals(requiresFileOutput(PandocFormat.Text), false);
  assertEquals(requiresFileOutput(PandocFormat.LaTeX), false);
  assertEquals(requiresFileOutput(PandocFormat.ReStructuredText), false);
});

Deno.test("validateConversionParams - accepts valid contents conversion", () => {
  const result = validateConversionParams({
    contents: "# Hello",
    inputFormat: "markdown",
    outputFormat: "html",
  });

  assertEquals(result.inputFormat, PandocFormat.Markdown);
  assertEquals(result.outputFormat, PandocFormat.HTML);
});

Deno.test("validateConversionParams - accepts valid file conversion", () => {
  const result = validateConversionParams({
    inputFile: "input.md",
    inputFormat: "markdown",
    outputFormat: "html",
  });

  assertEquals(result.inputFormat, PandocFormat.Markdown);
  assertEquals(result.outputFormat, PandocFormat.HTML);
});

Deno.test("validateConversionParams - rejects both contents and inputFile", () => {
  assertThrows(
    () =>
      validateConversionParams({
        contents: "# Hello",
        inputFile: "input.md",
        inputFormat: "markdown",
        outputFormat: "html",
      }),
    ValidationError,
    "Cannot specify both",
  );
});

Deno.test("validateConversionParams - rejects neither contents nor inputFile", () => {
  assertThrows(
    () =>
      validateConversionParams({
        inputFormat: "markdown",
        outputFormat: "html",
      }),
    ValidationError,
    "Must specify either",
  );
});

Deno.test("validateConversionParams - requires outputFile for PDF", () => {
  assertThrows(
    () =>
      validateConversionParams({
        contents: "# Hello",
        inputFormat: "markdown",
        outputFormat: "pdf",
      }),
    ValidationError,
    "requires 'output_file'",
  );
});

Deno.test("validateConversionParams - accepts outputFile for PDF", () => {
  const result = validateConversionParams({
    contents: "# Hello",
    inputFormat: "markdown",
    outputFormat: "pdf",
    outputFile: "output.pdf",
  });

  assertEquals(result.outputFormat, PandocFormat.PDF);
});

Deno.test("validateConversionParams - requires outputFile for DOCX", () => {
  assertThrows(
    () =>
      validateConversionParams({
        contents: "# Hello",
        inputFormat: "markdown",
        outputFormat: "docx",
      }),
    ValidationError,
    "requires 'output_file'",
  );
});

Deno.test("getSupportedFormats - returns all formats", () => {
  const formats = getSupportedFormats();
  assertEquals(formats.length, 10);
  assertEquals(formats.includes("pdf"), true);
});

Deno.test("getInputFormats - returns formats excluding PDF", () => {
  const formats = getInputFormats();
  assertEquals(formats.length, 9);
  assertEquals(formats.includes("pdf"), false);
  assertEquals(formats.includes("markdown"), true);
});
