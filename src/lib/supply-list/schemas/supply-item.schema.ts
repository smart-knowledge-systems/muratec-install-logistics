import { z } from "zod";

/**
 * Column mapping from Excel columns A-S to semantic field names
 */
export const COLUMN_MAP = {
  A: "revision",
  B: "revisionNote",
  C: "itemPrefix",
  D: "itemSequence",
  E: "balloonMarker",
  F: "partNumber",
  G: "description",
  H: "quantity",
  I: "assemblyCount",
  J: "packingCount",
  K: "unitNumber",
  L: "palletNumber",
  M: "caseNumber",
  N: "weightGrams",
  O: "weightKg",
  P: "note1",
  Q: "note2",
  R: "plNumber",
  S: "extra",
} as const;

/**
 * Reverse mapping from field names to column letters
 */
export const FIELD_TO_COLUMN = Object.fromEntries(
  Object.entries(COLUMN_MAP).map(([col, field]) => [field, col]),
) as Record<(typeof COLUMN_MAP)[keyof typeof COLUMN_MAP], string>;

/**
 * Transforms empty strings, whitespace-only strings, and undefined to null
 */
const emptyToNull = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (val === null || val === undefined) return null;
    const trimmed = String(val).trim();
    return trimmed === "" ? null : trimmed;
  });

/**
 * Parses numeric values that may be empty, contain Japanese text, or be "-"
 */
const optionalNumber = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === "number") return isNaN(val) ? null : val;
    const trimmed = String(val).trim();
    if (trimmed === "" || trimmed === "-") return null;
    const parsed = parseFloat(trimmed);
    return isNaN(parsed) ? null : parsed;
  });

/**
 * Schema for a single supply list row item
 */
export const SupplyItemSchema = z.object({
  // Revision info (column A)
  revision: emptyToNull,

  // Revision note (column B) - often contains "変更" (change)
  revisionNote: emptyToNull,

  // Item identification (columns C-D)
  itemPrefix: emptyToNull,
  itemSequence: emptyToNull,

  // Computed full item number (will be set during processing)
  itemNumber: z.string().nullable().default(null),

  // Item suffix - just the sequence part from column D (e.g., "001")
  itemSuffix: z.string().nullable().default(null),

  // Balloon marker (column E)
  balloonMarker: emptyToNull,

  // Part identification (columns F-G)
  partNumber: emptyToNull,
  description: emptyToNull,

  // Quantities (columns H-J)
  quantity: optionalNumber,
  assemblyCount: optionalNumber,
  packingCount: optionalNumber,

  // Location identifiers (columns K-M)
  unitNumber: emptyToNull,
  palletNumber: emptyToNull,
  caseNumber: emptyToNull,

  // Weight data (columns N-O)
  weightGrams: optionalNumber,
  weightKg: optionalNumber,

  // Notes (columns P-Q)
  note1: emptyToNull,
  note2: emptyToNull,

  // PL number (column R) - split into number and name
  plNumber: emptyToNull,
  plName: z.string().nullable().default(null),

  // Deletion status (detected from strike-through formatting or '削除' text)
  isDeleted: z.boolean().default(false),
  deletionNote: z.string().nullable().default(null),

  // Continuation row linking (for packing splits - 梱包分割)
  isContinuation: z.boolean().default(false),
  parentItemSuffix: z.string().nullable().default(null), // e.g., "001" from "ItemNo.001 梱包分割"
  originalDescription: z.string().nullable().default(null), // Original description before denormalization

  // Extra column S (usually empty or newline artifacts)
  extra: emptyToNull,
});

export type SupplyItem = z.infer<typeof SupplyItemSchema>;

/**
 * Schema for raw Excel row data before transformation
 * Keys are column letters (A, B, C, etc.)
 */
export const RawExcelRowSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.null(), z.undefined()]),
);

export type RawExcelRow = z.infer<typeof RawExcelRowSchema>;

/**
 * Combines item prefix and sequence into full item number with dash separator
 * e.g., "K11R" + "001" → "K11R-001"
 */
export function computeItemNumber(
  prefix: string | null | undefined,
  sequence: string | null | undefined,
): string | null {
  if (!prefix && !sequence) return null;
  const p = prefix?.trim() ?? "";
  const s = sequence?.trim() ?? "";
  if (!p && !s) return null;
  if (!p) return s;
  if (!s) return p;
  return `${p}-${s}`;
}

/**
 * Splits PL column value (column R) into number and name
 * Column R contains two-line values: plan number (line 1) and plan name (line 2)
 */
export function splitPlValue(value: string | null | undefined): {
  plNumber: string | null;
  plName: string | null;
} {
  if (value === null || value === undefined) {
    return { plNumber: null, plName: null };
  }

  const str = String(value);
  // Split on newline characters (handles \n, \r\n, or \r)
  const lines = str.split(/\r?\n|\r/);

  const plNumber = lines[0]?.trim() || null;
  const plName = lines[1]?.trim() || null;

  return { plNumber, plName };
}
