import type { FilenameMetadata } from "../schemas";

/**
 * Regular expression for parsing supply list filenames
 *
 * Pattern: {id}_SupplyList_{project}{pwbs} {serialNumber}_{variant}.xlsx
 * Example: 591322_SupplyList_92364K11W 008_K11W000101.xlsx
 *
 * Groups:
 *   1: fileId (e.g., "591322")
 *   2: projectNumber (e.g., "92364")
 *   3: pwbs (e.g., "K11W", "K11R", "K102")
 *   4: serialNumber (e.g., "008")
 *   5: variant (e.g., "K11W000101")
 *
 * Note: Some files have different patterns like "_01" or "_02" suffix
 * Examples with alternate patterns:
 *   553427_SupplyList_92364K11R _01.xlsx (space before _01)
 *   564075_SupplyList_92364K11R _02.xlsx
 */
const FILENAME_REGEX =
  /^(\d+)_SupplyList_(\d+)([A-Z0-9]+)\s+(\d+|_\d+)_?([A-Z0-9]*)?\.xlsx$/i;

/**
 * Alternate pattern for files with simpler suffix like " _01"
 * Pattern: {id}_SupplyList_{project}{model} _XX.xlsx
 */
const FILENAME_REGEX_ALT =
  /^(\d+)_SupplyList_(\d+)([A-Z0-9]+)\s+_(\d+)\.xlsx$/i;

export type FilenameParseResult =
  | { success: true; data: FilenameMetadata }
  | { success: false; error: string; filename: string };

/**
 * Parses a supply list filename into structured metadata
 *
 * @param filename - The filename to parse
 * @returns Parsed metadata or error result
 *
 * @example
 * const result = parseFilename("591322_SupplyList_92364K11W 008_K11W000101.xlsx");
 * if (result.success) {
 *   console.log(result.data.projectNumber); // "92364"
 *   console.log(result.data.pwbs);          // "K11W"
 * }
 */
export function parseFilename(filename: string): FilenameParseResult {
  // Try main pattern first
  let match = filename.match(FILENAME_REGEX);

  if (match) {
    return {
      success: true,
      data: {
        filename,
        fileId: match[1],
        projectNumber: match[2],
        pwbs: match[3],
        serialNumber: match[4].replace(/^_/, ""), // Remove leading underscore if present
        variant: match[5] || "",
      },
    };
  }

  // Try alternate pattern for simpler filenames
  match = filename.match(FILENAME_REGEX_ALT);

  if (match) {
    return {
      success: true,
      data: {
        filename,
        fileId: match[1],
        projectNumber: match[2],
        pwbs: match[3],
        serialNumber: match[4],
        variant: "",
      },
    };
  }

  return {
    success: false,
    error: `Filename does not match expected pattern: ${filename}`,
    filename,
  };
}

/**
 * Validates that a filename matches the expected supply list pattern
 */
export function isValidSupplyListFilename(filename: string): boolean {
  return FILENAME_REGEX.test(filename) || FILENAME_REGEX_ALT.test(filename);
}

/**
 * Extracts just the PWBS code from a filename (quick check)
 */
export function extractPwbs(filename: string): string | null {
  const result = parseFilename(filename);
  return result.success ? result.data.pwbs : null;
}
