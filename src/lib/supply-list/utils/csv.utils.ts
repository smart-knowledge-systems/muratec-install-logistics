import type { FlatRow, ConsolidatedRow } from "../schemas";

/**
 * CSV column order for output
 */
export const CSV_COLUMNS: (keyof FlatRow)[] = [
  "rowId",
  "sourceRowNumber",
  "sourceFilename",
  "sourceFileId",
  "projectNumber",
  "pwbs",
  "serialNumber",
  "variant",
  "detailId",
  "jobNumber",
  "customer",
  "modelCategory",
  "revision",
  "revisionNote",
  "itemNumber",
  "itemSuffix",
  "balloonMarker",
  "partNumber",
  "description",
  "quantity",
  "assemblyCount",
  "packingCount",
  "unitNumber",
  "palletNumber",
  "caseNumber",
  "weightGrams",
  "weightKg",
  "note1",
  "note2",
  "plNumber",
  "plName",
  "isDeleted",
  "deletionNote",
  "isContinuation",
  "parentItemSuffix",
  "originalDescription",
];

/**
 * Flattens a ConsolidatedRow into a FlatRow for CSV export
 */
export function flattenRow(row: ConsolidatedRow): FlatRow {
  return {
    rowId: row.rowId,
    sourceRowNumber: row.sourceRowNumber,
    sourceFilename: row.source.filename,
    sourceFileId: row.source.fileId,
    projectNumber: row.source.projectNumber,
    pwbs: row.source.pwbs,
    serialNumber: row.source.serialNumber,
    variant: row.source.variant,
    detailId: row.source.detailId,
    jobNumber: row.source.jobNumber,
    customer: row.source.customer,
    modelCategory: row.source.modelCategory,
    revision: row.item.revision,
    revisionNote: row.item.revisionNote,
    itemNumber: row.item.itemNumber,
    itemSuffix: row.item.itemSuffix,
    balloonMarker: row.item.balloonMarker,
    partNumber: row.item.partNumber,
    description: row.item.description,
    quantity: row.item.quantity,
    assemblyCount: row.item.assemblyCount,
    packingCount: row.item.packingCount,
    unitNumber: row.item.unitNumber,
    palletNumber: row.item.palletNumber,
    caseNumber: row.item.caseNumber,
    weightGrams: row.item.weightGrams,
    weightKg: row.item.weightKg,
    note1: row.item.note1,
    note2: row.item.note2,
    plNumber: row.item.plNumber,
    plName: row.item.plName,
    isDeleted: row.item.isDeleted,
    deletionNote: row.item.deletionNote,
    isContinuation: row.item.isContinuation,
    parentItemSuffix: row.item.parentItemSuffix,
    originalDescription: row.item.originalDescription,
  };
}

/**
 * Flattens multiple consolidated rows
 */
export function flattenRows(rows: ConsolidatedRow[]): FlatRow[] {
  return rows.map(flattenRow);
}

/**
 * Escapes a CSV field value
 */
function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  // Check if escaping is needed
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Converts a flat row to a CSV line
 */
function rowToCSVLine(row: FlatRow, columns: (keyof FlatRow)[]): string {
  return columns.map((col) => escapeCSVField(row[col])).join(",");
}

export interface CSVOptions {
  /** Column delimiter (default: ",") */
  delimiter?: string;
  /** Include header row (default: true) */
  includeHeaders?: boolean;
  /** Line ending (default: "\n") */
  lineEnding?: string;
  /** Columns to include (default: all) */
  columns?: (keyof FlatRow)[];
  /** Add UTF-8 BOM for Excel compatibility (default: false) */
  withBOM?: boolean;
}

/** UTF-8 Byte Order Mark for Excel compatibility */
export const UTF8_BOM = "\uFEFF";

/**
 * Generates CSV string from flat rows
 */
export function toCSV(rows: FlatRow[], options: CSVOptions = {}): string {
  const {
    includeHeaders = true,
    lineEnding = "\n",
    columns = CSV_COLUMNS,
    withBOM = false,
  } = options;

  const lines: string[] = [];

  if (includeHeaders) {
    lines.push(columns.join(","));
  }

  for (const row of rows) {
    lines.push(rowToCSVLine(row, columns));
  }

  const csv = lines.join(lineEnding);
  return withBOM ? UTF8_BOM + csv : csv;
}

/**
 * Generates CSV string from consolidated rows (convenience function)
 */
export function consolidatedToCSV(
  rows: ConsolidatedRow[],
  options: CSVOptions = {},
): string {
  return toCSV(flattenRows(rows), options);
}
