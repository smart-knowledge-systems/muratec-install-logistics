import { z } from "zod";
import {
  SupplyItemSchema,
  COLUMN_MAP,
  computeItemNumber,
  splitPlValue,
  type SupplyItem,
  type ValidationError,
} from "../schemas";
import type { ExtendedRawExcelRow } from "../parsers";

export interface RowValidationResult {
  success: boolean;
  data: SupplyItem | null;
  errors: ValidationError[];
}

export interface BatchValidationResult {
  validRows: Array<{ rowNumber: number; data: SupplyItem }>;
  allRows: Array<{ rowNumber: number; data: SupplyItem; hasErrors: boolean }>;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  errors: ValidationError[];
}

/**
 * Maps raw Excel row (keyed by column letters) to semantic field names
 */
export function mapRowToFields(
  row: ExtendedRawExcelRow,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  for (const [col, field] of Object.entries(COLUMN_MAP)) {
    mapped[field] = row[col];
  }

  return mapped;
}

/**
 * Formats Zod errors into ValidationError objects
 */
export function formatZodErrors(
  zodError: z.ZodError,
  rowNumber: number,
  filename: string,
  originalData: Record<string, unknown>,
): ValidationError[] {
  return zodError.issues.map((issue) => ({
    filename,
    rowNumber,
    field: issue.path.join("."),
    originalValue: (issue.path as (string | number)[]).reduce<unknown>(
      (obj, key) => (obj as Record<string, unknown>)?.[String(key)],
      originalData,
    ),
    message: issue.message,
    code: issue.code,
  }));
}

/**
 * Creates a supply item with null values for fields that failed validation
 */
function createPartialSupplyItem(
  mapped: Record<string, unknown>,
  zodError: z.ZodError,
): SupplyItem {
  // Get the set of failed field paths
  const failedFields = new Set(zodError.issues.map((issue) => issue.path[0]));

  // Create a partial object with null for failed fields
  const partial: Record<string, unknown> = {};

  for (const [field, value] of Object.entries(mapped)) {
    if (failedFields.has(field)) {
      partial[field] = null;
    } else {
      // Try to transform the value using individual field logic
      partial[field] = value;
    }
  }

  // Compute item number
  partial.itemNumber = computeItemNumber(
    partial.itemPrefix as string | null,
    partial.itemSequence as string | null,
  );

  // Set itemSuffix from itemSequence
  partial.itemSuffix = partial.itemSequence ?? null;

  // Parse with coercion - this should work since we nullified bad fields
  const result = SupplyItemSchema.safeParse(partial);
  if (result.success) {
    return result.data;
  }

  // Fallback: return all nulls
  return {
    revision: null,
    revisionNote: null,
    itemPrefix: null,
    itemSequence: null,
    itemNumber: null,
    itemSuffix: null,
    balloonMarker: null,
    partNumber: null,
    description: null,
    quantity: null,
    assemblyCount: null,
    packingCount: null,
    unitNumber: null,
    palletNumber: null,
    caseNumber: null,
    weightGrams: null,
    weightKg: null,
    note1: null,
    note2: null,
    plNumber: null,
    plName: null,
    isDeleted: false,
    deletionNote: null,
    isContinuation: false,
    parentItemSuffix: null,
    originalDescription: null,
    extra: null,
  };
}

/**
 * Validates and transforms a single raw Excel row into a SupplyItem
 *
 * @param row - Raw Excel row data (keyed by column letters, with optional deletion metadata)
 * @param rowNumber - Original row number for error reporting (1-based)
 * @param filename - Source filename for error reporting
 * @returns Validation result with parsed data (including partial data on error)
 */
export function validateRow(
  row: ExtendedRawExcelRow,
  rowNumber: number,
  filename: string,
): RowValidationResult {
  const mapped = mapRowToFields(row);

  // Compute item number before validation (with dash separator)
  mapped.itemNumber = computeItemNumber(
    mapped.itemPrefix as string | null,
    mapped.itemSequence as string | null,
  );

  // Set itemSuffix from itemSequence (column D)
  const seqValue = mapped.itemSequence;
  mapped.itemSuffix =
    seqValue !== null && seqValue !== undefined
      ? String(seqValue).trim() || null
      : null;

  // Split plNumber (column R) into plNumber and plName
  const plRaw = mapped.plNumber;
  const { plNumber, plName } = splitPlValue(plRaw as string | null);
  mapped.plNumber = plNumber;
  mapped.plName = plName;

  // Set deletion status from extended row metadata
  mapped.isDeleted = row.__isDeleted ?? false;
  mapped.deletionNote = row.__deletionNote ?? null;

  const result = SupplyItemSchema.safeParse(mapped);

  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: [],
    };
  }

  // Validation failed - create partial data with nulls for failed fields
  const errors = formatZodErrors(result.error, rowNumber, filename, mapped);
  const partialData = createPartialSupplyItem(mapped, result.error);

  return {
    success: false,
    data: partialData,
    errors,
  };
}

/**
 * Validates a batch of rows, collecting all errors
 * All rows are included in output (with null for invalid fields)
 *
 * @param rows - Array of raw Excel rows (with optional deletion metadata)
 * @param filename - Source filename for error reporting
 * @param startRowNumber - Row number offset (1-based, default: 8 for data start)
 * @returns Batch validation results with all rows and errors
 */
export function validateRows(
  rows: ExtendedRawExcelRow[],
  filename: string,
  startRowNumber: number = 8,
): BatchValidationResult {
  const validRows: Array<{ rowNumber: number; data: SupplyItem }> = [];
  const allRows: Array<{
    rowNumber: number;
    data: SupplyItem;
    hasErrors: boolean;
  }> = [];
  const errors: ValidationError[] = [];
  let successCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = startRowNumber + i;
    const result = validateRow(rows[i], rowNumber, filename);

    if (result.data) {
      allRows.push({
        rowNumber,
        data: result.data,
        hasErrors: !result.success,
      });

      if (result.success) {
        validRows.push({ rowNumber, data: result.data });
        successCount++;
      }
    }

    if (result.errors.length > 0) {
      errors.push(...result.errors);
    }
  }

  return {
    validRows,
    allRows,
    totalProcessed: rows.length,
    successCount,
    errorCount: rows.length - successCount,
    errors,
  };
}
