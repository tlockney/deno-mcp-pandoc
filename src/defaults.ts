/**
 * YAML defaults file validation and handling.
 */

import { parse } from "@std/yaml";
import { exists } from "@std/fs";
import { DefaultsFileError } from "./errors.ts";

/**
 * Validates a Pandoc defaults file.
 * @param filePath - Path to the defaults file
 * @returns true if the file is valid
 * @throws DefaultsFileError if the file is invalid
 */
export async function validateDefaultsFile(filePath: string): Promise<boolean> {
  // Check if file exists
  const fileExists = await exists(filePath, { isFile: true });
  if (!fileExists) {
    throw new DefaultsFileError(`File not found`, filePath);
  }

  try {
    // Read and parse the YAML file
    const content = await Deno.readTextFile(filePath);
    const parsed = parse(content);

    // Validate that it's an object/dictionary
    if (parsed === null) {
      throw new DefaultsFileError(
        "Defaults file is empty",
        filePath,
      );
    }

    if (typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new DefaultsFileError(
        "Defaults file must contain a YAML object/dictionary, not a list or primitive value",
        filePath,
      );
    }

    // Check for format conflicts
    const defaultsObj = parsed as Record<string, unknown>;
    if (
      defaultsObj["from"] !== undefined &&
      defaultsObj["to"] !== undefined
    ) {
      throw new DefaultsFileError(
        "Defaults file should not specify both 'from' and 'to' formats. " +
          "These will be provided via command-line arguments.",
        filePath,
      );
    }

    return true;
  } catch (error) {
    if (error instanceof DefaultsFileError) {
      throw error;
    }

    // YAML parsing error
    if (error instanceof Error) {
      throw new DefaultsFileError(
        `Failed to parse YAML: ${error.message}`,
        filePath,
      );
    }

    throw error;
  }
}

/**
 * Reads a defaults file and returns its content.
 * @param filePath - Path to the defaults file
 * @returns The parsed YAML content
 */
export async function readDefaultsFile(
  filePath: string,
): Promise<Record<string, unknown>> {
  await validateDefaultsFile(filePath);

  const content = await Deno.readTextFile(filePath);
  const parsed = parse(content) as Record<string, unknown>;

  return parsed;
}
