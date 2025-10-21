/**
 * Tests for the converter module.
 */

import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { exists } from "@std/fs";
import { join } from "@std/path";
import { PandocConverter } from "../../src/converter.ts";
import { ConversionError, PandocNotFoundError } from "../../src/errors.ts";
import { PandocFormat } from "../../src/validation.ts";

const FIXTURES_DIR = join(Deno.cwd(), "tests", "fixtures", "input");

Deno.test("PandocConverter - convertText from markdown to html", async () => {
  const converter = new PandocConverter();
  const input = "# Hello World\n\nThis is **bold** text.";

  const result = await converter.convertText(
    input,
    PandocFormat.Markdown,
    PandocFormat.HTML,
  );

  assertStringIncludes(result, "<h1");
  assertStringIncludes(result, "Hello World");
  assertStringIncludes(result, "<strong>bold</strong>");
});

Deno.test("PandocConverter - convertText from html to markdown", async () => {
  const converter = new PandocConverter();
  const input = "<h1>Hello World</h1><p>This is <strong>bold</strong> text.</p>";

  const result = await converter.convertText(
    input,
    PandocFormat.HTML,
    PandocFormat.Markdown,
  );

  assertStringIncludes(result, "# Hello World");
  assertStringIncludes(result, "**bold**");
});

Deno.test("PandocConverter - convertText from markdown to text", async () => {
  const converter = new PandocConverter();
  const input = "# Hello World\n\nThis is **bold** text.";

  const result = await converter.convertText(
    input,
    PandocFormat.Markdown,
    PandocFormat.Text,
  );

  assertStringIncludes(result, "Hello World");
  assertStringIncludes(result, "bold");
});

Deno.test("PandocConverter - convertFile from markdown to html", async () => {
  const converter = new PandocConverter();
  const inputFile = join(FIXTURES_DIR, "sample.md");
  const outputFile = join(Deno.cwd(), "tests", "fixtures", "output.html");

  try {
    await converter.convertFile(
      inputFile,
      outputFile,
      PandocFormat.Markdown,
      PandocFormat.HTML,
    );

    const outputExists = await exists(outputFile);
    assertEquals(outputExists, true);

    const content = await Deno.readTextFile(outputFile);
    assertStringIncludes(content, "<h1");
    assertStringIncludes(content, "Sample Document");
  } finally {
    // Cleanup
    try {
      await Deno.remove(outputFile);
    } catch {
      // Ignore if file doesn't exist
    }
  }
});

Deno.test("PandocConverter - convertFile from html to markdown", async () => {
  const converter = new PandocConverter();
  const inputFile = join(FIXTURES_DIR, "sample.html");
  const outputFile = join(Deno.cwd(), "tests", "fixtures", "output.md");

  try {
    await converter.convertFile(
      inputFile,
      outputFile,
      PandocFormat.HTML,
      PandocFormat.Markdown,
    );

    const outputExists = await exists(outputFile);
    assertEquals(outputExists, true);

    const content = await Deno.readTextFile(outputFile);
    assertStringIncludes(content, "# Sample Document");
  } finally {
    // Cleanup
    try {
      await Deno.remove(outputFile);
    } catch {
      // Ignore if file doesn't exist
    }
  }
});

Deno.test("PandocConverter - throws PandocNotFoundError when pandoc not in PATH", async () => {
  const converter = new PandocConverter("/nonexistent/path/to/pandoc");

  await assertRejects(
    async () => {
      await converter.convertText(
        "# Test",
        PandocFormat.Markdown,
        PandocFormat.HTML,
      );
    },
    PandocNotFoundError,
  );
});

Deno.test("PandocConverter - throws ConversionError on invalid input", async () => {
  const converter = new PandocConverter();
  // Malformed LaTeX that should cause an error
  const input = "\\begin{document without closing";

  await assertRejects(
    async () => {
      await converter.convertText(
        input,
        PandocFormat.LaTeX,
        PandocFormat.HTML,
      );
    },
    ConversionError,
  );
});

Deno.test("PandocConverter - accepts extra arguments", async () => {
  const converter = new PandocConverter();
  const input = "# Hello World";

  // Test with extra args (should not throw)
  const result = await converter.convertText(
    input,
    PandocFormat.Markdown,
    PandocFormat.HTML,
    {
      extraArgs: ["--standalone"],
    },
  );

  // Standalone HTML should include DOCTYPE
  assertStringIncludes(result, "<!DOCTYPE");
});

Deno.test("PandocConverter - handles empty input", async () => {
  const converter = new PandocConverter();
  const result = await converter.convertText(
    "",
    PandocFormat.Markdown,
    PandocFormat.HTML,
  );

  // Should return empty or minimal HTML
  assertEquals(typeof result, "string");
});
