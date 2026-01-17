import * as XLSX from "xlsx";
import type { WorkSheet, CellObject } from "xlsx";
import type { HeaderMetadata } from "../schemas";

/** Extended raw row with deletion status */
export interface ExtendedRawExcelRow {
  /** Column letter keys map to string, number, or null values */
  [key: string]: string | number | boolean | null | undefined;
  /** Whether this row has strike-through formatting or contains '削除' */
  __isDeleted?: boolean;
  /** Deletion note (e.g., '誤記' from assemblyCount when row is deleted) */
  __deletionNote?: string | null;
}

/** Expected sheet name in Japanese */
export const EXPECTED_SHEET_NAME = "出荷明細一般";

/** Row numbers (1-based) for reference */
export const ROW_METADATA_DETAIL_ID = 4; // Row containing 明細ID
export const ROW_METADATA_JOB = 6; // Row containing job info
export const ROW_HEADER_EN = 7; // English header row (Rev., Item№, Parts№, ...)
export const ROW_HEADER_JP = 8; // Japanese header row (版, ｱｲﾃﾑ№, 品番, ...)
export const ROW_DATA_START = 9; // First data row

/** Column indices (0-based) for header metadata */
const COL_DETAIL_ID_VALUE = 15; // Column P
const COL_JOB_NUMBER = 2; // Column C
const COL_CUSTOMER = 6; // Column G
const COL_MODEL_CATEGORY = 15; // Column P (row 6) - model category value (機種)

export interface ExcelParseOptions {
  /** Override the expected sheet name (default: "出荷明細一般") */
  sheetName?: string;
  /** Override data start row (1-based, default: 8) */
  dataStartRow?: number;
  /** Skip empty rows (default: true) */
  skipEmptyRows?: boolean;
}

export interface ExcelParseResult {
  success: boolean;
  sheetName: string;
  headerMetadata: HeaderMetadata;
  rows: ExtendedRawExcelRow[];
  totalRowsInSheet: number;
  error?: string;
}

/**
 * Gets a cell value from a worksheet by row/col indices
 */
function getCellValue(
  sheet: WorkSheet,
  row: number,
  col: number,
): string | number | null {
  const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = sheet[cellAddress];
  if (!cell) return null;
  return cell.v !== undefined ? cell.v : null;
}

/**
 * Checks if a cell has strike-through formatting
 */
function hasCellStrikethrough(cell: CellObject | undefined): boolean {
  if (!cell || !cell.s) return false;
  // The xlsx library represents strike-through in cell.s.strike
  const style = cell.s as Record<string, unknown>;
  return style.strike === true || style.strike === 1;
}

/**
 * Detects if a row is marked as deleted (strike-through or '削除' text)
 * Returns deletion status and any associated note
 */
function detectRowDeletion(
  sheet: WorkSheet,
  rowIndex: number,
  columns: string[],
): { isDeleted: boolean; deletionNote: string | null } {
  let hasStrikethrough = false;
  let hasDeletionText = false;
  let deletionNote: string | null = null;

  for (const col of columns) {
    const cellAddress = `${col}${rowIndex + 1}`;
    const cell = sheet[cellAddress] as CellObject | undefined;

    // Check for strike-through formatting
    if (hasCellStrikethrough(cell)) {
      hasStrikethrough = true;
    }

    // Check for '削除' text in cell value
    if (cell?.v !== undefined) {
      const value = String(cell.v);
      if (value.includes("削除")) {
        hasDeletionText = true;
        // Extract any note after '削除' (often in assemblyCount column I)
        // Common pattern: "削除 誤記" or just "削除"
        const match = value.match(/削除\s*(.+)?/);
        if (match && match[1]) {
          deletionNote = match[1].trim();
        }
      }
    }
  }

  return {
    isDeleted: hasStrikethrough || hasDeletionText,
    deletionNote,
  };
}

/**
 * Extracts header metadata from rows 4 and 6
 */
