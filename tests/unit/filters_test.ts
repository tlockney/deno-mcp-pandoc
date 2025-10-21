/**
 * Tests for the filters module.
 */

import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import { resolveFilterPath, resolveFilterPaths } from "../../src/filters.ts";
import { FilterNotFoundError } from "../../src/errors.ts";

const FIXTURES_DIR = join(Deno.cwd(), "tests", "fixtures", "filters");

// Create test fixtures
async function createTestFixtures() {
  await Deno.mkdir(FIXTURES_DIR, { recursive: true });

  // Create a test filter file
  await Deno.writeTextFile(
    join(FIXTURES_DIR, "test-filter.lua"),
    `-- Test Pandoc filter
return {}
`,
  );

  // Create another filter in a subdirectory
  await Deno.mkdir(join(FIXTURES_DIR, "subdir"), { recursive: true });
  await Deno.writeTextFile(
    join(FIXTURES_DIR, "subdir", "subdir-filter.lua"),
    `-- Subdirectory filter
return {}
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

Deno.test("resolveFilterPath - resolves absolute path", async () => {
  await createTestFixtures();

  try {
    const filterPath = join(FIXTURES_DIR, "test-filter.lua");
    const resolved = await resolveFilterPath(filterPath);

    assertEquals(resolved, filterPath);
  } finally {
    await cleanupTestFixtures();
  }
});

Deno.test("resolveFilterPath - resolves relative path from CWD", async () => {
  await createTestFixtures();

  try {
    const relativePath = join("tests", "fixtures", "filters", "test-filter.lua");
    const resolved = await resolveFilterPath(relativePath);

    assertEquals(resolved, join(Deno.cwd(), relativePath));
  } finally {
    await cleanupTestFixtures();
  }
});

Deno.test("resolveFilterPath - resolves path relative to defaults dir", async () => {
  await createTestFixtures();

  try {
    const defaultsDir = join(FIXTURES_DIR, "subdir");
    const resolved = await resolveFilterPath(
      "subdir-filter.lua",
      defaultsDir,
    );

    assertEquals(resolved, join(defaultsDir, "subdir-filter.lua"));
  } finally {
    await cleanupTestFixtures();
  }
});

Deno.test("resolveFilterPath - throws FilterNotFoundError when not found", async () => {
  await assertRejects(
    async () => {
      await resolveFilterPath("nonexistent-filter.lua");
    },
    FilterNotFoundError,
    "nonexistent-filter.lua",
  );
});

Deno.test("resolveFilterPath - includes search paths in error", async () => {
  try {
    await resolveFilterPath("nonexistent.lua");
  } catch (error) {
    if (error instanceof FilterNotFoundError) {
      // Error message should include search paths
      assertEquals(error.message.includes("Searched in:"), true);
    } else {
      throw error;
    }
  }
});

Deno.test("resolveFilterPaths - resolves multiple filters", async () => {
  await createTestFixtures();

  try {
    const filterNames = [
      join("tests", "fixtures", "filters", "test-filter.lua"),
      join(FIXTURES_DIR, "test-filter.lua"),
    ];

    const resolved = await resolveFilterPaths(filterNames);

    assertEquals(resolved.length, 2);
    assertEquals(resolved[0], join(Deno.cwd(), filterNames[0]));
    assertEquals(resolved[1], filterNames[1]);
  } finally {
    await cleanupTestFixtures();
  }
});

Deno.test("resolveFilterPaths - throws on first not found filter", async () => {
  await createTestFixtures();

  try {
    const filterNames = [
      join("tests", "fixtures", "filters", "test-filter.lua"),
      "nonexistent-filter.lua",
    ];

    await assertRejects(
      async () => {
        await resolveFilterPaths(filterNames);
      },
      FilterNotFoundError,
    );
  } finally {
    await cleanupTestFixtures();
  }
});
