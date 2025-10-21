/**
 * Pandoc converter for converting between document formats.
 */

import $ from "dax";
import { ConversionError, PandocNotFoundError } from "./errors.ts";
import { PandocFormat } from "./validation.ts";

/**
 * Options for Pandoc conversion.
 */
export interface ConversionOptions {
  extraArgs?: string[];
  referenceDoc?: string;
  defaultsFile?: string;
  filters?: string[];
}

/**
 * PandocConverter handles conversion between document formats using Pandoc.
 */
export class PandocConverter {
  private pandocPath: string;

  /**
   * Creates a new PandocConverter instance.
   * @param pandocPath - Optional path to the pandoc binary. If not provided, uses "pandoc" from PATH.
   */
  constructor(pandocPath?: string) {
    this.pandocPath = pandocPath || Deno.env.get("PANDOC_PATH") || "pandoc";
  }

  /**
   * Converts text content from one format to another.
   * @param content - The content to convert
   * @param inputFormat - The input format
   * @param outputFormat - The output format
   * @param options - Additional conversion options
   * @returns The converted content as a string
   */
  async convertText(
    content: string,
    inputFormat: PandocFormat,
    outputFormat: PandocFormat,
    options?: ConversionOptions,
  ): Promise<string> {
    try {
      const args = this.buildArgs(inputFormat, outputFormat, options);

      const result = await $`${this.pandocPath} ${args}`.stdinText(content).text();

      return result;
    } catch (error) {
      // Check if pandoc command not found
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("no such file") ||
          errorMessage.includes("enoent")
        ) {
          throw new PandocNotFoundError();
        }

        // All other errors are conversion errors
        throw new ConversionError(
          `Pandoc conversion failed: ${error.message}`,
        );
      }

      throw error;
    }
  }

  /**
   * Converts a file from one format to another.
   * @param inputFile - Path to the input file
   * @param outputFile - Path to the output file
   * @param inputFormat - The input format
   * @param outputFormat - The output format
   * @param options - Additional conversion options
   */
  async convertFile(
    inputFile: string,
    outputFile: string,
    inputFormat: PandocFormat,
    outputFormat: PandocFormat,
    options?: ConversionOptions,
  ): Promise<void> {
    try {
      const args = this.buildArgs(inputFormat, outputFormat, options);

      await $`${this.pandocPath} ${args} ${inputFile} -o ${outputFile}`;
    } catch (error) {
      // Check if pandoc command not found
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("no such file") ||
          errorMessage.includes("enoent")
        ) {
          throw new PandocNotFoundError();
        }

        // All other errors are conversion errors
        throw new ConversionError(
          `Pandoc conversion failed: ${error.message}`,
        );
      }

      throw error;
    }
  }

  /**
   * Builds Pandoc command-line arguments.
   */
  private buildArgs(
    inputFormat: PandocFormat,
    outputFormat: PandocFormat,
    options?: ConversionOptions,
  ): string[] {
    const args: string[] = [
      "-f",
      inputFormat,
      "-t",
      outputFormat,
    ];

    // Add PDF-specific options
    if (outputFormat === PandocFormat.PDF) {
      args.push("--pdf-engine=xelatex");
      args.push("-V", "geometry:margin=1in");
    }

    // Add reference document if provided
    if (options?.referenceDoc) {
      args.push("--reference-doc", options.referenceDoc);
    }

    // Add defaults file if provided
    if (options?.defaultsFile) {
      args.push("--defaults", options.defaultsFile);
    }

    // Add filters if provided
    if (options?.filters && options.filters.length > 0) {
      for (const filter of options.filters) {
        args.push("--filter", filter);
      }
    }

    // Add extra arguments if provided
    if (options?.extraArgs && options.extraArgs.length > 0) {
      args.push(...options.extraArgs);
    }

    return args;
  }

  /**
   * Checks if Pandoc is available on the system.
   * @returns true if Pandoc is available, false otherwise
   */
  async isPandocAvailable(): Promise<boolean> {
    try {
      await $`${this.pandocPath} --version`.quiet();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets the Pandoc version.
   * @returns The Pandoc version string
   */
  async getPandocVersion(): Promise<string> {
    try {
      const result = await $`${this.pandocPath} --version`.text();
      const firstLine = result.split("\n")[0];
      return firstLine.trim();
    } catch (error) {
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("no such file") ||
          errorMessage.includes("enoent")
        ) {
          throw new PandocNotFoundError();
        }
      }
      throw error;
    }
  }
}
