/**
 * Utilities for detecting and processing packing split (梱包分割) continuation rows
 *
 * When an item is split across multiple cases, the Excel data contains:
 * - A primary row with full item info (itemNumber, partNumber, description, quantity)
 * - Continuation rows with description "ItemNo.XXX 梱包分割" and only packing details
 */

/**
 * Pattern to match continuation row descriptions
 * Examples: "ItemNo.001 梱包分割", "ItemNo.122 梱包分割"
 */
const PACKING_SPLIT_PATTERN = /^ItemNo\.(\d+)\s*梱包分割$/;

/**
 * Result of parsing a potential continuation row
 */
export interface ContinuationParseResult {
  /** Whether this row is a continuation (packing split) row */
  isContinuation: boolean;
  /** The item suffix from the parent row (e.g., "001" from "ItemNo.001 梱包分割") */
  parentItemSuffix: string | null;
}

/**
 * Parses a description field to detect if it's a continuation row
 *
 * @param description - The description field value from the row
 * @returns Parsing result with isContinuation flag and parent item suffix
 *
 * @example
 * parseContinuationRow("ItemNo.001 梱包分割")
 * // => { isContinuation: true, parentItemSuffix: "001" }
 *
 * parseContinuationRow("HOLDER/LITZ HOLDER(AL)")
 * // => { isContinuation: false, parentItemSuffix: null }
 */
export function parseContinuationRow(
  description: string | null | undefined,
): ContinuationParseResult {
  if (!description) {
    return { isContinuation: false, parentItemSuffix: null };
  }

  const trimmed = description.trim();
  const match = trimmed.match(PACKING_SPLIT_PATTERN);

  if (match) {
    return {
      isContinuation: true,
      parentItemSuffix: match[1], // The captured digit group
    };
  }

  return { isContinuation: false, parentItemSuffix: null };
}

/**
 * Pads an item suffix to match the format used in itemNumber
 * The suffix in "ItemNo.001" is typically already zero-padded,
 * but this ensures consistency
 *
 * @param suffix - The raw suffix from the pattern match
 * @returns The suffix padded to 3 digits (or original if already longer)
 */
export function normalizeItemSuffix(suffix: string): string {
  // Most item suffixes are 3 digits (001, 122, etc.)
  // but preserve longer ones as-is
  if (suffix.length >= 3) {
    return suffix;
  }
  return suffix.padStart(3, "0");
}