export function extractHeaderMetadata(sheet: WorkSheet): HeaderMetadata {
  // Row 4 (0-indexed: 3) - Detail ID
  // Looking for pattern: Column O = "明細ID", Column P = value
  const detailIdValue = getCellValue(sheet, 3, COL_DETAIL_ID_VALUE);

  // Row 6 (0-indexed: 5) - Job number, Customer, Model Category
  const jobNumber = getCellValue(sheet, 5, COL_JOB_NUMBER);
  const customer = getCellValue(sheet, 5, COL_CUSTOMER);
  const modelCategory = getCellValue(sheet, 5, COL_MODEL_CATEGORY);

  return {
    detailId: detailIdValue ? String(detailIdValue).trim() : null,
    jobNumber: jobNumber ? String(jobNumber).trim() : null,
    customer: customer ? String(customer).trim() : null,
    modelCategory: modelCategory ? String(modelCategory).trim() : null,
  };
}

/**
 * Checks if a row is effectively empty
 */
export function isEmptyRow(row: ExtendedRawExcelRow): boolean {
  return Object.values(row).every((val) => {
    if (val === null || val === undefined) return true;
    if (typeof val === "string" && val.trim() === "") return true;
    return false;
  });
}

/**
 * Converts worksheet data rows to array of raw row objects with deletion detection
 */
export function worksheetToRows(
  sheet: WorkSheet,
  startRow: number,
  skipEmpty: boolean,
): ExtendedRawExcelRow[] {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const rows: ExtendedRawExcelRow[] = [];

  // Column letters A-S (we expect up to 19 columns)
  const columns = "ABCDEFGHIJKLMNOPQRS".split("");

  for (let r = startRow - 1; r <= range.e.r; r++) {
    const row: ExtendedRawExcelRow = {};

    for (const col of columns) {
      const cellAddress = `${col}${r + 1}`;
      const cell = sheet[cellAddress];
      row[col] = cell?.v !== undefined ? cell.v : null;
    }

    if (skipEmpty && isEmptyRow(row)) {
      continue;
    }

    // Detect deletion status (strike-through or '削除' text)
    const { isDeleted, deletionNote } = detectRowDeletion(sheet, r, columns);
    row.__isDeleted = isDeleted;
    row.__deletionNote = deletionNote;

    rows.push(row);
  }

  return rows;
}

/**
 * Reads an Excel file buffer and extracts raw row data
 *
 * @param buffer - File buffer (ArrayBuffer or Buffer)
 * @param options - Parsing options
 * @returns Parsed Excel data with header metadata and raw rows
 */
export function parseExcelBuffer(
  buffer: ArrayBuffer | Buffer,
  options: ExcelParseOptions = {},
): ExcelParseResult {
  const {
    sheetName = EXPECTED_SHEET_NAME,
    dataStartRow = ROW_DATA_START,
    skipEmptyRows = true,
  } = options;

  try {
    // Enable cellStyles to detect strike-through formatting
    const workbook = XLSX.read(buffer, { type: "buffer", cellStyles: true });

    // Find the target sheet
    const targetSheet = workbook.SheetNames.find(
      (name) => name === sheetName || name.includes(sheetName),
    );

    if (!targetSheet) {
      return {
        success: false,
        sheetName: "",
        headerMetadata: {
          detailId: null,
          jobNumber: null,
          customer: null,
          modelCategory: null,
        },
        rows: [],
        totalRowsInSheet: 0,
        error: `Sheet "${sheetName}" not found. Available sheets: ${workbook.SheetNames.join(", ")}`,
      };
    }

    const sheet = workbook.Sheets[targetSheet];
    const range = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : null;
    const totalRows = range ? range.e.r + 1 : 0;

    // Extract header metadata
    const headerMetadata = extractHeaderMetadata(sheet);

    // Extract data rows
    const rows = worksheetToRows(sheet, dataStartRow, skipEmptyRows);

    return {
      success: true,
      sheetName: targetSheet,
      headerMetadata,
      rows,
      totalRowsInSheet: totalRows,
    };
  } catch (error) {
    return {
      success: false,
      sheetName: "",
      headerMetadata: {
        detailId: null,
        jobNumber: null,
        customer: null,
        modelCategory: null,
      },
      rows: [],
      totalRowsInSheet: 0,
      error: `Failed to parse Excel file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Gets the total number of data rows in a worksheet (excluding header rows)
 */
export function getDataRowCount(
  sheet: WorkSheet,
  dataStartRow: number = ROW_DATA_START,
): number {
  const range = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : null;
  if (!range) return 0;
  return Math.max(0, range.e.r - dataStartRow + 2);
}
