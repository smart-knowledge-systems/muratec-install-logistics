import {
  type FileMetadata,
  type FileProcessingResult,
  type ConsolidatedRow,
  type SourceInfo,
  type SupplyItem,
} from "../schemas";
import {
  parseFilename,
  parseExcelBuffer,
  ROW_DATA_START,
  type ExcelParseOptions,
} from "../parsers";
import { validateRows } from "../validators";
import {
  parseContinuationRow,
  normalizeItemSuffix,
} from "../utils/continuation.utils";

export interface FileProcessorOptions extends ExcelParseOptions {
  /** Continue processing even if some rows fail validation (default: true) */
  continueOnError?: boolean;
  /** Maximum validation errors before aborting (default: 1000) */
  maxErrors?: number;
}

/**
 * Creates a SourceInfo object from file metadata
 */
function createSourceInfo(metadata: FileMetadata): SourceInfo {
  return {
    filename: metadata.filename.filename,
    fileId: metadata.filename.fileId,
    projectNumber: metadata.filename.projectNumber,
    pwbs: metadata.filename.pwbs,
    serialNumber: metadata.filename.serialNumber,
    variant: metadata.filename.variant,
    detailId: metadata.header.detailId,
    jobNumber: metadata.header.jobNumber,
    customer: metadata.header.customer,
    modelCategory: metadata.header.modelCategory,
  };
}

/**
 * Creates a ConsolidatedRow from validated item data and metadata
 */
export function createConsolidatedRow(
  rowId: number,
  sourceRowNumber: number,
  item: SupplyItem,
  source: SourceInfo,
): ConsolidatedRow {
  return {
    rowId,
    sourceRowNumber,
    item,
    source,
  };
}

/**
 * Processes a single Excel file through the full pipeline:
 * 1. Parse filename for metadata
 * 2. Read Excel buffer and extract header metadata
 * 3. Validate all data rows
 * 4. Return consolidated rows with source tracking
 *
 * @param filename - Original filename for metadata extraction
 * @param buffer - Excel file buffer
 * @param options - Processing options
 * @returns Processing result with rows and any errors
 */
export function processFile(
  filename: string,
  buffer: ArrayBuffer | Buffer,
  options: FileProcessorOptions = {},
): FileProcessingResult {
  const { continueOnError = true, maxErrors = 1000 } = options;

  // Step 1: Parse filename
  const filenameResult = parseFilename(filename);
  if (!filenameResult.success) {
    return {
      success: false,
      rows: [],
      validationErrors: [],
      error: filenameResult.error,
    };
  }

  // Step 2: Parse Excel file
  const excelResult = parseExcelBuffer(buffer, options);
  if (!excelResult.success) {
    return {
      success: false,
      rows: [],
      validationErrors: [],
      error: excelResult.error,
    };
  }

  // Step 3: Create file metadata
  const metadata: FileMetadata = {
    filename: filenameResult.data,
    header: excelResult.headerMetadata,
    sheetName: excelResult.sheetName,
    totalRows: excelResult.totalRowsInSheet,
    dataRowCount: excelResult.rows.length,
    processedAt: new Date().toISOString(),
  };

  // Step 4: Validate rows
  const validationResult = validateRows(
    excelResult.rows,
    filename,
    ROW_DATA_START,
  );

  // Check if we should abort due to too many errors
  if (!continueOnError && validationResult.errors.length > 0) {
    return {
      success: false,
      metadata,
      rows: [],
      validationErrors: validationResult.errors,
      error: `Validation errors found: ${validationResult.errors.length}`,
    };
  }

  if (validationResult.errors.length >= maxErrors) {
    return {
      success: false,
      metadata,
      rows: [],
      validationErrors: validationResult.errors.slice(0, maxErrors),
      error: `Too many validation errors (${validationResult.errors.length} >= ${maxErrors})`,
    };
  }

  // Step 5: Create consolidated rows (including those with partial data)
  const sourceInfo = createSourceInfo(metadata);
  const rows: ConsolidatedRow[] = validationResult.allRows.map(
    ({ rowNumber, data }, index) =>
      createConsolidatedRow(index, rowNumber, data, sourceInfo),
  );

  // Step 6: Process continuation rows (packing splits)
  linkContinuationRows(rows);

  return {
    success: true,
    metadata,
    rows,
    validationErrors: validationResult.errors,
  };
}

/**
 * Links continuation rows (梱包分割) to their parent rows and denormalizes
 * identifying fields for easier querying.
 *
 * This modifies rows in place.
 *
 * @param rows - Array of consolidated rows from a single file
 */
function linkContinuationRows(rows: ConsolidatedRow[]): void {
  // Build index of itemSuffix → row for parent lookup
  const itemSuffixMap = new Map<string, ConsolidatedRow>();

  for (const row of rows) {
    const suffix = row.item.itemSuffix;
    if (suffix) {
      // Store the first row with this suffix (the parent)
      // Continuation rows won't have itemSuffix, so they won't overwrite
      if (!itemSuffixMap.has(suffix)) {
        itemSuffixMap.set(suffix, row);
      }
    }
  }

  // Process each row to detect and link continuation rows
  for (const row of rows) {
    const continuationResult = parseContinuationRow(row.item.description);

    if (
      continuationResult.isContinuation &&
      continuationResult.parentItemSuffix
    ) {
      // Mark as continuation row
      row.item.isContinuation = true;
      row.item.parentItemSuffix = continuationResult.parentItemSuffix;
      row.item.originalDescription = row.item.description;

      // Normalize suffix for lookup (handle "1" vs "001")
      const normalizedSuffix = normalizeItemSuffix(
        continuationResult.parentItemSuffix,
      );

      // Find parent row by itemSuffix
      const parent =
        itemSuffixMap.get(normalizedSuffix) ??
        itemSuffixMap.get(continuationResult.parentItemSuffix);

      if (parent) {
        // Denormalize: copy identifying fields from parent
        row.item.itemNumber = parent.item.itemNumber;
        row.item.itemSuffix = parent.item.itemSuffix;
        row.item.partNumber = parent.item.partNumber;
        // Keep description as the continuation marker for now, but store parent's
        // description would lose the "梱包分割" info which might be useful
        // The originalDescription field preserves the continuation marker
      }
    }
  }
}
