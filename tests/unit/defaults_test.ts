/**
 * Tests for the defaults module.
 */

import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { readDefaultsFile, validateDefaultsFile } from "../../src/defaults.ts";
import { DefaultsFileError } from "../../src/errors.ts";

const FIXTURES_DIR = join(Deno.cwd(), "tests", "fixtures", "defaults");

// Create test fixtures
async function createTestFixtures() {
  await Deno.mkdir(FIXTURES_DIR, { recursive: true });

  // Valid defaults file
  await Deno.writeTextFile(
    join(FIXTURES_DIR, "valid.yaml"),
    `variables:
  geometry: margin=1in
pdf-engine: xelatex
`,
  );

  // Empty defaults file
  await Deno.writeTextFile(join(FIXTURES_DIR, "empty.yaml"), "");

  // Invalid YAML (not an object)
  await Deno.writeTextFile(
    join(FIXTURES_DIR, "invalid-list.yaml"),
    `- item1
- item2
`,
  );

  // Defaults with format conflict
  await Deno.writeTextFile(
    join(FIXTURES_DIR, "format-conflict.yaml"),
    `from: markdown
to: html
`,
  );

  // Malformed YAML
  await Deno.writeTextFile(
    join(FIXTURES_DIR, "malformed.yaml"),
    `key: value
  bad indentation:
`,
  );
}

// Clean up test fixtures
async function cleanupTestFixtures() {
  try {
    await Deno.remove(FIXTURES_DIR, { recursive: true });
  } catch {
    // Ignore if directory doesn't exist
  }
}

Deno.test("validateDefaultsFile - accepts valid defaults file", async () => {
  await createTestFixtures();

  try {
    const result = await validateDefaultsFile(
      join(FIXTURES_DIR, "valid.yaml"),
    );
    assertEquals(result, true);
  } finally {
    await cleanupTestFixtures();
  }
});

Deno.test("validateDefaultsFile - rejects non-existent file", async () => {
  await assertRejects(
    async () => {
      await validateDefaultsFile(join(FIXTURES_DIR, "nonexistent.yaml"));
    },
    DefaultsFileError,
    "File not found",
  );
});

Deno.test("validateDefaultsFile - rejects empty file", async () => {
  await createTestFixtures();

  try {
    await assertRejects(
      async () => {
        await validateDefaultsFile(join(FIXTURES_DIR, "empty.yaml"));
      },
      DefaultsFileError,
      "empty",
    );
  } finally {
    await cleanupTestFixtures();
  }
});

Deno.test("validateDefaultsFile - rejects list instead of object", async () => {
  await createTestFixtures();

  try {
    await assertRejects(
      async () => {
        await validateDefaultsFile(join(FIXTURES_DIR, "invalid-list.yaml"));
      },
      DefaultsFileError,
      "must contain a YAML object",
    );
  } finally {
    await cleanupTestFixtures();
  }
});

Deno.test("validateDefaultsFile - rejects format conflicts", async () => {
  await createTestFixtures();

  try {
    await assertRejects(
      async () => {
        await validateDefaultsFile(
          join(FIXTURES_DIR, "format-conflict.yaml"),
        );
      },
      DefaultsFileError,
      "should not specify both 'from' and 'to'",
    );
  } finally {
    await cleanupTestFixtures();
  }
});

Deno.test("validateDefaultsFile - rejects malformed YAML", async () => {
  await createTestFixtures();

  try {
    await assertRejects(
      async () => {
        await validateDefaultsFile(join(FIXTURES_DIR, "malformed.yaml"));
      },
      DefaultsFileError,
      "Failed to parse YAML",
    );
  } finally {
    await cleanupTestFixtures();
  }
});

Deno.test("readDefaultsFile - reads and parses valid file", async () => {
  await createTestFixtures();

  try {
    const content = await readDefaultsFile(join(FIXTURES_DIR, "valid.yaml"));

    assertEquals(typeof content, "object");
    assertEquals(content["pdf-engine"], "xelatex");
  } finally {
    await cleanupTestFixtures();
  }
});

Deno.test("readDefaultsFile - rejects invalid file", async () => {
  await createTestFixtures();

  try {
    await assertRejects(
      async () => {
        await readDefaultsFile(join(FIXTURES_DIR, "invalid-list.yaml"));
      },
      DefaultsFileError,
    );
  } finally {
    await cleanupTestFixtures();
  }
});
