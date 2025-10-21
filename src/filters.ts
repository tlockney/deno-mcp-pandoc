/**
 * Pandoc filter path resolution and handling.
 */

import { exists } from "@std/fs";
import { isAbsolute, join } from "@std/path";
import { FilterNotFoundError } from "./errors.ts";

/**
 * Gets the user's home directory.
 */
function getHomeDir(): string {
  if (Deno.build.os === "windows") {
    return Deno.env.get("USERPROFILE") || Deno.env.get("HOME") || "C:\\";
  }
  return Deno.env.get("HOME") || "/";
}

/**
 * Gets the default Pandoc filters directory.
 */
function getPandocFiltersDir(): string {
  return join(getHomeDir(), ".pandoc", "filters");
}

/**
 * Checks if a file is executable.
 */
async function isExecutable(filePath: string): Promise<boolean> {
  try {
    const fileInfo = await Deno.stat(filePath);
    if (Deno.build.os === "windows") {
      // On Windows, any file can be "executable" if it exists
      return fileInfo.isFile;
    }

    // On Unix-like systems, check the executable bit
    // Deno doesn't expose permission bits directly, so we try to execute it
    // For now, we'll assume if the file exists, we'll try to make it executable
    return fileInfo.isFile;
  } catch {
    return false;
  }
}

/**
 * Makes a file executable (Unix-like systems only).
 */
async function makeExecutable(filePath: string): Promise<void> {
  if (Deno.build.os !== "windows") {
    try {
      await Deno.chmod(filePath, 0o755);
    } catch (error) {
      // Ignore errors - we'll catch them when trying to execute the filter
      console.warn(`Warning: Could not make filter executable: ${error}`);
    }
  }
}

/**
 * Resolves the full path to a Pandoc filter.
 * Searches in the following order:
 * 1. Absolute path (if provided)
 * 2. Relative to current working directory
 * 3. Relative to defaults file directory (if provided)
 * 4. ~/.pandoc/filters/
 *
 * @param filterName - The filter name or path
 * @param defaultsFileDir - Optional directory of the defaults file
 * @returns The resolved filter path
 * @throws FilterNotFoundError if the filter cannot be found
 */
export async function resolveFilterPath(
  filterName: string,
  defaultsFileDir?: string,
): Promise<string> {
  const searchPaths: string[] = [];

  // 1. Try absolute path
  if (isAbsolute(filterName)) {
    searchPaths.push(filterName);
    if (await exists(filterName, { isFile: true })) {
      await makeExecutable(filterName);
      return filterName;
    }
  }

  // 2. Try relative to CWD
  const cwdPath = join(Deno.cwd(), filterName);
  searchPaths.push(cwdPath);
  if (await exists(cwdPath, { isFile: true })) {
    await makeExecutable(cwdPath);
    return cwdPath;
  }

  // 3. Try relative to defaults file directory
  if (defaultsFileDir) {
    const defaultsDirPath = join(defaultsFileDir, filterName);
    searchPaths.push(defaultsDirPath);
    if (await exists(defaultsDirPath, { isFile: true })) {
      await makeExecutable(defaultsDirPath);
      return defaultsDirPath;
    }
  }

  // 4. Try ~/.pandoc/filters/
  const pandocFiltersPath = join(getPandocFiltersDir(), filterName);
  searchPaths.push(pandocFiltersPath);
  if (await exists(pandocFiltersPath, { isFile: true })) {
    await makeExecutable(pandocFiltersPath);
    return pandocFiltersPath;
  }

  // Filter not found in any location
  throw new FilterNotFoundError(filterName, searchPaths);
}

/**
 * Resolves multiple filter paths.
 * @param filterNames - Array of filter names or paths
 * @param defaultsFileDir - Optional directory of the defaults file
 * @returns Array of resolved filter paths
 */
export async function resolveFilterPaths(
  filterNames: string[],
  defaultsFileDir?: string,
): Promise<string[]> {
  const resolvedPaths: string[] = [];

  for (const filterName of filterNames) {
    const resolvedPath = await resolveFilterPath(filterName, defaultsFileDir);
    resolvedPaths.push(resolvedPath);
  }

  return resolvedPaths;
}
